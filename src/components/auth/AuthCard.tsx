"use client";

import { motion } from "motion/react";
import { Logo } from "@/components/Logo";

/** Shared frame for login / register / verify. Children fade up in sequence. */
export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <motion.div className="w-full max-w-[420px]" initial="hidden" animate="shown" variants={{ shown: { transition: { staggerChildren: 0.07 } } }}>
      <motion.div variants={item} className="mb-8 lg:hidden">
        <Logo />
      </motion.div>
      <motion.h1 variants={item} className="font-display text-3xl font-bold tracking-tight">
        {title}
      </motion.h1>
      <motion.p variants={item} className="mb-7 mt-1.5 text-sm text-muted">
        {subtitle}
      </motion.p>
      <motion.div variants={item}>{children}</motion.div>
      {footer && (
        <motion.p variants={item} className="mt-6 text-center text-sm text-muted">
          {footer}
        </motion.p>
      )}
    </motion.div>
  );
}

const item = { hidden: { opacity: 0, y: 16 }, shown: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.2, 0.7, 0.2, 1] as const } } };
