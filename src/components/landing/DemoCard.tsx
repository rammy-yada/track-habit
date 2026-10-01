"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Burst, Flame } from "@/components/dashboard/effects";

const DEMO = [
  { icon: "🏃", name: "Morning run", meta: "Health · 6:30 AM", color: "#10b981", streak: 12 },
  { icon: "📚", name: "Read 30 minutes", meta: "Learning · Daily", color: "#6366f1", streak: 27 },
  { icon: "💧", name: "Drink 2L water", meta: "Health · Daily", color: "#3b82f6", streak: 5 },
];

/**
 * A working miniature of the dashboard. It ticks itself off on a loop until
 * you touch it — then it's yours to click. Tilts toward the cursor.
 */
export function DemoCard() {
  const [done, setDone] = useState([false, false, false]);
  const [bursts, setBursts] = useState<Record<number, number>>({});
  const manual = useRef(false);
  const rotateX = useSpring(useMotionValue(0), { stiffness: 140, damping: 16 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 140, damping: 16 });
  const count = done.filter(Boolean).length;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDone([true, true, false]);
      return;
    }
    const timer = setInterval(() => {
      if (manual.current) return;
      setDone((current) => {
        const next = current.indexOf(false);
        if (next === -1) return [false, false, false];
        setBursts((b) => ({ ...b, [next]: Date.now() }));
        return current.map((v, i) => (i === next ? true : v));
      });
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  function toggle(index: number) {
    manual.current = true;
    if (!done[index]) setBursts((b) => ({ ...b, [index]: Date.now() }));
    setDone((current) => current.map((v, i) => (i === index ? !v : v)));
  }

  return (
    <div
      style={{ perspective: 1100 }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const rect = e.currentTarget.getBoundingClientRect();
        rotateY.set(((e.clientX - rect.left) / rect.width - 0.5) * 12);
        rotateX.set(-((e.clientY - rect.top) / rect.height - 0.5) * 12);
      }}
      onPointerLeave={() => {
        rotateX.set(0);
        rotateY.set(0);
      }}
    >
      <motion.div
        className="rounded-3xl border border-line bg-card/90 p-5 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.35)] backdrop-blur sm:p-6"
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        initial={{ opacity: 0, y: 50, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.7, type: "spring", stiffness: 90, damping: 16 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Today</div>
            <div className="font-display text-xl font-bold tracking-tight">{count === 3 ? "Perfect day 🎉" : `${3 - count} to go`}</div>
          </div>
          <ProgressRing value={count / 3} size={52} stroke={6}>
            <span className="text-[11px] font-bold tabular-nums">{count}/3</span>
          </ProgressRing>
        </div>
        <ul className="space-y-2">
          {DEMO.map((habit, i) => (
            <li key={habit.name} className="relative overflow-hidden rounded-2xl border border-line">
              <motion.span
                aria-hidden
                className="absolute inset-0"
                style={{ background: `color-mix(in srgb, ${habit.color} 10%, transparent)` }}
                initial={false}
                animate={{ clipPath: done[i] ? "circle(150% at 30px 50%)" : "circle(0% at 30px 50%)" }}
                transition={{ duration: done[i] ? 0.7 : 0.3, ease: [0.3, 0.7, 0.2, 1] }}
              />
              <button type="button" onClick={() => toggle(i)} aria-pressed={done[i]} className="relative flex w-full items-center gap-3 px-3.5 py-3 text-left">
                <span className="relative grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition-colors" style={{ borderColor: done[i] ? habit.color : "var(--line)", background: done[i] ? habit.color : "transparent" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={false} animate={{ pathLength: done[i] ? 1 : 0, opacity: done[i] ? 1 : 0 }} transition={{ duration: 0.3 }} />
                  </svg>
                  {bursts[i] && done[i] && <Burst key={bursts[i]} color={habit.color} />}
                </span>
                <span className="text-lg" aria-hidden>
                  {habit.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-semibold transition-colors ${done[i] ? "text-muted line-through" : ""}`}>{habit.name}</span>
                  <span className="block truncate text-[11px] text-muted">{habit.meta}</span>
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold tabular-nums text-muted">
                  <Flame lit size={14} />
                  {habit.streak + (done[i] ? 1 : 0)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}
