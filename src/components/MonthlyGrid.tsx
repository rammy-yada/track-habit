"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { PageHeader } from "@/components/PageHeader";
import { card } from "@/components/ui/styles";
import { setHabitDone } from "@/lib/actions/habits";
import type { getMonthly } from "@/lib/data";

type Data = Awaited<ReturnType<typeof getMonthly>>;

function pill(percent: number) {
  if (percent >= 80) return "bg-good-soft text-good";
  if (percent >= 50) return "bg-warn-soft text-warn";
  return "bg-bad-soft text-bad";
}

export function MonthlyGrid({ data }: { data: Data }) {
  const base = useMemo(() => new Set(data.done), [data.done]);
  const [done, apply] = useOptimistic(base, (current: Set<string>, op: { key: string; on: boolean }) => {
    const next = new Set(current);
    if (op.on) next.add(op.key);
    else next.delete(op.key);
    return next;
  });
  const [, startTransition] = useTransition();
  const [popped, setPopped] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Slide the month label in from the side you navigated toward.
  const [nav, setNav] = useState({ key: data.key, direction: 1 });
  if (nav.key !== data.key) setNav({ key: data.key, direction: data.key > nav.key ? 1 : -1 });
  const direction = nav.direction;

  function toggle(habitId: number, date: string) {
    const key = `${habitId}:${date}`;
    const on = !done.has(key);
    setPopped(key);
    setError(null);
    startTransition(async () => {
      apply({ key, on });
      const result = await setHabitDone(habitId, on, date);
      if (!result.ok) setError(result.error);
    });
  }

  const pastDays = data.days.filter((d) => d.isPast);

  return (
    <>
      <PageHeader title="Monthly View">
        <NavArrow href={data.prevHref} label="Previous month" d="M15 6l-6 6 6 6" />
        <div className="relative h-7 w-36 overflow-hidden text-center sm:w-40">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.div
              key={data.key}
              custom={direction}
              className="absolute inset-0 font-display text-base font-bold leading-7 tracking-tight"
              variants={{
                enter: (dir: number) => ({ x: dir * 48, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (dir: number) => ({ x: dir * -48, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
            >
              {data.label}
            </motion.div>
          </AnimatePresence>
        </div>
        <NavArrow href={data.nextHref} label="Next month" d="M9 6l6 6-6 6" />
      </PageHeader>

      <div className="px-4 py-6 md:px-8 md:py-7">
        <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-muted">
          <span className="flex items-center gap-2">
            <span className="grid h-5 w-5 place-items-center rounded-md bg-good-soft text-[11px] font-bold text-good">✓</span> Completed
          </span>
          <span className="flex items-center gap-2">
            <span className="grid h-5 w-5 place-items-center rounded-md bg-raised">·</span> Missed
          </span>
          <span className="flex items-center gap-2">
            <span className="grid h-5 w-5 place-items-center rounded-md border border-dashed border-line" /> Future
          </span>
          <span className="ml-auto font-semibold">Click a past day to toggle it</span>
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-xl bg-bad-soft px-3.5 py-2.5 text-[13px] font-medium text-bad">
            {error}
          </p>
        )}

        {data.habits.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-card px-6 py-16 text-center">
            <h2 className="font-display text-lg font-bold">No habits to show</h2>
            <p className="mt-1.5 text-sm text-muted">
              Add habits from the{" "}
              <Link href="/dashboard" className="font-semibold text-brand hover:underline">
                Dashboard
              </Link>{" "}
              first.
            </p>
          </div>
        ) : (
          <div className={`${card} overflow-auto`}>
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr className="bg-raised text-muted">
                  <th scope="col" className="sticky left-0 z-10 min-w-[140px] bg-raised px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider">
                    Habit
                  </th>
                  {data.days.map((d) => (
                    <th key={d.day} scope="col" title={d.date} className={`px-0.5 py-2 text-center font-semibold ${d.isToday ? "text-brand" : ""}`}>
                      <div className="text-[11px]">{d.day}</div>
                      <div className="text-[9px] font-medium opacity-70">{d.weekday}</div>
                    </th>
                  ))}
                  <th scope="col" className="px-2 text-[11px] font-semibold uppercase tracking-wider">
                    Done
                  </th>
                  <th scope="col" className="px-2 text-[11px] font-semibold uppercase tracking-wider">
                    Rate
                  </th>
                </tr>
              </thead>
              {/* keyed by month so the wave replays when you change month */}
              <tbody key={data.key}>
                {data.habits.map((habit, row) => {
                  const doneCount = pastDays.filter((d) => done.has(`${habit.id}:${d.date}`)).length;
                  const percent = pastDays.length ? Math.round((doneCount / pastDays.length) * 100) : 0;
                  return (
                    <tr key={habit.id} className="group border-t border-line">
                      <th scope="row" className="sticky left-0 z-10 max-w-[170px] truncate bg-card px-4 py-2 text-left text-[13px] font-semibold transition-colors group-hover:bg-raised">
                        <span aria-hidden className="mr-2">
                          {habit.icon}
                        </span>
                        {habit.name}
                      </th>
                      {data.days.map((d, col) => {
                        const key = `${habit.id}:${d.date}`;
                        const isDone = done.has(key);
                        return (
                          <td key={d.day} className={`px-[2px] py-2 text-center ${d.isToday ? "bg-brand-soft/60" : ""}`}>
                            {d.isPast ? (
                              <button
                                type="button"
                                onClick={() => toggle(habit.id, d.date)}
                                aria-pressed={isDone}
                                aria-label={`${habit.name}, ${d.weekday} ${d.day}: ${isDone ? "done" : "not done"}`}
                                style={{ ["--d" as string]: row + col }}
                                className={`cell-in grid h-5 w-5 place-items-center rounded-[5px] text-[10px] font-bold transition-colors ${popped === key ? "cell-pop" : ""} ${
                                  isDone ? "bg-good-soft text-good hover:brightness-95" : "bg-raised text-muted hover:bg-good-soft hover:text-good"
                                }`}
                              >
                                {isDone ? "✓" : "·"}
                              </button>
                            ) : (
                              <span style={{ ["--d" as string]: row + col }} className="cell-in mx-auto block h-5 w-5 rounded-[5px] border border-dashed border-line" />
                            )}
                          </td>
                        );
                      })}
                      <td className="px-2 text-center text-[13px] font-bold tabular-nums">{doneCount}</td>
                      <td className="px-2 text-center">
                        <span className={`inline-block rounded-full px-2 py-1 text-[11px] font-bold tabular-nums ${pill(percent)}`}>{percent}%</span>
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t border-line bg-raised font-bold">
                  <th scope="row" className="sticky left-0 z-10 bg-raised px-4 py-2.5 text-left text-[13px] text-muted">
                    Total done
                  </th>
                  {data.days.map((d) => {
                    const count = d.isPast ? data.habits.filter((h) => done.has(`${h.id}:${d.date}`)).length : null;
                    return (
                      <td key={d.day} className={`text-center text-[11px] tabular-nums ${count ? "text-ink" : "text-muted"}`}>
                        {count ?? "–"}
                      </td>
                    );
                  })}
                  <td />
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function NavArrow({ href, label, d }: { href: string | null; label: string; d: string }) {
  const icon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
  const base = "grid h-9 w-9 place-items-center rounded-xl border border-line bg-card";
  if (!href) {
    return (
      <span className={`${base} cursor-not-allowed text-muted opacity-35`} aria-disabled="true" aria-label={label}>
        {icon}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} scroll={false} className={`${base} text-ink transition-colors hover:border-brand hover:text-brand`}>
      {icon}
    </Link>
  );
}
