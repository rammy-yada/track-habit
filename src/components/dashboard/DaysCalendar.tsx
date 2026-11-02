"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

// GitHub's dark contribution colours: nothing done … everything done.
const SHADES = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LEVEL_WORDS = ["nothing done", "a little done", "about half done", "most done", "everything done"];

const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * Days shaded by how much of the list got done, like GitHub's contribution
 * graph and always in its dark colours, with weeks running S M T W T F S.
 *
 * "month" (Today): this month, large, with a link to the report.
 * "all" (Stats): every month since the account was opened, side by side, to
 * swipe through. It starts on this month, with earlier ones to the left.
 */
export function DaysCalendar({ from, levels, today, todayLevel, view }: { from: string; levels: number[]; today: string; /** Today's shade, when it is live on the device rather than in `levels`. */ todayLevel?: number; view: "month" | "all" }) {
  const level = new Map<string, number>(levels.map((l, i) => [addDays(from, i), l]));
  if (todayLevel !== undefined) level.set(today, todayLevel);
  const [thisYear, thisMonth] = [Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1];

  const months: { year: number; month: number }[] = [];
  if (view === "month") months.push({ year: thisYear, month: thisMonth });
  else for (let y = Number(from.slice(0, 4)), m = Number(from.slice(5, 7)) - 1; y < thisYear || (y === thisYear && m <= thisMonth); m === 11 ? (y++, (m = 0)) : m++) months.push({ year: y, month: m });

  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (row.current) row.current.scrollLeft = row.current.scrollWidth;
  }, []);
  const big = view === "month";

  return (
    <section className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-5 text-[#c9d1d9]" aria-label="Your days" data-days-calendar={view}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold text-[#f0f6fc]">Your days</h2>
        {big ? (
          <Link href="/analytics" className="-my-1.5 py-1.5 text-xs font-semibold text-[#58a6ff] hover:underline" data-view-report>
            View report
          </Link>
        ) : (
          <span className="text-[11px] text-[#8b949e]">
            since {MONTHS[Number(from.slice(5, 7)) - 1]} {Number(from.slice(8, 10))}, {from.slice(0, 4)}
          </span>
        )}
      </div>
      <div ref={row} className={big ? "" : "flex snap-x snap-mandatory gap-6 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin]"} data-days-row>
        {months.map(({ year, month }) => {
          const first = `${year}-${String(month + 1).padStart(2, "0")}-01`;
          const blank = new Date(`${first}T12:00:00Z`).getUTCDay(); // empty cells before the 1st
          const length = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
          return (
            <div key={first} className={big ? "" : "shrink-0 snap-end"} data-days-month={first.slice(0, 7)}>
              <div className="mb-1.5 text-[11px] font-semibold text-[#8b949e]">
                {MONTHS[month]} {year}
              </div>
              <div className={big ? "grid max-w-[340px] grid-cols-7 gap-1" : "grid grid-cols-[repeat(7,22px)] gap-1"}>
                {WEEKDAYS.map((d, i) => (
                  <span key={i} className="text-center text-[10px] font-semibold leading-5 text-[#8b949e]" aria-hidden>
                    {d}
                  </span>
                ))}
                {Array.from({ length: blank }, (_, i) => (
                  <span key={`b${i}`} />
                ))}
                {Array.from({ length }, (_, i) => {
                  const day = `${first.slice(0, 8)}${String(i + 1).padStart(2, "0")}`;
                  if (day < from) return <span key={day} />; // before the account existed
                  const future = day > today;
                  const l = level.get(day) ?? 0;
                  return (
                    <span
                      key={day}
                      title={future ? undefined : `${MONTHS[month]} ${i + 1}: ${LEVEL_WORDS[l]}`}
                      className={`block aspect-square rounded-[4px] ${day === today ? "ring-1 ring-[#f0f6fc] ring-offset-1 ring-offset-[#0d1117]" : ""}`}
                      style={{ background: future ? "transparent" : SHADES[l], border: future ? "1px solid #21262d" : undefined }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-[#8b949e]">
        Less
        {SHADES.map((c) => (
          <span key={c} className="h-[10px] w-[10px] rounded-[2px]" style={{ background: c }} />
        ))}
        More
      </div>
    </section>
  );
}
