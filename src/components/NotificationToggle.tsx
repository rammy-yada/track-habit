"use client";

import { useEffect, useState } from "react";
import { disablePush, enablePush, pushState, type PushState } from "@/lib/pwa";

/**
 * Turns notifications on or off for this device: habit reminders at the time
 * set on each habit, a line of motivation each morning, and an evening nudge
 * during the Winter Arc.
 */
export function NotificationToggle({ publicKey, tone = "theme" }: { publicKey: string | null; tone?: "theme" | "quiet" }) {
  const [state, setState] = useState<PushState | "loading">("loading");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    pushState().then(setState, () => setState("unsupported"));
  }, []);

  const note = "text-[13px] leading-relaxed text-muted";
  if (!publicKey) return tone === "quiet" ? null : <p className={note}>Notifications aren&apos;t set up on this site yet.</p>;
  if (state === "loading") return <div className="skeleton h-11 w-48" />;
  if (state === "needs-install")
    return (
      <p className={note}>
        <span className="font-semibold text-ink">Notifications on iPhone:</span> first add HabitFlow to your Home Screen (Share → Add to Home Screen), open it from there, then come back here.
      </p>
    );
  if (state === "unsupported") return <p className={note}>This browser can&apos;t show notifications from HabitFlow. On a phone, install the app first; on a computer, they work on the live (https) site.</p>;
  if (state === "blocked") return <p className={note}>Notifications are blocked for this site. Allow them in your browser&apos;s site settings, then reload.</p>;

  const on = state === "on";
  async function toggle() {
    setBusy(true);
    try {
      setState(on ? await disablePush() : await enablePush(publicKey!));
    } catch {
      setState(await pushState().catch(() => "unsupported" as const));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" role="switch" aria-checked={on} onClick={toggle} disabled={busy} className="flex w-full items-center gap-3 text-left disabled:opacity-60">
        <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-brand-solid" : "bg-line"}`}>
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-card shadow transition-all ${on ? "left-6" : "left-1"}`} />
        </span>
        <span className="text-sm">
          <span className="block font-semibold text-ink">{busy ? "One moment…" : on ? "Notifications are on" : "Turn on notifications"}</span>
          <span className="block text-[13px] text-muted">Habit reminders, a morning quote, and an evening nudge during the Winter Arc.</span>
        </span>
      </button>
    </div>
  );
}
