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
