"use client";

import { useSyncExternalStore } from "react";

// Chrome/Edge/Android fire `beforeinstallprompt` once, early, when the app is
// installable. We hold on to it so our own "Install app" button can use it
// later. Safari (iPhone) never fires it — there the guide shows manual steps.

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: InstallPromptEvent | null = null;
let started = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function startPwa() {
  if (started || typeof window === "undefined") return;
  started = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // we show our own button instead of the browser's banner
    deferred = event as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });

  // Production only: in development a service worker gets in the way of hot reload.
  if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
}

/** True when the browser has offered an install prompt we can trigger. */
export function useCanInstall(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => deferred !== null,
    () => false,
  );
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  await event.prompt();
  const { outcome } = await event.userChoice;
  deferred = null; // a prompt event can only be used once
  emit();
  return outcome === "accepted";
}

export type Device = { platform: "ios" | "android" | "desktop"; installed: boolean; secure: boolean };

export function detectDevice(): Device {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch points give it away.
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const installed = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return { platform: ios ? "ios" : /Android/i.test(ua) ? "android" : "desktop", installed, secure: window.isSecureContext };
}

// ── Welcome guide open/close plumbing ────────────────────────────────────────

const GUIDE_EVENT = "habitflow:open-guide";
const GUIDE_SEEN_KEY = "habitflow:guide-seen";

export const openGuide = () => window.dispatchEvent(new Event(GUIDE_EVENT));
export const onOpenGuide = (handler: () => void) => {
  window.addEventListener(GUIDE_EVENT, handler);
  return () => window.removeEventListener(GUIDE_EVENT, handler);
};
export function guideSeen(): boolean {
  try {
    return localStorage.getItem(GUIDE_SEEN_KEY) === "1";
  } catch {
    return true; // storage blocked: don't nag on every page load
  }
}
export function markGuideSeen() {
  try {
    localStorage.setItem(GUIDE_SEEN_KEY, "1");
  } catch {}
}

// ── Notifications ────────────────────────────────────────────────────────────

export type PushState = "unsupported" | "needs-install" | "blocked" | "off" | "on";

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return null;
  // The worker is registered as the app starts; on a phone that can take a few
  // seconds. Wait for it (briefly) rather than concluding there isn't one.
  const ready = navigator.serviceWorker.ready.catch(() => null);
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000));
  return (await navigator.serviceWorker.getRegistration()) ?? (await Promise.race([ready, timeout]));
}

export async function pushState(): Promise<PushState> {
  const device = detectDevice();
  // an iPhone only allows notifications for a site that has been added to the Home Screen
  if (device.platform === "ios" && !device.installed) return "needs-install";
  const reg = await registration();
  if (!reg) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  return (await reg.pushManager.getSubscription()) ? "on" : "off";
}

const toBytes = (base64url: string) => Uint8Array.from(atob(base64url.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(base64url.length / 4) * 4, "=")), (c) => c.charCodeAt(0));

/** Asks permission, registers this device with the push service and tells the server. */
export async function enablePush(publicKey: string): Promise<PushState> {
  if (!("Notification" in window)) return "unsupported";
  // Asked first, before anything is awaited: an iPhone only shows its
  // "Allow notifications?" question if it comes directly from the tap.
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "blocked" : "off";
  const reg = await registration();
  if (!reg) return "unsupported";
  const subscription = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(publicKey) }));
  const saved = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
  if (!saved.ok) {
    await subscription.unsubscribe().catch(() => {});
    return "off";
  }
  return "on";
}

export async function disablePush(): Promise<PushState> {
  const subscription = await (await registration())?.pushManager.getSubscription();
  if (subscription) {
    await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }) }).catch(() => {});
    await subscription.unsubscribe().catch(() => {});
  }
  return "off";
}
