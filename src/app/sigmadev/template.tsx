"use client";

import { motion } from "motion/react";

// A template re-mounts on every navigation (a layout doesn't), which makes it
// the right place for a page-enter transition.
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, ease: [0.2, 0.7, 0.2, 1] }}>
      {children}
    </motion.div>
  );
}
