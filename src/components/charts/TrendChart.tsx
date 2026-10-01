"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ChartTooltip, DataTable, niceScale, useWidth, type Datum } from "./shared";

const HEIGHT = 220;
const PAD = { top: 16, right: 20, bottom: 28, left: 30 };

/** Single-series line over time. The line draws itself, then the wash fades in. */
export function TrendChart({ data, unit, caption }: { data: Datum[]; unit: string; caption: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const { max, ticks } = niceScale(Math.max(...data.map((d) => d.value)));
  const x = (i: number) => PAD.left + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join("");
  const area = `${line}L${x(data.length - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`;
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(innerW / 72))));
  const last = data.length - 1;
  const shown = active ?? last;

  function onPointer(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left - PAD.left) / Math.max(1, innerW);
    setActive(Math.max(0, Math.min(last, Math.round(ratio * last))));
  }

  return (
    <div ref={ref} className="relative" style={{ height: HEIGHT }}>
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={caption}
          tabIndex={0}
          className="block touch-pan-y rounded-lg"
          onPointerMove={onPointer}
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setActive(Math.max(0, shown - 1));
            if (e.key === "ArrowRight") setActive(Math.min(last, shown + 1));
          }}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="stroke-grid" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                {t}
              </text>
            </g>
          ))}
          {data.map((d, i) =>
            i % labelEvery === 0 && i < last - labelEvery / 2 ? (
              <text key={i} x={x(i)} y={HEIGHT - 8} textAnchor="middle" className="fill-muted text-[11px]">
                {d.label}
              </text>
            ) : null,
          )}
          <text x={x(last)} y={HEIGHT - 8} textAnchor="end" className="fill-ink text-[11px] font-semibold">
            {data[last].label}
          </text>

          <motion.path d={area} className="fill-chart" initial={{ opacity: 0 }} animate={{ opacity: 0.1 }} transition={{ delay: 0.9, duration: 0.6 }} />
          <motion.path
            d={line}
            fill="none"
            className="stroke-chart"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.3, ease: "easeInOut" }}
          />

          {active !== null && <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={y(0)} className="stroke-muted" strokeWidth={1} opacity={0.5} />}
          <motion.circle
            cx={x(shown)}
            cy={y(data[shown].value)}
            r={5}
            className="fill-chart stroke-card"
            strokeWidth={2}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.1, type: "spring" }}
          />
        </svg>
      )}
      {active !== null && <ChartTooltip x={x(active)} y={y(data[active].value)} value={data[active].value} label={data[active].label} unit={unit} />}
      <DataTable caption={caption} data={data} unit={unit} />
    </div>
  );
}
