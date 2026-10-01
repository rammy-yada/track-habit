"use client";

import { AnimatePresence, motion } from "motion/react";
import type { HabitView } from "@/lib/data";
import { Burst, Flame } from "./effects";

type Props = {
  habit: HabitView;
  burstKey: number | null;
  onToggle: () => void;
  onNote: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMenu: () => void;
};

export function HabitRow({ habit, burstKey, onToggle, onNote, onEdit, onDelete, onMenu }: Props) {
  const done = habit.doneToday;
  const streak = habit.streakBefore + (done ? 1 : 0);
  const week = [...habit.week, done];

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -40, scale: 0.94, transition: { duration: 0.22 } }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="group relative overflow-hidden rounded-2xl border border-line bg-card"
      style={{ borderColor: done ? `color-mix(in srgb, ${habit.color} 35%, var(--line))` : undefined }}
    >
      {/* completion washes across the row like liquid, starting from the checkbox */}
      <motion.span
        aria-hidden
        className="absolute inset-0"
        style={{ background: `color-mix(in srgb, ${habit.color} 9%, transparent)` }}
        initial={false}
        animate={{ clipPath: done ? "circle(150% at 34px 50%)" : "circle(0% at 34px 50%)" }}
        transition={{ duration: done ? 0.7 : 0.35, ease: [0.3, 0.7, 0.2, 1] }}
      />

      <div className="relative flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5">
        <motion.button
          type="button"
          onClick={onToggle}
          whileTap={{ scale: 0.8 }}
          aria-pressed={done}
          aria-label={`${done ? "Mark as not done" : "Mark as done"}: ${habit.name}`}
          className="relative grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2 transition-colors sm:h-7 sm:w-7"
          style={{ borderColor: done ? habit.color : "var(--line)", background: done ? habit.color : "transparent" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={false} animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }} transition={{ duration: 0.3, ease: "easeOut" }} />
          </svg>
          {burstKey !== null && <Burst key={burstKey} color={habit.color} />}
        </motion.button>

        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl" style={{ background: `color-mix(in srgb, ${habit.color} 14%, transparent)` }} aria-hidden>
          {habit.icon}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex">
            <span className={`relative max-w-full truncate text-[15px] font-semibold transition-colors ${done ? "text-muted" : "text-ink"}`}>
              {habit.name}
              <motion.span aria-hidden className="absolute left-0 top-1/2 h-[1.5px] w-full origin-left bg-current" initial={false} animate={{ scaleX: done ? 1 : 0 }} transition={{ duration: 0.35, ease: "easeOut" }} />
            </span>
          </div>
          <div className="mt-0.5 truncate text-xs text-muted">
            {habit.category} · <span className="capitalize">{habit.frequency}</span>
            {habit.reminder && ` · ${habit.reminder}`}
            {habit.mood && " · note added"}
          </div>
          <div className="mt-2 flex gap-1" aria-label={`Last 7 days: ${week.filter(Boolean).length} of 7 done`}>
            {week.map((on, i) => (
              <motion.span
                key={i}
                className="h-2 w-2 rounded-[3px]"
                initial={false}
                animate={{ backgroundColor: on ? habit.color : "var(--line)", scale: i === 6 && on ? [1, 1.7, 1] : 1 }}
                transition={{ duration: 0.4 }}
              />
            ))}
          </div>
        </div>

        <div className="hidden items-center gap-1.5 text-[13px] font-medium text-muted sm:flex" aria-label={`${streak} day streak`}>
          <Flame lit={streak > 0} />
          <span className="relative inline-flex h-5 min-w-[1ch] overflow-hidden tabular-nums text-ink">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={streak} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -16, opacity: 0 }} transition={{ duration: 0.25 }}>
                {streak}
              </motion.span>
            </AnimatePresence>
          </span>
          <span>day streak</span>
        </div>

        {/* desktop: the three actions inline */}
        <div className="hidden shrink-0 gap-1.5 opacity-60 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 sm:flex">
          <RowButton label={`Add a note for ${habit.name}`} title="Note / mood" onClick={onNote}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M8 12h5M8 16h8" />
          </RowButton>
          <RowButton label={`Edit ${habit.name}`} title="Edit" onClick={onEdit}>
            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
          </RowButton>
          <RowButton label={`Delete ${habit.name}`} title="Delete" onClick={onDelete} danger>
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
          </RowButton>
        </div>
        {/* phone: one button that opens a sheet with big, easy targets */}
        <button type="button" onClick={onMenu} aria-label={`More actions for ${habit.name}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted active:bg-raised sm:hidden">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="12" cy="5" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="12" cy="19" r="1.8" />
          </svg>
        </button>
      </div>
    </motion.li>
  );
}

function RowButton({ label, title, onClick, danger = false, children }: { label: string; title: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={title}
      className={`grid h-8 w-8 place-items-center rounded-lg border border-line bg-card text-muted transition-colors ${danger ? "hover:border-bad hover:bg-bad-soft hover:text-bad" : "hover:border-brand hover:bg-brand-soft hover:text-brand"}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
