"use client";

import { AnimatePresence, motion } from "motion/react";

/** Inline form feedback. Errors arrive with a short shake so they get noticed. */
export function Alert({ kind, children, shakeKey }: { kind: "error" | "success"; children?: React.ReactNode; shakeKey?: unknown }) {
  return (
    <AnimatePresence initial={false}>
      {children ? (
        <motion.div
          key={String(shakeKey ?? kind)}
          role={kind === "error" ? "alert" : "status"}
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: "auto", marginBottom: 16, x: kind === "error" ? [0, -7, 7, -4, 4, 0] : 0 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.32 }}
          className="overflow-hidden"
        >
          <div className={`rounded-xl px-3.5 py-2.5 text-[13px] font-medium ${kind === "error" ? "bg-bad-soft text-bad" : "bg-good-soft text-good"}`}>{children}</div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
