"use client";

import { useEffect, useState } from "react";
import { detectDevice, promptInstall, useCanInstall, type Device } from "@/lib/pwa";

/**
 * "Install app". Where the browser can install directly (Android, Chrome,
 * Edge) this is a button; on iPhone, which has no such button, it explains the
 * two taps instead; once installed it just says so.
 */
export function InstallButton() {
  const canInstall = useCanInstall();
  const [device, setDevice] = useState<Device | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => setDevice(detectDevice()), []);
  if (!device) return null;

  const note = "text-[13px] leading-relaxed text-muted";
  if (device.installed || done) return <p className={note}>✓ HabitFlow is installed on this device.</p>;
  if (canInstall) {
    return (
      <button type="button" onClick={async () => setDone(await promptInstall())} className="inline-flex items-center gap-2 rounded-xl bg-brand-solid px-4 py-2.5 text-sm font-semibold text-on-brand hover:bg-brand-solid-hover">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
        </svg>
        Install app
      </button>
    );
  }
  if (!device.secure) return <p className={note}>Installing needs the site to be opened over https.</p>;
  if (device.platform === "ios")
    return (
      <p className={note}>
        <span className="font-semibold text-ink">Install on iPhone:</span> tap the Share button in your browser, then <span className="font-semibold text-ink">Add to Home Screen</span>.
      </p>
    );
  if (device.platform === "android")
    return (
      <p className={note}>
        <span className="font-semibold text-ink">Install:</span> open the browser menu (⋮) and tap <span className="font-semibold text-ink">Install app</span> or <span className="font-semibold text-ink">Add to Home screen</span>.
      </p>
    );
  return (
    <p className={note}>
      <span className="font-semibold text-ink">Install:</span> in Chrome or Edge use the install icon in the address bar; in Safari use File → Add to Dock.
    </p>
  );
}
