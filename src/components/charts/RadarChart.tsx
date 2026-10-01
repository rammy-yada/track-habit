"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ChartTooltip, DataTable, useWidth, type Datum } from "./shared";

const HEIGHT = 250;

/** Weekly rhythm as a radar: the shape unfolds from the centre. */
export function RadarChart({ data, unit, caption }: { data: Datum[]; unit: string; caption: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const cx = width / 2;
  const cy = HEIGHT / 2 + 2;
  const radius = Math.max(40, Math.min(width / 2 - 48, HEIGHT / 2 - 34));
  const max = Math.max(1, ...data.map((d) => d.value));
  const point = (i: number, ratio: number) => {
    const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2;
    return [cx + Math.cos(angle) * radius * ratio, cy + Math.sin(angle) * radius * ratio] as const;
  };
  const ring = (ratio: number) => data.map((_, i) => point(i, ratio).map((n) => n.toFixed(1)).join(",")).join(" ");
  const shape = data.map((d, i) => point(i, d.value / max).map((n) => n.toFixed(1)).join(",")).join(" ");

  return (
    <div ref={ref} className="relative" style={{ height: HEIGHT }}>
      {width > 0 && (
        <svg width={width} height={HEIGHT} role="img" aria-label={caption} className="block">
          {[0.25, 0.5, 0.75, 1].map((r) => (
            <polygon key={r} points={ring(r)} fill="none" className="stroke-grid" strokeWidth={1} />
          ))}
          {data.map((_, i) => {
            const [px, py] = point(i, 1);
            return <line key={i} x1={cx} y1={cy} x2={px} y2={py} className="stroke-grid" strokeWidth={1} />;
          })}

          <motion.g style={{ transformOrigin: `${cx}px ${cy}px` }} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 70, damping: 14, delay: 0.2 }}>
            <polygon points={shape} className="fill-chart" opacity={0.1} />
            <polygon points={shape} fill="none" className="stroke-chart" strokeWidth={2} strokeLinejoin="round" />
            {data.map((d, i) => {
              const [px, py] = point(i, d.value / max);
              return <circle key={i} cx={px} cy={py} r={active === i ? 6 : 4.5} className="fill-chart stroke-card" strokeWidth={2} />;
            })}
          </motion.g>

          {data.map((d, i) => {
            const [lx, ly] = point(i, 1.2);
            const [hx, hy] = point(i, d.value / max);
            return (
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
                <circle cx={hx} cy={hy} r={14} fill="transparent" />
                <text x={lx} y={ly - 2} textAnchor="middle" className={`text-[11px] ${active === i ? "fill-ink" : "fill-muted"} font-semibold`}>
                  {d.label}
                </text>
                <text x={lx} y={ly + 11} textAnchor="middle" className="fill-ink text-[11px] font-semibold tabular-nums">
                  {d.value}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      {active !== null &&
        (() => {
          const [px, py] = point(active, data[active].value / max);
          return <ChartTooltip x={px} y={py} value={data[active].value} label={data[active].label} unit={unit} />;
        })()}
      <DataTable caption={caption} data={data} unit={unit} />
    </div>
  );
}
