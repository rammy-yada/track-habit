"use client";

import { AnimatePresence, motion } from "motion/react";
import { btnPrimary } from "./styles";

/** Primary submit button whose label slides out for a spinner while pending. */
export function SubmitButton({ pending, children, pendingLabel = "Working…", className = "" }: { pending: boolean; children: React.ReactNode; pendingLabel?: string; className?: string }) {
  return (
    <motion.button type="submit" disabled={pending} whileTap={{ scale: 0.97 }} className={`${btnPrimary} relative w-full overflow-hidden py-3 ${className}`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={pending ? "pending" : "idle"}
          className="inline-flex items-center gap-2"
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -14, opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          {pending && <span className="h-4 w-4 rounded-full border-2 border-current/40 border-t-current [animation:spin-slow_0.7s_linear_infinite]" />}
          {pending ? pendingLabel : children}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
