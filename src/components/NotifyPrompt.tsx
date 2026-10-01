"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { detectDevice, enablePush, pushState } from "@/lib/pwa";

const KEY = "habitflow:notify-prompt"; // { until: timestamp, times: how often it was put off }
const SNOOZE_DAYS = [1, 3, 7]; // put off once → asked tomorrow; twice → in 3 days; three times → in a week; then never again

/**
 * Asks, once the app has been open for a few seconds, whether to turn
 * notifications on. It only appears where they can actually work and haven't
 * been decided yet, it explains what will be sent before the browser's own
 * question pops up, and it backs off each time it is put off.
 */
export function NotifyPrompt({ publicKey }: { publicKey: string | null }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) return;
    let saved: { until?: number; times?: number } = {};
    try {
      saved = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    } catch {}
    if ((saved.times ?? 0) > SNOOZE_DAYS.length || (saved.until ?? 0) > Date.now()) return;
    // sooner in the installed app (that is where reminders matter most), later in a browser tab
    const timer = setTimeout(
      () => void pushState().then((state) => state === "off" && setOpen(true), () => {}),
      detectDevice().installed ? 2500 : 9000,
    );
    return () => clearTimeout(timer);
  }, [publicKey]);

  function later() {
    try {
      const times = (JSON.parse(localStorage.getItem(KEY) ?? "{}").times ?? 0) + 1;
      localStorage.setItem(KEY, JSON.stringify({ times, until: Date.now() + (SNOOZE_DAYS[times - 1] ?? 3650) * 86_400_000 }));
    } catch {}
    setOpen(false);
  }

  async function turnOn() {
    setBusy(true);
    try {
      const state = await enablePush(publicKey!);
      if (state === "on") return setOpen(false);
      setNote(state === "blocked" ? "Notifications are blocked for this site. You can allow them in your browser's site settings." : "That didn't work this time. You can turn them on later in Profile.");
      setTimeout(later, 4000);
    } catch {
      later();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-label="Turn on notifications"
          className="fixed inset-x-3 bottom-[calc(92px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-2xl border border-line bg-card p-4 shadow-2xl md:bottom-6 md:left-auto md:right-6 md:mx-0"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          data-notify-prompt
        >
          <div className="flex gap-3.5">
            <motion.span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-xl" aria-hidden animate={{ rotate: [0, -14, 12, -8, 6, 0] }} transition={{ duration: 0.9, delay: 0.4, repeat: Infinity, repeatDelay: 3 }}>
              🔔
            </motion.span>
            <div className="min-w-0">
              <p className="text-sm font-bold">Want a nudge at the right time?</p>
              <p className="mt-0.5 text-[13px] leading-snug text-muted">{note ?? "Reminders for your habits, a line of motivation, and a gentle push on days you fall behind. You choose how often, in Profile."}</p>
            </div>
          </div>
          {!note && (
            <div className="mt-3.5 flex gap-2">
              <button type="button" onClick={later} disabled={busy} className="flex-1 rounded-xl border border-line px-3 py-2.5 text-sm font-semibold text-muted hover:text-ink">
                Not now
              </button>
              <button type="button" onClick={turnOn} disabled={busy} className="flex-[1.4] rounded-xl bg-brand-solid px-3 py-2.5 text-sm font-semibold text-on-brand hover:bg-brand-solid-hover disabled:opacity-60">
                {busy ? "One moment…" : "Turn on notifications"}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
