"use client";

import { useLayoutEffect, useRef, useState } from "react";

export type Datum = { label: string; value: number };

/** Tracks an element's width so charts are drawn in real pixels (crisp text at any size). */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

/** A clean axis maximum and tick step for whole-number counts. */
export function niceScale(maxValue: number, targetTicks = 4): { max: number; ticks: number[] } {
  const rough = Math.max(1, maxValue) / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? magnitude * 10);
  const max = Math.max(step * 2, Math.ceil(Math.max(1, maxValue) / step) * step);
  const ticks: number[] = [];
  for (let v = 0; v <= max; v += step) ticks.push(v);
  return { max, ticks };
}

/** Value leads, label follows — the reader already knows which mark they're on. */
export function ChartTooltip({ x, y, value, label, unit }: { x: number; y: number; value: number; label: string; unit: string }) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs shadow-lg"
      style={{ left: x, top: y - 10 }}
    >
      <span className="font-semibold text-ink">
        {value.toLocaleString("en-US")} {unit}
      </span>
      <span className="ml-1.5 text-muted">{label}</span>
    </div>
  );
}

/** Screen-reader / no-hover twin of a chart: the same numbers as a table. */
export function DataTable({ caption, data, unit }: { caption: string; data: Datum[]; unit: string }) {
  return (
    // a <table> ignores height/overflow, so the visually-hidden clip goes on a wrapper
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Label</th>
            <th scope="col">{unit}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <th scope="row">{d.label}</th>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyChart({ children }: { children: React.ReactNode }) {
  return <div className="grid h-40 place-items-center text-center text-sm text-muted">{children}</div>;
}
