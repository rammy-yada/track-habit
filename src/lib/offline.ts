"use client";

import { useSyncExternalStore } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Offline support, in one place.
//
// Ticking a habit never talks to the server directly. It is written to a small
// queue on the device first — so it works with no connection and survives a
// reload — and the queue is sent to POST /api/sync whenever there is one.
// The screens show "what the server last said" + "what's still in the queue".
// ─────────────────────────────────────────────────────────────────────────────

type Op = { habitId: number; date: string; done: boolean; at: number; synced: boolean };
type Status = "idle" | "syncing" | "offline" | "signed-out";
type Snapshot = { ops: ReadonlyMap<string, Op>; pending: number; status: Status; lastError: string | null };

const STORAGE_KEY = "habitflow:queue";
const SYNCED_TTL = 60_000; // a synced change is dropped once the page shows it, or after this long

let userId: number | null = null;
let ops = new Map<string, Op>();
let status: Status = "idle";
let lastError: string | null = null;
let flushing = false;
let restarting = false;
let snapshot: Snapshot = { ops, pending: 0, status, lastError };
const EMPTY: Snapshot = { ops: new Map(), pending: 0, status: "idle", lastError: null };
const listeners = new Set<() => void>();
const syncedListeners = new Set<() => void>();

const key = (habitId: number, date: string) => `${habitId}:${date}`;
const unsynced = () => [...ops.values()].filter((op) => !op.synced);

function commit() {
  const now = Date.now();
  for (const [k, op] of ops) if (op.synced && now - op.at > SYNCED_TTL) ops.delete(k);
  ops = new Map(ops);
  snapshot = { ops, pending: unsynced().length, status, lastError };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, ops: [...ops.values()] }));
  } catch {}
  listeners.forEach((listener) => listener());
}

/** Call once per page load with the signed-in user. Restores anything still waiting from last time. */
export function startOffline(currentUserId: number) {
  if (userId === currentUserId) return;
  userId = currentUserId;
  ops = new Map();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    // changes queued by a different account on this device are never replayed
    if (saved?.userId === currentUserId) for (const op of saved.ops as Op[]) ops.set(key(op.habitId, op.date), op);
  } catch {}
  status = navigator.onLine ? "idle" : "offline";
  commit();

  window.addEventListener("online", () => void flush());
  window.addEventListener("offline", () => {
    status = "offline";
    commit();
  });
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && void flush());
  setInterval(() => unsynced().length && void flush(), 20_000);
  void flush();
}

/** Record a tick (or un-tick). Shows immediately, syncs as soon as possible. */
export function setDone(habitId: number, date: string, done: boolean) {
  ops.set(key(habitId, date), { habitId, date, done, at: Date.now(), synced: false });
  commit();
  void flush();
}

/** The page now shows this change from the server's own data, so the local copy can go. */
export function settle(habitId: number, date: string, serverDone: boolean) {
  const op = ops.get(key(habitId, date));
  if (op?.synced && op.done === serverDone) {
    ops.delete(key(habitId, date));
    commit();
  }
}

/** Sends everything waiting. Resolves true when nothing is left unsynced. */
export async function flush(): Promise<boolean> {
  if (flushing) return false;
  const batch = unsynced();
  if (batch.length === 0) {
    if (status !== "idle" && navigator.onLine) {
      status = "idle";
      commit();
    }
    return true;
  }
  if (!navigator.onLine) {
    status = "offline";
    commit();
    return false;
  }

  flushing = true;
  status = "syncing";
  commit();
  try {
    const response = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ops: batch.map(({ habitId, date, done }) => ({ habitId, date, done })) }),
    });
    if (response.status === 401) {
      status = "signed-out";
      return false;
    }
    if (!response.ok) throw new Error(`sync failed: ${response.status}`);
    const { results } = (await response.json()) as { results: { key: string; ok: boolean; error?: string }[] };

    lastError = null;
    const now = Date.now();
    for (const sent of batch) {
      const k = key(sent.habitId, sent.date);
      const current = ops.get(k);
      if (!current || current.at !== sent.at) continue; // changed again while this was in flight; next round
      const result = results.find((r) => r.key === k);
      if (result?.ok) ops.set(k, { ...current, synced: true, at: now });
      else {
        ops.delete(k); // the server refused it (e.g. the habit was deleted): don't retry forever
        lastError = result?.error ?? "A change could not be saved.";
      }
    }
    status = "idle";
    // (not while restarting: refreshing the page then would race the restart itself)
    if (!restarting) syncedListeners.forEach((listener) => listener());
    return unsynced().length === 0;
  } catch {
    status = "offline"; // no route to the server: keep everything and try again later
    return false;
  } finally {
    flushing = false;
    commit();
    if (status === "idle" && unsynced().length) void flush();
  }
}

/** Runs after each successful sync (used to refresh the page and the offline copy of it). */
export function onSynced(listener: () => void) {
  syncedListeners.add(listener);
  return () => void syncedListeners.delete(listener);
}

