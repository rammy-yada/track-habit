"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ChartTooltip, DataTable, niceScale, useWidth, type Datum } from "./shared";

const PAD = { top: 22, right: 8, bottom: 30, left: 30 };
const BAR = 24;

function columnPath(cx: number, top: number, base: number, w: number) {
  const r = Math.min(4, (base - top) / 2, w / 2);
  const l = cx - w / 2;
  const rgt = cx + w / 2;
  // Rounded at the data end, square at the baseline.
  return `M${l},${base}V${top + r}Q${l},${top} ${l + r},${top}H${rgt - r}Q${rgt},${top} ${rgt},${top + r}V${base}Z`;
}

/** Columns that grow from the baseline one after another. One series, one hue. */
export function ColumnChart({ data, unit, caption, height = 210 }: { data: Datum[]; unit: string; caption: string; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const band = innerW / Math.max(1, data.length);
  const barW = Math.max(6, Math.min(BAR, band - 6));
  const { max, ticks } = niceScale(Math.max(...data.map((d) => d.value)));
  const cx = (i: number) => PAD.left + band * (i + 0.5);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const base = y(0);

  return (
    <div ref={ref} className="relative" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={caption} className="block">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="stroke-grid" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                {t}
              </text>
            </g>
          ))}
          {data.map((d, i) => (
            <g
              key={i}
              tabIndex={0}
              aria-label={`${d.label}: ${d.value} ${unit}`}
              className="outline-none"
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            >
              {/* the whole band is the hit target, not just the painted bar */}
              <rect x={PAD.left + band * i} y={PAD.top} width={band} height={innerH + PAD.bottom} fill="transparent" />
              {d.value > 0 && (
                <motion.path
                  d={columnPath(cx(i), y(d.value), base, barW)}
                  className="fill-chart"
                  style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1, opacity: active === null || active === i ? 1 : 0.55 }}
                  transition={{ scaleY: { type: "spring", stiffness: 140, damping: 18, delay: 0.15 + i * 0.07 }, opacity: { duration: 0.15 } }}
                />
              )}
              <motion.text
                x={cx(i)}
                y={y(d.value) - 6}
                textAnchor="middle"
                className="fill-ink text-[11px] font-semibold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.07 }}
              >
                {d.value}
              </motion.text>
              <text x={cx(i)} y={height - 9} textAnchor="middle" className={`text-[11px] ${active === i ? "fill-ink font-semibold" : "fill-muted"}`}>
                {d.label}
              </text>
            </g>
          ))}
          <line x1={PAD.left} x2={width - PAD.right} y1={base} y2={base} className="stroke-line" strokeWidth={1} />
        </svg>
      )}
      {active !== null && <ChartTooltip x={cx(active)} y={y(data[active].value) - 12} value={data[active].value} label={data[active].label} unit={unit} />}
      <DataTable caption={caption} data={data} unit={unit} />
    </div>
  );
}
