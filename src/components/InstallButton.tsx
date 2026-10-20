"use client";

import { useEffect, useState } from "react";
import { InstallApp } from "@/components/InstallApp";
import { detectDevice } from "@/lib/pwa";

/** Profile → "Install the app": the install button, or a note once it is installed. */
export function InstallButton() {
  const [installed, setInstalled] = useState<boolean | null>(null);
  useEffect(() => setInstalled(detectDevice().installed), []);
  if (installed === null) return null;
  if (installed) return <p className="text-[13px] leading-relaxed text-muted">✓ HabitFlow is installed on this device.</p>;
  return <InstallApp />;
}
