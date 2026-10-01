"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { HABIT_COLORS } from "@/lib/constants";

/** Sparks thrown out from a checkbox the moment a habit is ticked off. */
export function Burst({ color }: { color: string }) {
  const sparks = 10;
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
      <motion.span
        className="absolute h-7 w-7 rounded-full border-2"
        style={{ borderColor: color }}
        initial={{ scale: 0.6, opacity: 0.8 }}
        animate={{ scale: 2.6, opacity: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      />
      {Array.from({ length: sparks }, (_, i) => {
        const angle = (Math.PI * 2 * i) / sparks + 0.3;
        const distance = i % 2 ? 26 : 34;
        return (
          <motion.span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full"
            style={{ background: color }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{ x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, scale: 0, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.1, 0.8, 0.3, 1] }}
          />
        );
      })}
    </span>
  );
}

/** A short confetti fall for finishing every habit of the day. */
export function Confetti() {
  // Random layout is generated once, on the client, when the celebration starts.
  const [pieces] = useState(() =>
    Array.from({ length: 44 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.35,
      duration: 1.7 + Math.random() * 1.3,
      rotate: (Math.random() - 0.5) * 900,
      drift: (Math.random() - 0.5) * 160,
      color: HABIT_COLORS[i % HABIT_COLORS.length],
      wide: i % 3 === 0,
    })),
  );
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className={`absolute top-0 block ${p.wide ? "h-2 w-3.5" : "h-2.5 w-2"} rounded-[2px]`}
          style={{ left: `${p.left}%`, background: p.color }}
          initial={{ y: "-5vh", x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: "105vh", x: p.drift, rotate: p.rotate, opacity: [1, 1, 0.9, 0] }}
          transition={{ duration: p.duration, delay: p.delay, ease: [0.3, 0.1, 0.7, 1] }}
        />
      ))}
    </div>
  );
}

export function Flame({ lit, size = 16 }: { lit: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={lit ? "flame text-flame" : "text-line"}>
      <path
        fill="currentColor"
        d="M12 2c.6 3.4 3.2 4.8 4.600 7.300A7.200 7.200 0 0 1 12 22a7.200 7.200 0 0 1-5.700-11.600c.7 1 1.500 1.600 2.500 1.800C8.200 8.300 9.700 4.600 12 2z"
      />
    </svg>
  );
}
