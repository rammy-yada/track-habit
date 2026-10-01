"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { adoptWaitingWorker, APP_BUILD, OFFLINE_MESSAGE, onSynced, restartApp, saveForOffline, startOffline, updateAvailable, useOfflineQueue, useOnline } from "@/lib/offline";

/**
 * Lives in the signed-in layout. Starts the offline queue, keeps offline
 * copies of the screens fresh, and shows two things when they matter:
 * a connection/sync pill, and an "update ready" bar.
 */
export function AppStatus({ userId }: { userId: number }) {
  const router = useRouter();
  const online = useOnline();
  const queue = useOfflineQueue();
  const [update, setUpdate] = useState(false);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    startOffline(userId);
    saveForOffline();

    // After a sync: show the server's version of the page, and re-save the
    // offline copies so they include what was just synced.
    let resave: ReturnType<typeof setTimeout>;
    const stopSynced = onSynced(() => {
      router.refresh();
      setJustSynced(true);
      clearTimeout(resave);
      resave = setTimeout(() => {
        saveForOffline();
        setJustSynced(false);
      }, 2500);
    });

    const check = () =>
      void updateAvailable().then((available) => {
        if (available) setUpdate(true);
        else if (navigator.onLine) void adoptWaitingWorker();
      });
    check();
    const recheck = setTimeout(check, 8000); // a worker for a fresh deploy can take a few seconds to show up
    const interval = setInterval(check, 10 * 60_000);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", check);
    // a new service worker starts with nothing saved: fill it straight away
    const refill = () => saveForOffline();
    navigator.serviceWorker?.addEventListener("controllerchange", refill);

    // Forms (add habit, profile, admin…) need the server. Offline, stop them
    // before they are sent and say why, instead of letting them fail.
    const guard = (event: Event) => {
      if (navigator.onLine) return;
      event.preventDefault();
      event.stopPropagation();
      setNotice(OFFLINE_MESSAGE);
    };
    window.addEventListener("submit", guard, true);

    return () => {
      stopSynced();
      clearTimeout(resave);
      clearInterval(interval);
      clearTimeout(recheck);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", check);
      navigator.serviceWorker?.removeEventListener("controllerchange", refill);
      window.removeEventListener("submit", guard, true);
    };
  }, [userId, router]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function applyUpdate() {
    setWorking(true);
    const result = await restartApp({ update: true });
    if (!result.ok) {
      setNotice(result.error);
      setWorking(false);
    }
  }

  const waiting = queue.pending;
  // "offline" also covers: the device has a network but the server can't be reached
  const offline = !online || (queue.status === "offline" && waiting > 0);
  const pill = offline
    ? { tone: "bg-ink text-bg", text: waiting ? `Offline · ${waiting} change${waiting === 1 ? "" : "s"} saved on this device` : "Offline · you can keep ticking habits" }
    : queue.status === "signed-out" && waiting
      ? { tone: "bg-warn-soft text-warn", text: `Sign in again to sync ${waiting} change${waiting === 1 ? "" : "s"}` }
      : waiting
        ? { tone: "bg-brand-solid text-white", text: `Syncing ${waiting} change${waiting === 1 ? "" : "s"}…` }
        : justSynced
          ? { tone: "bg-good-soft text-good", text: "All changes synced ✓" }
          : null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[84px] z-40 flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
      <AnimatePresence>
        {(notice ?? queue.lastError) && (
          <motion.p key="notice" role="status" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="pointer-events-auto max-w-md rounded-xl bg-ink px-4 py-2.5 text-center text-[13px] font-medium text-bg shadow-xl">
            {notice ?? queue.lastError}
          </motion.p>
        )}
        {update && (
          <motion.div key="update" initial={{ opacity: 0, y: 24, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16 }} transition={{ type: "spring", stiffness: 380, damping: 28 }} className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-line bg-card py-2 pl-4 pr-2 shadow-xl">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="ripple absolute inset-0 rounded-full bg-brand" />
              <span className="relative h-2.5 w-2.5 rounded-full bg-brand" />
            </span>
            <span className="text-[13px] font-medium">
              A new version is ready.
              {waiting > 0 && <span className="text-muted"> Your {waiting} unsynced change{waiting === 1 ? "" : "s"} will be sent first.</span>}
            </span>
            <button type="button" onClick={applyUpdate} disabled={working} className="shrink-0 rounded-xl bg-brand-solid px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-solid-hover disabled:opacity-60">
              {working ? (waiting ? "Syncing…" : "Updating…") : "Update & restart"}
            </button>
          </motion.div>
        )}
        {pill && (
          <motion.div key={pill.text} initial={{ opacity: 0, y: 16, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.96 }} className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-lg ${pill.tone}`}>
            {offline && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
            {!offline && waiting > 0 && <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent [animation:spin-slow_0.7s_linear_infinite]" />}
            {pill.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** "Check for update" and "Restart app" buttons, for the Winter Arc screen and Profile. */
export function AppControls({ tone = "theme" }: { tone?: "theme" | "dark" }) {
  const [state, setState] = useState<"idle" | "checking" | "current" | "found" | "restarting">("idle");
  const [error, setError] = useState<string | null>(null);
  const queue = useOfflineQueue();
  const dark = tone === "dark";
  const button = dark
    ? "rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/10 disabled:opacity-50"
    : "rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-ink hover:border-brand hover:text-brand disabled:opacity-50";

  async function check() {
    setError(null);
    setState("checking");
    setState((await updateAvailable()) ? "found" : "current");
  }
  async function restart(update: boolean) {
    setError(null);
    setState("restarting");
    const result = await restartApp({ update });
    if (!result.ok) {
      setError(result.error);
      setState(update ? "found" : "idle");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {state === "found" ? (
          <button type="button" className={`${button} ${dark ? "!border-white !bg-white !text-black" : "!border-transparent !bg-brand-solid !text-white"}`} onClick={() => restart(true)}>
            Update &amp; restart
          </button>
        ) : (
          <button type="button" className={button} onClick={check} disabled={state === "checking" || state === "restarting"}>
            {state === "checking" ? "Checking…" : "Check for update"}
          </button>
        )}
        <button type="button" className={button} onClick={() => restart(false)} disabled={state === "restarting"}>
          {state === "restarting" ? "Restarting…" : "Restart app"}
        </button>
      </div>
      <p className={`mt-2 text-[11px] leading-relaxed ${dark ? "text-white/45" : "text-muted"}`} role="status">
        {error ??
          (state === "current"
            ? "You're on the latest version."
            : state === "found"
              ? `A new version is available.${queue.pending ? ` Your ${queue.pending} unsynced change${queue.pending === 1 ? "" : "s"} will be sent first.` : ""}`
              : `Version ${APP_BUILD}. Changes are always synced before an update.`)}
      </p>
    </div>
  );
}
