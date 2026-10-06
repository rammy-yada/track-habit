"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { PageHeader } from "@/components/PageHeader";
import { card } from "@/components/ui/styles";
import { setDone, settle, useOfflineQueue } from "@/lib/offline";
import type { getMonthly } from "@/lib/data";

type Data = Awaited<ReturnType<typeof getMonthly>>;

function pill(percent: number) {
  if (percent >= 80) return "bg-good-soft text-good";
  if (percent >= 50) return "bg-warn-soft text-warn";
  return "bg-bad-soft text-bad";
}

export function MonthlyGrid({ data }: { data: Data }) {
  // Server data with the on-device queue layered on top, so ticks show at
  // once and keep working with no connection.
  const queue = useOfflineQueue();
  const base = useMemo(() => new Set(data.done), [data.done]);
  const done = useMemo(() => {
    const merged = new Set(base);
    for (const op of queue.ops.values()) {
      if (op.done) merged.add(`${op.habitId}:${op.date}`);
      else merged.delete(`${op.habitId}:${op.date}`);
    }
    return merged;
  }, [base, queue]);
  useEffect(() => {
    for (const op of queue.ops.values()) settle(op.habitId, op.date, base.has(`${op.habitId}:${op.date}`));
  }, [base, queue]);
  const [popped, setPopped] = useState<string | null>(null);
  const error = queue.lastError;

  // Slide the month label in from the side you navigated toward.
  const [nav, setNav] = useState({ key: data.key, direction: 1 });
  if (nav.key !== data.key) setNav({ key: data.key, direction: data.key > nav.key ? 1 : -1 });
  const direction = nav.direction;

  function toggle(habitId: number, date: string) {
    const key = `${habitId}:${date}`;
    const on = !done.has(key);
    setPopped(key);
    setDone(habitId, date, on);
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
        <YearHeat heat={data.heat} />
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
                                className={`cell-in grid h-6 w-6 place-items-center rounded-[6px] text-[11px] font-bold transition-colors ${popped === key ? "cell-pop" : ""} ${
                                  isDone ? "bg-good-soft text-good hover:brightness-95" : "bg-raised text-muted hover:bg-good-soft hover:text-good"
                                }`}
                              >
                                {isDone ? "✓" : "·"}
                              </button>
                            ) : (
                              <span style={{ ["--d" as string]: row + col }} className="cell-in mx-auto block h-6 w-6 rounded-[6px] border border-dashed border-line" />
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

// The shade for each level: nothing, then the theme's colour from faint to
// full. (In the Winter Arc look that is dark grey to white.)
const SHADE = ["var(--raised)", "color-mix(in srgb, var(--brand-solid) 28%, var(--card))", "color-mix(in srgb, var(--brand-solid) 52%, var(--card))", "color-mix(in srgb, var(--brand-solid) 76%, var(--card))", "var(--brand-solid)"];

/**
 * A year at a glance, the way GitHub shows contributions: one small square
 * per day, a column per week, shaded by how much of the day's habits got
 * done. It scrolls sideways on a phone and starts at the most recent week.
 */
function YearHeat({ heat }: { heat: Data["heat"] }) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth; // newest weeks are on the right
  }, []);
  return (
    <section className={`${card} mb-6 p-4 sm:p-5`} aria-label="Your year" data-year-heat>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-bold">
          {heat.total.toLocaleString("en-US")} check-in{heat.total === 1 ? "" : "s"} in the last year
        </h2>
        <p className="text-xs font-medium text-muted">
          {heat.activeDays} active day{heat.activeDays === 1 ? "" : "s"} · longest run {heat.longest} day{heat.longest === 1 ? "" : "s"}
        </p>
      </div>
      <div ref={scroller} className="no-scrollbar mt-4 overflow-x-auto pb-1">
        <div className="inline-flex gap-[3px]" role="img" aria-label={`${heat.total} check-ins over ${heat.activeDays} days in the last year`}>
          {/* weekday names down the side */}
          <div className="sticky left-0 z-10 mr-1 flex flex-col gap-[3px] bg-card pr-1 pt-[18px] text-[9px] font-medium leading-[11px] text-muted">
            {["", "Mon", "", "Wed", "", "Fri", ""].map((name, i) => (
              <span key={i} className="h-[11px]">
                {name}
              </span>
            ))}
          </div>
          {heat.weeks.map((week, w) => (
            <div key={week[0].date} className="flex flex-col gap-[3px]">
              <span className="h-[15px] whitespace-nowrap text-[9px] font-medium text-muted">{heat.months[w]}</span>
              {week.map((day) => (
                <span key={day.date} title={day.future ? undefined : `${day.date}: ${day.count} done`} className={`h-[11px] w-[11px] rounded-[3px] ${day.future ? "opacity-0" : ""}`} style={{ background: SHADE[day.level] }} data-level={day.level} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] font-medium text-muted">
        Less
        {SHADE.map((shade, i) => (
          <span key={i} className="h-[11px] w-[11px] rounded-[3px]" style={{ background: shade }} />
        ))}
        More
      </div>
    </section>
  );
}
