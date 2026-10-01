"use client";

import { useEffect } from "react";
import { MotionConfig } from "motion/react";
import { startPwa } from "@/lib/pwa";

// reducedMotion="user": people who ask their OS for less motion get fades
// instead of movement, everywhere, without each component having to check.
export function Providers({ children }: { children: React.ReactNode }) {
  // Registers the service worker and starts listening for the install prompt.
  useEffect(startPwa, []);
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
