"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { APP_NAME } from "@/lib/constants";

/** The pulse line draws itself on load and again whenever it's hovered. */
export function Logo({ href = "/", size = "md" }: { href?: string; size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-10 w-10 rounded-xl" : "h-8 w-8 rounded-lg";
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5 text-ink">
      <motion.span className={`grid ${box} place-items-center bg-brand-soft text-brand`} initial="idle" animate="drawn" whileHover="replay">
        <svg width={size === "lg" ? 24 : 20} height={size === "lg" ? 24 : 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <motion.path
            d="M2 12h4l3-9 6 18 3-9h4"
            variants={{
              idle: { pathLength: 0, opacity: 0 },
              drawn: { pathLength: 1, opacity: 1, transition: { duration: 1.1, ease: "easeInOut" } },
              replay: { pathLength: [0, 1], opacity: 1, transition: { duration: 0.8, ease: "easeInOut" } },
            }}
          />
        </svg>
      </motion.span>
      <span className={`font-display font-bold tracking-tight ${size === "lg" ? "text-2xl" : "text-lg"}`}>{APP_NAME}</span>
    </Link>
  );
}
