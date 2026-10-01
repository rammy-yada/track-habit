"use client";

import { motion } from "motion/react";
import { DataTable, type Datum } from "./shared";

/** Horizontal bars for named categories: label, bar, value at the tip. */
export function BarList({ data, unit, caption }: { data: Datum[]; unit: string; caption: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <ul className="space-y-3">
        {data.map((d, i) => (
          <li key={d.label} className="group grid grid-cols-[minmax(72px,30%)_1fr] items-center gap-3 text-sm" title={`${d.label}: ${d.value} ${unit}`}>
            <span className="truncate text-muted transition-colors group-hover:text-ink">{d.label}</span>
            <span className="flex items-center gap-2">
              <motion.span
                className="h-3.5 min-w-[3px] rounded-r bg-chart"
                initial={{ width: 0 }}
                whileInView={{ width: `${(d.value / max) * 100}%` }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 90, damping: 18, delay: 0.1 + i * 0.07 }}
              />
              <span className="text-xs font-semibold tabular-nums text-ink">{d.value}</span>
            </span>
          </li>
        ))}
      </ul>
      <DataTable caption={caption} data={data} unit={unit} />
    </div>
  );
}
