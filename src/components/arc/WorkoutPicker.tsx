"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Spotlight } from "@/components/ui/Spotlight";
import { card } from "@/components/ui/styles";
import { addWorkoutHabit } from "@/lib/actions/arc";
import { whenOnline } from "@/lib/offline";
import { WORKOUT_CATEGORIES, WORKOUTS, type Workout } from "@/lib/workouts";

const LEVEL_STYLE = { Beginner: "bg-good-soft text-good", Intermediate: "bg-warn-soft text-warn", Advanced: "bg-bad-soft text-bad" } as const;

/** Recommended workouts by category. One tap turns any of them into a daily habit. */
export function WorkoutPicker({ existing }: { existing: string[] }) {
  const [category, setCategory] = useState<string>(WORKOUT_CATEGORIES[0].id);
  const [added, setAdded] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const have = new Set(existing.map((name) => name.toLowerCase()));
  const active = WORKOUT_CATEGORIES.find((c) => c.id === category)!;
  const list = WORKOUTS.filter((w) => w.category === category);

  function add(workout: Workout) {
    setBusy(workout.id);
    setError(null);
    startTransition(async () => {
      const result = await whenOnline(() => addWorkoutHabit(workout.id));
      setBusy(null);
      if (result.ok) setAdded((current) => new Set(current).add(workout.id));
      else setError(result.error);
    });
  }

  return (
    <section aria-label="Workout recommendations">
      <h2 className="font-display text-xl font-bold tracking-tight">Workout recommendations</h2>
      <p className="mt-1 text-sm text-muted">Pick a category, then add what you&apos;ll actually do. Each one becomes a daily habit on your checklist and earns arc points when you tick it.</p>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="tablist" aria-label="Workout categories">
        {WORKOUT_CATEGORIES.map((c) => {
          const selected = c.id === category;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setCategory(c.id)}
              className={`relative shrink-0 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors ${selected ? "border-transparent text-white" : "border-line bg-card text-muted hover:text-ink"}`}
            >
              {selected && <motion.span layoutId="workout-tab" className="absolute inset-0 rounded-full bg-brand-solid" transition={{ type: "spring", stiffness: 440, damping: 34 }} />}
              <span className="relative">
                <span aria-hidden>{c.icon}</span> {c.label}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.p key={category} className="mt-3 text-[13px] text-muted" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          {active.blurb}
        </motion.p>
      </AnimatePresence>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-bad-soft px-3.5 py-2.5 text-[13px] font-medium text-bad">
          {error}
        </p>
      )}

      {/* keyed by category so the cards re-deal each time you switch */}
      <motion.ul key={category} className="mt-4 grid gap-3 sm:grid-cols-2" initial="hidden" animate="shown" variants={{ shown: { transition: { staggerChildren: 0.06 } } }}>
        {list.map((workout) => {
          const done = added.has(workout.id) || have.has(workout.name.toLowerCase());
          return (
            <motion.li key={workout.id} variants={{ hidden: { opacity: 0, y: 22, rotateX: -18 }, shown: { opacity: 1, y: 0, rotateX: 0, transition: { type: "spring", stiffness: 240, damping: 22 } } }} style={{ transformPerspective: 800 }}>
              <Spotlight className={`${card} flex h-full flex-col p-4`}>
                <div className="flex items-start gap-3">
                  <motion.span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl" style={{ background: `color-mix(in srgb, ${workout.color} 16%, transparent)` }} whileHover={{ rotate: [0, -12, 12, 0], scale: 1.1 }} transition={{ duration: 0.4 }} aria-hidden>
                    {workout.icon}
                  </motion.span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] font-semibold leading-tight">{workout.name}</h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                      <span className="rounded-full bg-raised px-2 py-0.5 text-muted">{workout.minutes} min</span>
                      <span className={`rounded-full px-2 py-0.5 ${LEVEL_STYLE[workout.level]}`}>{workout.level}</span>
                    </div>
                  </div>
                </div>

                <ol className="mt-3 flex-1 space-y-1 text-[13px] leading-snug text-muted">
                  {workout.steps.map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full" style={{ background: workout.color }} />
                      {step}
                    </li>
                  ))}
                </ol>

                <motion.button
                  type="button"
                  disabled={done || busy !== null}
                  onClick={() => add(workout)}
                  whileTap={done ? undefined : { scale: 0.96 }}
                  className={`mt-4 w-full overflow-hidden rounded-xl py-2.5 text-[13px] font-semibold transition-colors ${done ? "bg-good-soft text-good" : "bg-brand-solid text-white hover:bg-brand-solid-hover disabled:opacity-60"}`}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span key={done ? "done" : busy === workout.id ? "busy" : "idle"} className="block" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ duration: 0.15 }}>
                      {done ? "✓ In your habits" : busy === workout.id ? "Adding…" : "+ Add as daily habit"}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              </Spotlight>
            </motion.li>
          );
        })}
      </motion.ul>

      <p className="mt-4 text-xs leading-relaxed text-muted">These are general starting points, not personal medical advice. Begin at a level that feels manageable, and stop if something hurts.</p>
    </section>
  );
}
