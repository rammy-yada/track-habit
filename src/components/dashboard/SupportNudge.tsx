"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CREATOR } from "@/lib/constants";

const KEY = "habitflow:support-nudge"; // holds a date ("not today") or "never"

/**
 * Shown under the "Perfect day" banner once every habit is done: a quiet
 * invitation to support the creator. "Not today" hides it until tomorrow,
 * "Don't ask again" hides it for good. It never blocks anything.
 */
export function SupportNudge({ show, today }: { show: boolean; today: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!show) return setOpen(false);
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    setOpen(saved !== "never" && saved !== today);
  }, [show, today]);

  function dismiss(value: string) {
    try {
      localStorage.setItem(KEY, value);
    } catch {}
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ delay: 0.9, duration: 0.45 }} className="overflow-hidden">
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-line bg-card px-4 py-3.5">
            <motion.span aria-hidden className="text-xl text-brand" animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}>
              ♥
            </motion.span>
            <p className="min-w-[12rem] flex-1 text-[13px] leading-snug text-muted">
              <span className="font-semibold text-ink">You showed up today.</span> If HabitFlow helps you do that, you can support {CREATOR.handle}, who makes it.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <a href={CREATOR.supportUrl} target="_blank" rel="noopener noreferrer" onClick={() => dismiss(today)} className="rounded-xl bg-brand-solid px-3.5 py-2 text-[13px] font-semibold text-on-brand hover:bg-brand-solid-hover">
                Support ↗
              </a>
              <button type="button" onClick={() => dismiss(today)} className="rounded-xl border border-line px-3 py-2 text-[13px] font-semibold text-muted hover:text-ink">
                Not today
              </button>
              <button type="button" onClick={() => dismiss("never")} className="px-1 py-2 text-xs font-medium text-muted underline-offset-2 hover:text-ink hover:underline">
                Don&apos;t ask again
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
