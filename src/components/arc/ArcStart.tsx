"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { applyThemeSlowly } from "@/components/ArcTheme";
import { NotificationToggle } from "@/components/NotificationToggle";
import { btnGhost, btnPrimary, card } from "@/components/ui/styles";
import { startArc } from "@/lib/actions/arc";
import type { IntroConfig } from "@/lib/arc-config";
import { whenOnline } from "@/lib/offline";
import { WORKOUT_CATEGORIES, WORKOUTS } from "@/lib/workouts";
import { ArcIntro, replayArcIntro } from "./ArcIntro";

type Props = {
  firstName: string;
  season: { range: string; totalDays: number; day: number; live: boolean; startsIn: number };
  existing: string[];
  images: { before: string | null; after: string | null };
  pushKey: string | null;
  /** The ready-made habit packs an admin has set up (may be empty). */
  packs: { id: number; name: string; icon: string; tagline: string; habits: { name: string; icon: string }[] }[];
  intro: IntroConfig & { soundUrl: string | null };
};

const STEPS = ["Choose your pack", "Reminders", "Begin"];
// ticked for you to begin with: the three most people start on
const SUGGESTED = ["steps-10k", "water-3l", "sleep-11"];

/**
 * Joining the Winter Arc, one step at a time: choose habits → reminders →
 * begin. Nothing is saved until the last button. Then the opening scene
 * plays, and as it ends the account slowly takes on the Winter Arc look.
 */