export function useOfflineQueue(): Snapshot {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
    () => EMPTY,
  );
}

/** What the screen should show for one habit on one day: a queued change wins over server data. */
export function resolveDone(queue: Snapshot, habitId: number, date: string, serverDone: boolean): boolean {
  return queue.ops.get(key(habitId, date))?.done ?? serverDone;
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    (listener) => {
      window.addEventListener("online", listener);
      window.addEventListener("offline", listener);
      return () => {
        window.removeEventListener("online", listener);
        window.removeEventListener("offline", listener);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}

// ── Everything else needs a connection ───────────────────────────────────────

export const OFFLINE_MESSAGE = "You're offline. Ticking habits works and will sync later — this needs a connection.";

/** Wraps a server action so that being offline gives a message instead of a crash. */
export async function whenOnline<T extends { ok: boolean }>(run: () => Promise<T>): Promise<T | { ok: false; error: string }> {
  if (!navigator.onLine) return { ok: false, error: OFFLINE_MESSAGE };
  try {
    return await run();
  } catch (err) {
    if (navigator.onLine && err instanceof Error && !/fetch|network|load failed/i.test(err.message)) throw err;
    return { ok: false, error: OFFLINE_MESSAGE };
  }
}

// ── Service worker messages ──────────────────────────────────────────────────

const OFFLINE_PAGES = ["/dashboard", "/arc", "/monthly", "/analytics", "/profile", "/support"];

const SAVED_AT_KEY = "habitflow:saved-at";

/**
 * Ask the service worker to save fresh copies of screens for offline use.
 * With no list it saves all the main screens — at most once every 30 minutes,
 * because each one costs the server a full page load. Pass a list to refresh
 * just those (after a sync, only the screens that show ticks).
 */
export function saveForOffline(pages?: string[], { force = false } = {}) {
  if (!navigator.onLine) return;
  if (!pages) {
    try {
      const last = Number(localStorage.getItem(SAVED_AT_KEY) ?? 0);
      if (!force && Date.now() - last < 30 * 60_000) return;
      localStorage.setItem(SAVED_AT_KEY, String(Date.now()));
    } catch {}
  }
  navigator.serviceWorker?.ready.then((registration) => registration.active?.postMessage({ type: "SAVE_PAGES", pages: pages ?? OFFLINE_PAGES })).catch(() => {});
}

/** On sign-out: forget queued changes and the saved copies of this person's screens. */
export function clearOfflineData() {
  ops = new Map();
  userId = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SAVED_AT_KEY);
  } catch {}
  navigator.serviceWorker?.controller?.postMessage({ type: "FORGET_PAGES" });
}

// ── Updates ──────────────────────────────────────────────────────────────────

export const APP_BUILD = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

/** Has a newer version been deployed than the one this tab is running? */
export async function updateAvailable(): Promise<boolean> {
  if (!navigator.onLine) return false;
  try {
    const { build } = await (await fetch("/api/version", { cache: "no-store" })).json();
    return typeof build === "string" && build !== APP_BUILD;
  } catch {
    return false;
  }
}

/**
 * The page is already the newest version but an updated service worker is
 * still waiting its turn (this happens after a plain reload). Nothing is at
 * stake any more, so let it take over.
 */
export async function adoptWaitingWorker() {
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    // it may still be installing right after a reload; the message is honoured either way
    (registration?.waiting ?? registration?.installing)?.postMessage({ type: "ACTIVATE" });
  } catch {}
}

/**
 * Restart the app, picking up a new version if there is one. Anything still
 * waiting to sync is sent FIRST; if that can't be done, an update is refused
 * rather than risk it — queued changes stay safely on the device either way.
 */
export async function restartApp({ update }: { update: boolean }): Promise<{ ok: true } | { ok: false; error: string }> {
  restarting = true;
  const refuse = (error: string) => {
    restarting = false;
    return { ok: false as const, error };
  };
  if (navigator.onLine) await flush();
  if (update) {
    if (!navigator.onLine) return refuse("Connect to the internet to update. Your changes are saved on this device.");
    if (unsynced().length) return refuse("Couldn't sync your changes yet, so the update is on hold. Try again in a moment.");
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      if (registration) {
        await registration.update();
        // the new worker may appear a moment after the check completes
        const incoming =
          registration.waiting ??
          registration.installing ??
          (await new Promise<ServiceWorker | null>((resolve) => {
            const timer = setTimeout(() => resolve(null), 2000);
            registration.addEventListener("updatefound", () => (clearTimeout(timer), resolve(registration.installing)), { once: true });
          }));
        if (incoming) {
          // Hand over to the new worker before reloading. On taking over it
          // throws away the old version's saved files and screens.
          const switched = new Promise<void>((resolve) => navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true }));
          incoming.postMessage({ type: "ACTIVATE" });
          await Promise.race([switched, new Promise((resolve) => setTimeout(resolve, 6000))]);
        }
      }
    } catch {}
  }
  window.location.reload();
  return { ok: true };
}
