"use client";

import { useEffect, useRef } from "react";

// GitHub's dark contribution colours: nothing done … everything done.
const SHADES = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * Every day since the account was opened, month by month, shaded by how much
 * of the list got done — like GitHub's contribution graph, always in its dark
 * colours. Weeks run S M T W T F S across; no months before the account
 * existed, no percentages. The newest month is on the right and scrolled to.
 */
export function DaysCalendar({ from, levels, today, todayLevel }: { from: string; levels: number[]; today: string; todayLevel: number }) {
  const level = new Map<string, number>(levels.map((l, i) => [addDays(from, i), l]));
  level.set(today, todayLevel);

  // the months from the one the account was opened in, to this one
  const months: { year: number; month: number }[] = [];
  for (let y = Number(from.slice(0, 4)), m = Number(from.slice(5, 7)) - 1; y < Number(today.slice(0, 4)) || (y === Number(today.slice(0, 4)) && m <= Number(today.slice(5, 7)) - 1); m === 11 ? (y++, (m = 0)) : m++) months.push({ year: y, month: m });

  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (row.current) row.current.scrollLeft = row.current.scrollWidth; // start at this month
  }, []);

  return (
    <section className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-5 text-[#c9d1d9]" aria-label="Your days" data-days-calendar>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold text-[#f0f6fc]">Your days</h2>
        <span className="text-[11px] text-[#8b949e]">since {MONTHS[Number(from.slice(5, 7)) - 1]} {Number(from.slice(8, 10))}</span>
      </div>
      <div ref={row} className="flex gap-5 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {months.map(({ year, month }) => {
          const first = `${year}-${String(month + 1).padStart(2, "0")}-01`;
          const blank = new Date(`${first}T12:00:00Z`).getUTCDay(); // empty cells before the 1st
          const length = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
          return (
            <div key={first} className="shrink-0">
              <div className="mb-1.5 text-[11px] font-semibold text-[#8b949e]">
                {MONTHS[month]} {year !== Number(today.slice(0, 4)) ? year : ""}
              </div>
              <div className="grid grid-cols-[repeat(7,14px)] gap-[3px]">
                {WEEKDAYS.map((d, i) => (
                  <span key={i} className="text-center text-[9px] font-semibold leading-[14px] text-[#8b949e]" aria-hidden>
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
                      title={future ? undefined : `${MONTHS[month]} ${i + 1}: ${["nothing done", "a little done", "about half done", "most done", "everything done"][l]}`}
                      className={`block h-[14px] w-[14px] rounded-[3px] ${day === today ? "ring-1 ring-[#f0f6fc] ring-offset-1 ring-offset-[#0d1117]" : ""}`}
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
