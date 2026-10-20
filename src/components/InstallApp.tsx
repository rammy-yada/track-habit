"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { btnGhost, btnPrimary } from "@/components/ui/styles";
import { detectDevice, promptInstall, useCanInstall, type Device } from "@/lib/pwa";

const DISMISS_KEY = "habitflow:install-dismissed"; // when the banner was last closed

const ShareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
  </svg>
);
const AddIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

/** The steps for this device, when the browser can't install with one tap. */
function steps(device: Device): { title: string; lines: { icon: React.ReactNode; text: React.ReactNode }[]; note?: string } {
  const b = (text: string) => <span className="font-semibold text-ink">{text}</span>;
  if (device.browser === "in-app")
    return {
      title: "Open in your browser first",
      lines: [
        { icon: "1", text: <>Tap the {b("⋯")} or {b("⋮")} menu of this app (top right).</> },
        { icon: "2", text: <>Choose {b(device.platform === "ios" ? "Open in Safari" : "Open in browser")}.</> },
        { icon: "3", text: <>Then tap {b("Install app")} on the HabitFlow page.</> },
      ],
      note: "Apps like Instagram, Facebook and TikTok open links in their own small browser, which can't install apps.",
    };
  if (device.platform === "ios" && device.browser === "safari")
    return {
      title: "Add HabitFlow to your Home Screen",
      lines: [
        { icon: <ShareIcon />, text: <>Tap {b("Share")} in Safari's bar at the bottom of the screen (on iPad, top right). On newer iPhones, tap {b("⋯")} first, then {b("Share")}.</> },
        { icon: <AddIcon />, text: <>Scroll down and tap {b("Add to Home Screen")}.</> },
        { icon: "✓", text: <>Tap {b("Add")}. HabitFlow opens full screen, like any app.</> },
      ],
      note: "Apple only lets iPhone users add web apps themselves — it takes three taps, once.",
    };
  if (device.platform === "ios")
    return {
      title: "Add HabitFlow to your Home Screen",
      lines: [
        { icon: <ShareIcon />, text: <>Tap {b("Share")} in the address bar (top right).</> },
        { icon: <AddIcon />, text: <>Tap {b("Add to Home Screen")}.</> },
        { icon: "✓", text: <>Tap {b("Add")}.</> },
      ],
      note: "If you don't see it, open this page in Safari and use Share → Add to Home Screen.",
    };
  if (device.platform === "android")
    return {
      title: "Install HabitFlow",
      lines:
        device.browser === "samsung"
          ? [
              { icon: "≡", text: <>Tap the {b("≡")} menu at the bottom.</> },
              { icon: <AddIcon />, text: <>Tap {b("Add page to")} → {b("Home screen")}.</> },
            ]
          : [
              { icon: "⋮", text: <>Tap the browser's {b("⋮")} menu (top right).</> },
              { icon: <AddIcon />, text: <>Tap {b("Install app")} or {b("Add to Home screen")}.</> },
            ],
      note: "In Chrome the install button appears here by itself after a few seconds on the site.",
    };
  return {
    title: "Install HabitFlow",
    lines: [
      { icon: <AddIcon />, text: <>In {b("Chrome")} or {b("Edge")}: click the install icon at the right end of the address bar.</> },
      { icon: <ShareIcon />, text: <>In {b("Safari")} on a Mac: {b("File → Add to Dock")}.</> },
    ],
  };
}

/**
 * "Install app", everywhere it is offered. Where the browser allows it
 * (Android, Chrome, Edge) one tap opens the real install dialog. Where it
 * doesn't (iPhone, in-app browsers, some Android browsers) the same tap opens
 * a short sheet with the exact steps for that device. Hidden once installed.
 *
 * variant — "pill": a small button for a header; "banner": a card fixed to the
 * bottom of a phone screen, which can be closed for a week; "button": a plain
 * button (Profile, the welcome guide).
 */
export function InstallApp({ variant = "button", label = "Install app" }: { variant?: "pill" | "banner" | "button"; label?: string }) {
  const canInstall = useCanInstall();
  const [device, setDevice] = useState<Device | null>(null);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [hidden, setHidden] = useState(true); // the banner: until we know it wasn't closed recently
  useEffect(() => {
    setDevice(detectDevice());
    try {
      setHidden(Date.now() - Number(localStorage.getItem(DISMISS_KEY) ?? 0) < 7 * 86_400_000);
    } catch {
      setHidden(false);
    }
    const installed = () => setDone(true);
    window.addEventListener("appinstalled", installed);
    return () => window.removeEventListener("appinstalled", installed);
  }, []);

  if (!device || device.installed) return null;
  if (done) return variant === "banner" ? null : <p className="text-[13px] font-medium text-good">✓ Installed — open HabitFlow from your home screen.</p>;

  async function install() {
    if (canInstall) {
      if (await promptInstall()) setDone(true);
      return;
    }
    setOpen(true);
  }
  const how = steps(device);

  const sheet = (
    <Modal open={open} onClose={() => setOpen(false)} title={how.title} width="max-w-sm">
      <ol className="space-y-3" data-install-steps>
        {how.lines.map((line, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-sm font-bold text-brand">{line.icon}</span>
            <span className="pt-1.5 text-sm leading-relaxed text-muted">{line.text}</span>
          </li>
        ))}
      </ol>
      {how.note && <p className="mt-4 rounded-xl bg-raised px-3.5 py-2.5 text-xs leading-relaxed text-muted">{how.note}</p>}
      {device.browser === "in-app" && (
        <button type="button" className={`${btnGhost} mt-3 w-full`} onClick={() => void navigator.clipboard?.writeText(location.href).catch(() => {})}>
          Copy link
        </button>
      )}
      <button type="button" className={`${btnPrimary} mt-4 w-full`} onClick={() => setOpen(false)}>
        Got it
      </button>
    </Modal>
  );

  if (variant === "pill")
    return (
      <>
        <button type="button" onClick={install} className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-ink hover:border-brand hover:text-brand" data-install="pill">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
          </svg>
          {label}
        </button>
        {sheet}
      </>
    );

  if (variant === "banner") {
    if (hidden || device.platform === "desktop") return null;
    const close = () => {
      setHidden(true);
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      } catch {}
    };
    return (
      <>
        <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-40 flex items-center gap-3 rounded-2xl border border-line bg-card/95 p-3 shadow-2xl backdrop-blur md:hidden" data-install="banner">
          {/* eslint-disable-next-line @next/next/no-img-element -- the app's own icon */}
          <img src="/app-icon/logo?s=96" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Get the HabitFlow app</p>
            <p className="truncate text-xs text-muted">Free · works offline · reminders</p>
          </div>
          <button type="button" className={`${btnPrimary} shrink-0 px-3.5 py-2`} onClick={install}>
            Install
          </button>
          <button type="button" onClick={close} aria-label="Not now" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:text-ink">
            ✕
          </button>
        </div>
        {sheet}
      </>
    );
  }

  return (
    <>
      <button type="button" onClick={install} className={btnPrimary} data-install="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
        </svg>
        {label}
      </button>
      {sheet}
    </>
  );
}
