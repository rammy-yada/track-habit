"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";

/** Counts up to its value on load and rolls to the new one whenever it changes. */
export function AnimatedNumber({ value, format }: { value: number; format?: (n: number) => string }) {
  const reduced = useReducedMotion();
  const target = useMotionValue(0);
  const spring = useSpring(target, { stiffness: 110, damping: 22, mass: 0.8 });
  const text = useTransform(spring, (v) => (format ? format(v) : Math.round(v).toLocaleString("en-US")));

  useEffect(() => {
    target.set(value);
  }, [target, value]);

  if (reduced) return <span>{format ? format(value) : value.toLocaleString("en-US")}</span>;
  return <motion.span>{text}</motion.span>;
}
