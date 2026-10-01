"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FlowField } from "@/components/FlowField";
import { Logo } from "@/components/Logo";
import { MOTTOS } from "@/lib/constants";

/** Left half of the sign-in screens: the flow field with a slowly rotating motto. */
export function AuthAside() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % MOTTOS.length), 4200);
    return () => clearInterval(timer);
  }, []);

  return (
    <aside className="relative hidden overflow-hidden border-r border-line bg-card lg:flex lg:w-[46%] lg:flex-col lg:justify-between lg:p-12">
      <FlowField className="absolute inset-0" />
      <div className="relative">
        <Logo size="lg" />
      </div>
      <div className="relative min-h-[9rem]">
        <AnimatePresence mode="wait">
          <motion.p key={index} className="max-w-md font-display text-4xl font-bold leading-[1.1] tracking-tight" aria-live="polite">
            {/* each word rises on its own, a beat after the previous one */}
            {MOTTOS[index].split(" ").map((word, i) => (
              <span key={i} className="inline-block overflow-hidden pb-1 align-bottom">
                <motion.span className="mr-[0.25em] inline-block" initial={{ y: "110%" }} animate={{ y: 0 }} exit={{ y: "-110%" }} transition={{ duration: 0.5, delay: i * 0.06, ease: [0.2, 0.7, 0.2, 1] }}>
                  {word}
                </motion.span>
              </span>
            ))}
          </motion.p>
        </AnimatePresence>
      </div>
    </aside>
  );
}
