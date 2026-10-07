"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { motion } from "motion/react";
import { ArcSurprise, surpriseSeen } from "@/components/dashboard/ArcSurprise";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { btnSmall, card, eyebrow } from "@/components/ui/styles";
import { choosePack } from "@/lib/actions/arc";
import { MILESTONES } from "@/lib/arc-config";
import type { getArcPanel } from "@/lib/arc-packs";
import { resolveDone, setDone, settle, useOfflineQueue, whenOnline } from "@/lib/offline";

type Panel = Awaited<ReturnType<typeof getArcPanel>>;

/**
 * Winter Arc members only: the pack they are on, today's progress through it,
 * and the badges earned for perfect days. Someone who joined before choosing
 * a pack picks one here.
 */
export function ArcPackPanel({ panel }: { panel: Panel }) {
  const { pack, packs, perfectDays } = panel;
  // ticks made here go through the same on-device queue as the Today screen, so they show at once and work offline
  const queue = useOfflineQueue();
  const habits = panel.habits.map((h) => ({ ...h, doneToday: resolveDone(queue, h.id, panel.today, h.doneToday) }));
  useEffect(() => {
    for (const h of panel.habits) settle(h.id, panel.today, h.doneToday);
  }, [panel.habits, panel.today, queue]);
  const [choosing, setChoosing] = useState(pack === null);
  const [swapTo, setSwapTo] = useState<Panel["packs"][number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const done = habits.filter((h) => h.doneToday).length;
  const next = MILESTONES.find((m) => m.days > perfectDays);

  // The day's gift: it pops up by itself once, at the moment the last habit
  // is ticked here, and can be reopened from the line under the list.
  const allDone = panel.live && habits.length > 0 && done === habits.length;
  const [surprise, setSurprise] = useState(false);
  const closeSurprise = useCallback(() => setSurprise(false), []);
  const ticked = useRef(false);
  const wasAllDone = useRef(allDone);
  useEffect(() => {
    if (allDone && !wasAllDone.current && ticked.current && !surpriseSeen(panel.today)) {
      const timer = setTimeout(() => setSurprise(true), 900); // let the tick land first
      wasAllDone.current = allDone;
      return () => clearTimeout(timer);
    }
    wasAllDone.current = allDone;
  }, [allDone, panel.today]);

  function choose(id: number) {
    setError(null);
    startTransition(async () => {
      const result = await whenOnline(() => choosePack(id));
      if (result.ok) setChoosing(false);
      else setError(result.error);
    });
  }

  if (packs.length === 0 && !pack) return null; // no packs set up: nothing to show

  return (
    <section className={`${card} p-5`} aria-label="Your Winter Arc pack" data-arc-panel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={eyebrow}>Members only</p>
          <h2 className="font-display text-lg font-bold tracking-tight">{pack ? `${pack.icon} ${pack.name} pack` : "Choose your pack"}</h2>
        </div>
        {pack && packs.length > 1 && (
          <button type="button" className={btnSmall} onClick={() => setChoosing((v) => !v)} aria-expanded={choosing}>
            {choosing ? "Close" : "Change pack"}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-bad-soft px-3.5 py-2.5 text-[13px] font-medium text-bad">
          {error}
        </p>
      )}

      {pack && !choosing && (
        <>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
              <motion.div className="h-full rounded-full bg-brand-solid" initial={{ width: 0 }} animate={{ width: habits.length ? `${(done / habits.length) * 100}%` : 0 }} transition={{ duration: 0.8, ease: "easeOut" }} />
            </div>
            <span className="text-sm font-bold tabular-nums">
              {done}/{habits.length} <span className="text-xs font-medium text-muted">today</span>
            </span>
          </div>
          <ul className="mt-3 space-y-2">
            {habits.map((h) => (
              <li key={h.id}>
                <motion.button type="button" role="checkbox" aria-checked={h.doneToday} whileTap={{ scale: 0.98 }} onClick={() => {
                  ticked.current = true;
                  setDone(h.id, panel.today, !h.doneToday);
                }} className={`flex min-h-[54px] w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors ${h.doneToday ? "border-transparent bg-good-soft" : "border-line bg-card"}`} data-pack-habit={h.name}>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 text-sm font-bold transition-colors ${h.doneToday ? "border-good bg-good text-white" : "border-line text-transparent"}`}>✓</span>
                  <span aria-hidden className="text-lg">
                    {h.icon}
                  </span>
                  <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${h.doneToday ? "text-good line-through" : ""}`}>{h.name}</span>
                  <span className="text-[11px] font-semibold text-muted">{h.doneToday ? "+10" : ""}</span>
                </motion.button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            {done === habits.length && habits.length > 0 ? (
              <>
                All done for today. 🎉{" "}
                {panel.live && (
                  <button type="button" onClick={() => setSurprise(true)} className="font-semibold text-brand hover:underline">
                    Open today&apos;s surprise
                  </button>
                )}
              </>
            ) : (
              "Tap a habit when it's done. It works offline too, and counts once it syncs."
            )}
          </p>

          {/* badges for perfect days: every habit of the pack done */}
          <div className="mt-6 border-t border-line pt-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-bold">Badges</h3>
              <span className="text-xs text-muted">
                {perfectDays} perfect {perfectDays === 1 ? "day" : "days"}
                {next && ` · ${next.days - perfectDays} to “${next.title}”`}
              </span>
            </div>
            <ul className="mt-3 grid grid-cols-5 gap-2">
              {MILESTONES.map((m) => {
                const earned = perfectDays >= m.days;
                return (
                  <li key={m.days} title={`${m.title} — ${m.days} perfect ${m.days === 1 ? "day" : "days"}`} className={`rounded-xl border px-1 py-2 text-center ${earned ? "border-brand bg-brand-soft" : "border-line opacity-45"}`} data-earned={earned}>
                    <div className={`text-xl leading-none ${earned ? "" : "grayscale"}`} aria-hidden>
                      {earned ? m.icon : "🔒"}
                    </div>
                    <div className="mt-1 truncate text-[10px] font-semibold">{earned ? m.title : `${m.days}d`}</div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      {choosing && (
        <div className="mt-4 space-y-2.5">
          <p className="text-sm text-muted">{pack ? "Switching replaces the old pack's habits on your checklist with the new pack's. Your past check-ins are kept." : "Pick one and its habits are added to your checklist, in their own Winter Arc section."}</p>
          {packs.map((p) => (
            <div key={p.id} className={`rounded-2xl border p-4 ${p.id === pack?.id ? "border-brand bg-brand-soft" : "border-line"}`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden>
                  {p.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{p.name}</div>
                  {p.tagline && <p className="text-xs text-muted">{p.tagline}</p>}
                  <p className="mt-2 text-xs leading-relaxed text-muted">{p.habits.join(" · ")}</p>
                </div>
                {p.id === pack?.id ? (
                  <span className="text-xs font-bold text-brand">Yours</span>
                ) : (
                  <button type="button" className={btnSmall} disabled={pending} onClick={() => (pack ? setSwapTo(p) : choose(p.id))}>
                    {pending ? "…" : "Choose"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={swapTo !== null}
        title="Switch pack?"
        body={`Your "${pack?.name ?? ""}" habits leave your checklist and "${swapTo?.name ?? ""}" takes their place. Past check-ins are kept, but perfect days are counted on the new pack from now on.`}
        confirmLabel="Switch"
        onConfirm={() => swapTo && choose(swapTo.id)}
        onClose={() => setSwapTo(null)}
      />
      <ArcSurprise open={surprise} onClose={closeSurprise} today={panel.today} perfectDays={panel.perfectBefore + (allDone ? 1 : 0)} surprises={panel.surprises} />
    </section>
  );
}
