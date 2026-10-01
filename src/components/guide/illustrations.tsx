"use client";

import { motion } from "motion/react";
import { Flame } from "@/components/dashboard/effects";

// Small looping scenes, one per guide step. Each shows the real thing in miniature.

const loop = (duration: number) => ({ duration, repeat: Infinity, ease: "easeInOut" as const });

export function WelcomeArt() {
  return (
    <div className="relative grid h-full place-items-center">
      <span className="ripple absolute h-20 w-20 rounded-full border border-brand" />
      <span className="ripple absolute h-20 w-20 rounded-full border border-brand [animation-delay:1.2s]" />
      <span className="relative grid h-20 w-20 place-items-center rounded-3xl bg-brand-solid text-white shadow-[0_18px_40px_-14px_var(--brand-solid)]">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <motion.path d="M2 12h4l3-9 6 18 3-9h4" animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }} transition={{ duration: 2.8, repeat: Infinity, times: [0, 0.45, 0.8, 1] }} />
        </svg>
      </span>
    </div>
  );
}

/** A tap lands on "+ Add Habit" and a new row slides in. */
export function AddArt() {
  return (
    <div className="mx-auto flex h-full w-full max-w-[250px] flex-col justify-center gap-3">
      <div className="relative self-end">
        <motion.span className="block rounded-xl bg-brand-solid px-3.5 py-2 text-xs font-semibold text-white" animate={{ scale: [1, 1, 0.9, 1, 1] }} transition={{ ...loop(3), times: [0, 0.2, 0.28, 0.36, 1] }}>
          + Add Habit
        </motion.span>
        <span className="pointer-events-none absolute inset-0 grid place-items-center">
          <motion.span className="h-9 w-9 rounded-full border-2 border-brand" animate={{ scale: [0.4, 0.4, 1.5, 1.5], opacity: [0, 0.9, 0, 0] }} transition={{ ...loop(3), times: [0, 0.22, 0.45, 1] }} />
        </span>
      </div>
      <motion.div className="flex items-center gap-2.5 rounded-xl border border-line bg-card px-3 py-2.5" animate={{ opacity: [0, 0, 1, 1, 0], y: [14, 14, 0, 0, 0] }} transition={{ ...loop(3), times: [0, 0.4, 0.55, 0.92, 1] }}>
        <span className="h-5 w-5 rounded-md border-2 border-line" />
        <span className="text-base">📚</span>
        <span className="text-xs font-semibold text-ink">Read 30 minutes</span>
      </motion.div>
    </div>
  );
}

/** The checkbox ticks itself, the row tints, the streak goes up. */
export function TickArt() {
  const times = [0, 0.25, 0.35, 0.85, 1];
  const hidden = "circle(0% at 26px 50%)";
  const shown = "circle(150% at 26px 50%)";
  return (
    <div className="mx-auto flex h-full w-full max-w-[260px] items-center">
      <div className="relative w-full overflow-hidden rounded-xl border border-line bg-card">
        <motion.span className="absolute inset-0 bg-good-soft" animate={{ clipPath: [hidden, hidden, shown, shown, hidden] }} transition={{ ...loop(3.4), times }} />
        <div className="relative flex items-center gap-2.5 px-3 py-3">
          <motion.span
            className="grid h-6 w-6 place-items-center rounded-lg border-2"
            animate={{
              backgroundColor: ["rgba(16,185,129,0)", "rgba(16,185,129,0)", "rgba(16,185,129,1)", "rgba(16,185,129,1)", "rgba(16,185,129,0)"],
              borderColor: ["#94a3b8", "#94a3b8", "#10b981", "#10b981", "#94a3b8"],
              scale: [1, 0.8, 1.1, 1, 1],
            }}
            transition={{ ...loop(3.4), times }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <motion.path d="M5 12.5l4.5 4.5L19 7.5" animate={{ pathLength: [0, 0, 1, 1, 0] }} transition={{ ...loop(3.4), times }} />
            </svg>
          </motion.span>
          <span className="text-base">🏃</span>
          <span className="flex-1 text-xs font-semibold text-ink">Morning run</span>
          <span className="flex items-center gap-1 text-xs font-semibold tabular-nums text-ink">
            <Flame lit size={14} />
            <span className="relative inline-block h-4 w-4 overflow-hidden">
              <motion.span className="absolute inset-x-0" animate={{ y: [0, 0, -16, -16, 0] }} transition={{ ...loop(3.4), times }}>
                <span className="block h-4 leading-4">6</span>
                <span className="block h-4 leading-4">7</span>
              </motion.span>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

/** Phone: the bottom tab bar. Desktop: the sidebar. The highlight walks across. */
export function NavArt({ phone, tabs }: { phone: boolean; tabs: string[] }) {
  const duration = tabs.length * 1.1;
  if (phone) {
    const stops = tabs.map((_, i) => `${i * 100}%`);
    return (
      <div className="mx-auto flex h-full w-full max-w-[270px] flex-col justify-end">
        <div className="rounded-t-2xl border border-b-0 border-line bg-card px-3 pb-2 pt-5">
          <div className="mb-2.5 h-2 w-2/3 rounded-full bg-line" />
          <div className="mb-3.5 h-2 w-1/2 rounded-full bg-line" />
          <div className="relative grid rounded-xl border border-line bg-raised" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
            <motion.span className="absolute left-0 top-0 h-0.5 rounded-full bg-brand" style={{ width: `${100 / tabs.length}%` }} animate={{ x: [...stops, stops[0]] }} transition={{ duration, repeat: Infinity, ease: "easeInOut" }} />
            {tabs.map((tab) => (
              <span key={tab} className="py-2 text-center text-[9px] font-semibold text-muted">
                <span className="mx-auto mb-1 block h-3 w-3 rounded-[4px] bg-line" />
                {tab}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto flex h-full w-full max-w-[270px] items-center">
      <div className="flex w-full overflow-hidden rounded-xl border border-line bg-card">
        <div className="relative w-[46%] border-r border-line p-2">
          <motion.span className="absolute left-2 right-2 top-2 h-[22px] rounded-lg bg-brand-soft" animate={{ y: [...tabs.map((_, i) => i * 24), 0] }} transition={{ duration, repeat: Infinity, ease: "easeInOut" }} />
          {tabs.map((tab) => (
            <span key={tab} className="relative mb-0.5 flex h-[22px] items-center px-2 text-[10px] font-semibold text-muted">
              {tab}
            </span>
          ))}
        </div>
        <div className="flex-1 space-y-2 p-3">
          <div className="h-2 w-3/4 rounded-full bg-line" />
          <div className="h-7 rounded-lg bg-raised" />
          <div className="h-7 rounded-lg bg-raised" />
        </div>
      </div>
    </div>
  );
}

/** The app icon drops onto a phone's home screen. */
export function InstallArt() {
  return (
    <div className="grid h-full place-items-center">
      <div className="relative h-[128px] w-[78px] rounded-[18px] border-2 border-line bg-card p-2">
        <span className="absolute left-1/2 top-1.5 h-1 w-6 -translate-x-1/2 rounded-full bg-line" />
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="aspect-square rounded-[5px] bg-line" />
          ))}
          <motion.span
            className="grid aspect-square place-items-center rounded-[5px] bg-brand-solid"
            animate={{ y: [-70, 0, 0, 0], scale: [1.6, 1, 1, 1], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, times: [0, 0.3, 0.85, 1] }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M2 12h4l3-9 6 18 3-9h4" />
            </svg>
          </motion.span>
        </div>
      </div>
    </div>
  );
}
