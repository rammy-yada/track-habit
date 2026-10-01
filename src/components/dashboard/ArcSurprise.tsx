"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { MILESTONES } from "@/lib/arc-config";
import { Confetti } from "./effects";

const OPENED_KEY = "habitflow:arc-surprise"; // the last day the gift opened by itself

/** Has today's gift already popped up on this device? */
export function surpriseSeen(today: string): boolean {
  try {
    return localStorage.getItem(OPENED_KEY) === today;
  } catch {
    return true;
  }
}

/** The same day always gives the same message, however often the gift is reopened. */
function pick(lines: string[], seed: string): string {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return lines[hash % lines.length] ?? "";
}

type Props = {
  open: boolean;
  onClose: () => void;
  today: string;
  /** Perfect Winter Arc days so far, today included. */
  perfectDays: number;
  surprises: string[];
};

/**
 * The reward for finishing every Winter Arc habit of the day: a gift that is
 * tapped open. On milestone days it holds a badge, on other days a message.
 */
export function ArcSurprise({ open, onClose, today, perfectDays, surprises }: Props) {
  const [revealed, setRevealed] = useState(false);
  const milestone = MILESTONES.find((m) => m.days === perfectDays);
  const next = MILESTONES.find((m) => m.days > perfectDays);

  useEffect(() => {
    if (!open) return;
    setRevealed(false);
    try {
      localStorage.setItem(OPENED_KEY, today);
    } catch {}
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, today, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div role="dialog" aria-modal="true" aria-label="Today's surprise" className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-5 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={revealed ? onClose : undefined}>
          <AnimatePresence mode="wait">
            {!revealed ? (
              <motion.button
                key="gift"
                type="button"
                autoFocus
                onClick={() => {
                  navigator.vibrate?.(60);
                  setRevealed(true);
                }}
                className="text-center text-white outline-none"
                initial={{ scale: 0.4, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 1.6, opacity: 0, transition: { duration: 0.25 } }}
                transition={{ type: "spring", stiffness: 260, damping: 16 }}
              >
                {/* the box rocks, as if something inside wants out */}
                <motion.span className="block text-[7rem] leading-none" aria-hidden animate={{ rotate: [0, -9, 9, -6, 6, 0], y: [0, -6, 0] }} transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 0.5 }}>
                  🎁
                </motion.span>
                <span className="mt-5 block text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Winter Arc · all done today</span>
                <span className="mt-1.5 block font-display text-2xl font-bold">You earned a surprise</span>
                <motion.span className="mt-5 inline-block rounded-full border border-white/40 px-5 py-2 text-sm font-semibold" animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.3, repeat: Infinity }}>
                  Tap to open
                </motion.span>
              </motion.button>
            ) : (
              <motion.div key="card" onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-3xl border border-line bg-card p-7 text-center text-ink shadow-2xl" initial={{ scale: 0.5, opacity: 0, rotate: -6 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 240, damping: 15 }} data-surprise={milestone ? "badge" : "message"}>
                {milestone ? (
                  <>
                    <motion.div className="text-7xl leading-none" aria-hidden initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ delay: 0.15, duration: 0.6 }}>
                      {milestone.icon}
                    </motion.div>
                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand">Badge unlocked</p>
                    <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">{milestone.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{milestone.line}</p>
                  </>
                ) : (
                  <>
                    <motion.div className="text-6xl leading-none" aria-hidden initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ delay: 0.15, duration: 0.6 }}>
                      ✨
                    </motion.div>
                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand">Today&apos;s surprise</p>
                    <p className="mt-2 font-display text-xl font-bold leading-snug tracking-tight">{pick(surprises, today)}</p>
                  </>
                )}
                <p className="mt-5 rounded-xl bg-raised px-4 py-2.5 text-[13px] font-medium text-muted">
                  <span className="font-bold text-ink">{perfectDays}</span> perfect {perfectDays === 1 ? "day" : "days"}
                  {next && (
                    <>
                      {" "}
                      · next badge in <span className="font-bold text-ink">{next.days - perfectDays}</span>
                    </>
                  )}
                </p>
                <div className="mt-5 flex gap-2">
                  <Link href="/arc" className="flex-1 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold hover:border-brand hover:text-brand">
                    Share it
                  </Link>
                  <button type="button" onClick={onClose} autoFocus className="flex-1 rounded-xl bg-brand-solid px-4 py-2.5 text-sm font-semibold text-on-brand hover:bg-brand-solid-hover">
                    Keep going
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {revealed && <Confetti />}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
