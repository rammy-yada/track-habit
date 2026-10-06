"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAppPrefs } from "@/lib/actions/profile";
import { whenOnline } from "@/lib/offline";

export type Prefs = { motivation: number; comeback: boolean; care: boolean; appIcon: "auto" | "classic" | "arc" };

const MOTIVATION = [
  { value: 0, label: "Off", note: "No motivation messages. Reminders you set on a habit still arrive." },
  { value: 1, label: "1 a day", note: "A quote each morning." },
  { value: 2, label: "2 a day", note: "The morning quote, and one in the afternoon if habits are still open." },
  { value: 3, label: "3 a day", note: "Morning, midday and late afternoon — the later ones only while habits are still open." },
];

const ICONS = [
  { value: "auto", label: "Automatic", note: "Winter Arc icon while you're in the arc", src: null },
  { value: "classic", label: "HabitFlow", note: "The blue icon, always", src: "/icons/icon-192.png" },
  { value: "arc", label: "Winter Arc", note: "The Winter Arc icon, always", src: "/app-icon/arc?s=96" },
] as const;

const BADGE_KEY = "habitflow:icon-badge";
/** Should the number of habits left be shown on the app's icon? (Remembered per device; on unless switched off.) */
export function badgeEnabled(): boolean {
  try {
    return localStorage.getItem(BADGE_KEY) !== "off";
  } catch {
    return true;
  }
}

/**
 * Profile → App: how often motivation arrives, whether to be nudged after
 * days away, which app icon to use, and the number on the icon. Each change
 * is saved as it is made.
 */
export function AppPrefs({ prefs, arcMember }: { prefs: Prefs; arcMember: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(prefs);
  const [badge, setBadge] = useState(true);
  const [canBadge, setCanBadge] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();
  useEffect(() => {
    setBadge(badgeEnabled());
    setCanBadge("setAppBadge" in navigator);
  }, []);

  function save(next: Prefs) {
    const before = value;
    setValue(next);
    setError(null);
    startTransition(async () => {
      const result = await whenOnline(() => updateAppPrefs(next));
      if (!result.ok) {
        setValue(before);
        setError(result.error);
      } else if (next.appIcon !== before.appIcon) router.refresh(); // the page's icon links change with it
    });
  }

  function toggleBadge() {
    const next = !badge;
    setBadge(next);
    try {
      localStorage.setItem(BADGE_KEY, next ? "on" : "off");
    } catch {}
    if (!next) void (navigator as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.().catch(() => {});
  }

  const heading = "text-[13px] font-bold text-ink";
  const autoIcon = arcMember ? "/app-icon/arc?s=96" : "/icons/icon-192.png";

  return (
    <div className={`space-y-5 border-t border-line pt-5 ${saving ? "opacity-80" : ""}`} data-app-prefs>
      {error && (
        <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-[13px] font-medium text-bad">
          {error}
        </p>
      )}

      <fieldset>
        <legend className={heading}>Motivation notifications</legend>
        <div className="mt-2 grid grid-cols-4 gap-1 rounded-xl border border-line p-1" role="radiogroup" aria-label="Motivation notifications a day">
          {MOTIVATION.map((option) => (
            <button key={option.value} type="button" role="radio" aria-checked={value.motivation === option.value} onClick={() => save({ ...value, motivation: option.value })} className={`rounded-lg px-1 py-2 text-xs font-semibold transition-colors ${value.motivation === option.value ? "bg-brand-solid text-on-brand" : "text-muted hover:text-ink"}`}>
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted">{MOTIVATION[value.motivation]?.note}</p>
      </fieldset>

      <Toggle on={value.care} onClick={() => save({ ...value, care: !value.care })} title="Daily care reminders" note="Wake up, drink water (twice), one good thing to do today, and time to sleep. Each arrives at a slightly different time every day." />

      <Toggle on={value.comeback} onClick={() => save({ ...value, comeback: !value.comeback })} title="Nudge me if I stop" note="A message after 2, 4, 7, 14 and 30 days away, then nothing. After a week away the daily messages stop too." />

      <fieldset>
        <legend className={heading}>App icon</legend>
        <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="App icon">
          {ICONS.map((option) => (
            <button key={option.value} type="button" role="radio" aria-checked={value.appIcon === option.value} onClick={() => save({ ...value, appIcon: option.value })} className={`rounded-xl border p-2.5 text-center transition-colors ${value.appIcon === option.value ? "border-brand bg-brand-soft" : "border-line"}`} data-true-color>
              {/* eslint-disable-next-line @next/next/no-img-element -- a small static icon */}
              <img src={option.src ?? autoIcon} alt="" width={44} height={44} className="mx-auto h-11 w-11 rounded-xl" />
              <span className="mt-1.5 block text-xs font-bold">{option.label}</span>
              <span className="block text-[10.5px] leading-tight text-muted">{option.note}</span>
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          <span className="font-semibold text-ink">When does it change?</span> A phone decides this, not the app. Android and computers re-check about once a day when you open the app, and may ask you to confirm. An iPhone never changes an installed icon: remove HabitFlow from the Home Screen and add it again.
        </p>
      </fieldset>

      {canBadge && <Toggle on={badge} onClick={toggleBadge} title="Show habits left on the app icon" note="A small number on the icon: how many of today's habits are still open. It disappears when you're done." />}
    </div>
  );
}

function Toggle({ on, onClick, title, note }: { on: boolean; onClick: () => void; title: string; note: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} className="flex w-full items-start gap-3 text-left">
      <span className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-brand-solid" : "bg-line"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-card shadow transition-all ${on ? "left-6" : "left-1"}`} />
      </span>
      <span className="text-sm">
        <span className="block font-semibold text-ink">{title}</span>
        <span className="block text-[13px] text-muted">{note}</span>
      </span>
    </button>
  );
}
