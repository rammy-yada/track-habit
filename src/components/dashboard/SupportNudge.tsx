"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { CREATOR } from "@/lib/constants";

const KEY = "habitflow:support-nudge"; // holds a date ("not today") or "never"
const AMOUNTS = ["Rs 10", "Rs 50", "Rs 100", "Rs 500"];

/**
 * A pop-up shown once a day, a moment after every habit is done: an
 * invitation to support the person who makes the app. It says clearly what is
 * being asked (anything from Rs 10 to Rs 500), and is closed with one tap.
 * "Not today" hides it until tomorrow, "Don't ask again" for good.
 */
export function SupportNudge({ show, today }: { show: boolean; today: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!show) return setOpen(false);
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    if (saved === "never" || saved === today) return;
    // after the confetti, not on top of it
    const timer = setTimeout(() => setOpen(true), 2600);
    return () => clearTimeout(timer);
  }, [show, today]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss(today);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, today]);

  function dismiss(value: string) {
    try {
      localStorage.setItem(KEY, value);
    } catch {}
    setOpen(false);
  }

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div data-sheet className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => dismiss(today)}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-3xl border border-line bg-card p-6 pb-[calc(24px+env(safe-area-inset-bottom))] text-center shadow-2xl sm:rounded-3xl sm:pb-6"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            data-support-popup
          >
            <motion.div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-3xl text-brand" aria-hidden animate={{ scale: [1, 1.14, 1] }} transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}>
              ♥
            </motion.div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">Everything done today</p>
            <h2 id="support-title" className="mt-1 font-display text-2xl font-bold tracking-tight">
              You showed up. Well done.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              HabitFlow is free and has no ads. If it helps you keep going, you can support {CREATOR.handle}, who makes it. Any amount helps: you can start from <span className="font-bold text-ink">Rs 10</span>, up to <span className="font-bold text-ink">Rs 500</span>.
            </p>
            <ul className="mt-4 flex justify-center gap-1.5" aria-label="Typical amounts">
              {AMOUNTS.map((amount) => (
                <li key={amount} className="rounded-full border border-line px-3 py-1 text-xs font-semibold">
                  {amount}
                </li>
              ))}
            </ul>
            <a href={CREATOR.supportUrl} target="_blank" rel="noopener noreferrer" onClick={() => dismiss(today)} className="mt-5 block w-full rounded-xl bg-brand-solid px-4 py-3.5 text-sm font-bold text-on-brand hover:bg-brand-solid-hover" data-autofocus>
              Support {CREATOR.handle} ↗
            </a>
            <button type="button" onClick={() => dismiss(today)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 text-sm font-semibold text-muted hover:text-ink">
              Not today
            </button>
            <button type="button" onClick={() => dismiss("never")} className="mt-3 text-xs font-medium text-muted underline-offset-2 hover:text-ink hover:underline">
              Don&apos;t ask again
            </button>
            <p className="mt-3 text-[11px] text-muted">You choose the amount on the next page. Nothing is charged here.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