export function ArcStart({ firstName, season, existing, images, pushKey, packs, intro }: Props) {
  const router = useRouter();
  const have = new Set(existing.map((name) => name.toLowerCase()));
  const [step, setStep] = useState(0);
  // with packs on offer the pack is the starting point; the suggested extras are only pre-ticked without one
  const [packId, setPackId] = useState<number | null>(packs[0]?.id ?? null);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(packs.length ? [] : SUGGESTED.filter((id) => !have.has(WORKOUTS.find((w) => w.id === id)!.name.toLowerCase()))));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const pack = packs.find((p) => p.id === packId) ?? null;
  const fromPack = pack ? pack.habits.filter((h) => !have.has(h.name.toLowerCase())).length : 0;
  const total = existing.length + picked.size + fromPack;

  const toggle = (id: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  function begin() {
    setError(null);
    startTransition(async () => {
      const result = await whenOnline(() => startArc(packId, [...picked]));
      if (!result.ok) return setError(result.error);
      replayArcIntro(); // the opening scene; onIntroDone runs when it ends
    });
  }

  const onIntroDone = useCallback(() => {
    applyThemeSlowly("arc");
    router.push("/arc");
  }, [router]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Winter Arc · {season.range}</p>
      <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">{step === 0 ? `${firstName}, choose your ${packs.length ? "pack" : "habits"}` : step === 1 ? "Stay on track" : "Ready?"}</h1>

      {/* progress: three segments that fill as you go */}
      <ol className="mt-5 grid grid-cols-3 gap-2" aria-label="Steps">
        {STEPS.map((name, i) => (
          <li key={name} aria-current={i === step ? "step" : undefined}>
            <div className="h-1 overflow-hidden rounded-full bg-line">
              <motion.div className="h-full bg-brand-solid" initial={false} animate={{ width: i <= step ? "100%" : "0%" }} transition={{ duration: 0.4 }} />
            </div>
            <div className={`mt-1.5 text-[11px] font-semibold ${i === step ? "text-ink" : "text-muted"}`}>
              {i + 1}. {name}
            </div>
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }} className="mt-7">
          {step === 0 && (
            <div className="space-y-6">
              <p className="text-sm leading-relaxed text-muted">These are what you&apos;ll tick off each day. Start with a few you will really do — you can add, change or remove habits at any time.</p>
              {existing.length > 0 && (
                <p className="rounded-xl bg-raised px-4 py-3 text-[13px] text-muted">
                  <span className="font-semibold text-ink">Already yours:</span> {existing.join(", ")}
                </p>
              )}
              {packs.length > 0 && (
                <fieldset>
                  <legend className="mb-1 text-sm font-bold">❄️ Winter Arc packs</legend>
                  <p className="mb-3 text-[13px] text-muted">Pick one. Its habits are created for you and kept in their own Winter Arc section; finish them all in a day to open a surprise.</p>
                  <div className="space-y-2.5" role="radiogroup" aria-label="Winter Arc pack">
                    {packs.map((p) => {
                      const on = p.id === packId;
                      return (
                        <motion.button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => setPackId(p.id)} whileTap={{ scale: 0.98 }} className={`block w-full rounded-2xl border p-4 text-left transition-colors ${on ? "border-brand bg-brand-soft" : "border-line bg-card"}`} data-pack={p.name}>
                          <span className="flex items-start gap-3">
                            <span className="text-2xl" aria-hidden>
                              {p.icon}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-bold">{p.name}</span>
                              {p.tagline && <span className="block text-xs text-muted">{p.tagline}</span>}
                            </span>
                            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-xs font-bold ${on ? "border-brand bg-brand-solid text-on-brand" : "border-line text-transparent"}`}>✓</span>
                          </span>
                          <span className="mt-3 flex flex-wrap gap-1.5">
                            {p.habits.map((h) => (
                              <span key={h.name} className="rounded-full bg-raised px-2.5 py-1 text-[11px] font-medium text-muted">
                                {h.icon} {h.name}
                              </span>
                            ))}
                          </span>
                        </motion.button>
                      );
                    })}
                    <button type="button" role="radio" aria-checked={packId === null} onClick={() => setPackId(null)} className={`block w-full rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${packId === null ? "border-brand bg-brand-soft" : "border-line bg-card text-muted"}`}>
                      No pack — I&apos;ll choose my own habits below
                    </button>
                  </div>
                  <p className="mb-1 mt-7 text-sm font-bold">Extras (optional)</p>
                  <p className="text-[13px] text-muted">Anything you tick here is added to your ordinary habits.</p>
                </fieldset>
              )}
              {WORKOUT_CATEGORIES.map((category) => (
                <fieldset key={category.id}>
                  <legend className="mb-2 text-sm font-bold">
                    <span aria-hidden>{category.icon}</span> {category.label}
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {WORKOUTS.filter((w) => w.category === category.id).map((workout) => {
                      const mine = have.has(workout.name.toLowerCase());
                      const on = mine || picked.has(workout.id);
                      return (
                        <motion.button
                          key={workout.id}
                          type="button"
                          disabled={mine}
                          aria-pressed={on}
                          onClick={() => toggle(workout.id)}
                          whileTap={{ scale: 0.97 }}
                          className={`flex min-h-[56px] items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors ${on ? "border-brand bg-brand-soft" : "border-line bg-card"} ${mine ? "opacity-60" : ""}`}
                        >
                          <span className="text-xl" aria-hidden>
                            {workout.icon}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{workout.name}</span>
                            <span className="block text-[11px] text-muted">
                              {workout.minutes} min · {mine ? "already yours" : workout.level}
                            </span>
                          </span>
                          <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-xs font-bold ${on ? "border-brand bg-brand-solid text-on-brand" : "border-line text-transparent"}`}>✓</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-muted">The people who finish are the ones who get reminded. Both of these are optional, and you can change them in Profile.</p>
              <div className={`${card} p-5`}>
                <NotificationToggle publicKey={pushKey} />
              </div>
              <div className={`${card} p-5 text-[13px] leading-relaxed text-muted`}>
                <span className="font-semibold text-ink">Email reminder.</span> One email at 7 PM your time, only on days you still have habits open. Every email has a link to turn them off.
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className={`${card} divide-y divide-line`}>
                {[
                  ["Season", season.live ? `${season.range} — day ${season.day} of ${season.totalDays}` : `${season.range} — starts in ${season.startsIn} days`],
                  ...(pack ? [["Your pack", `${pack.icon} ${pack.name} · ${pack.habits.length} habits`]] : []),
                  ["Your habits", `${total} to tick each day`],
                  ["Points", "10 per habit, up to 5 habits a day"],
                  ["Leaderboard", "Shows your first name, last initial, username and photo"],
                ].map(([name, value]) => (
                  <div key={name} className="flex items-baseline justify-between gap-4 px-5 py-3.5 text-sm">
                    <span className="text-muted">{name}</span>
                    <span className="text-right font-semibold">{value}</span>
                  </div>
                ))}
              </div>
              <p className="text-[13px] leading-relaxed text-muted">
                When you begin, your account takes on the Winter Arc look. You can leave the arc at any time from its screen. See the{" "}
                <Link href="/privacy" className="font-semibold text-brand hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {error && (
        <p role="alert" className="mt-5 rounded-xl bg-bad-soft px-3.5 py-2.5 text-[13px] font-medium text-bad">
          {error}
        </p>
      )}

      {/* stays within reach of a thumb on phones */}
      <div className="sticky bottom-[74px] z-10 -mx-4 mt-8 flex items-center gap-3 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur md:bottom-0 md:mx-0 md:px-0">
        {step > 0 ? (
          <button type="button" className={btnGhost} onClick={() => setStep(step - 1)} disabled={pending}>
            Back
          </button>
        ) : (
          <Link href="/dashboard" className={`${btnGhost} border-transparent text-muted`}>
            Not now
          </Link>
        )}
        <span className="flex-1 text-right text-xs font-medium text-muted">{step === 0 && `${total} habit${total === 1 ? "" : "s"} chosen`}</span>
        {step < 2 ? (
          <button type="button" className={btnPrimary} onClick={() => setStep(step + 1)} disabled={step === 0 && total === 0}>
            Continue
          </button>
        ) : (
          <motion.button type="button" className={`${btnPrimary} px-6`} onClick={begin} disabled={pending} whileTap={{ scale: 0.96 }}>
            {pending ? "Starting…" : "Begin the Winter Arc"}
          </motion.button>
        )}
      </div>

      <ArcIntro firstName={firstName} images={images} totalDays={season.totalDays} onDone={onIntroDone} auto={false} config={intro} />
    </div>
  );
}
