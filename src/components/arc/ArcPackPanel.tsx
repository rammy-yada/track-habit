"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { motion } from "motion/react";
import { ArcSurprise, surpriseSeen } from "@/components/dashboard/ArcSurprise";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { btnSmall, card, eyebrow, input } from "@/components/ui/styles";
import { addPackHabit, choosePack, removePackHabit } from "@/lib/actions/arc";
import { MILESTONES } from "@/lib/arc-config";
import type { getArcPanel } from "@/lib/arc-packs";
import { resolveDone, setDone, settle, useOfflineQueue, whenOnline } from "@/lib/offline";

type Panel = Awaited<ReturnType<typeof getArcPanel>>;
const btnPrimarySmall = "inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-solid px-3 py-1.5 text-xs font-semibold text-on-brand transition-colors hover:bg-brand-solid-hover disabled:opacity-50";

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

  // editing the pack
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("✅");
  function run(task: () => Promise<{ ok: true } | { ok: false; error: string }>, then?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await whenOnline(task);
      if (!result.ok) setError(result.error);
      else then?.();
    });
  }

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
        {pack && (
          <div className="flex gap-1.5">
            {!choosing && (
              <button type="button" className={editing ? btnPrimarySmall : btnSmall} onClick={() => setEditing((v) => !v)} aria-expanded={editing} data-edit-pack>
                {editing ? "Done" : "Edit pack"}
              </button>
            )}
            {packs.length > 1 && !editing && (
              <button type="button" className={btnSmall} onClick={() => setChoosing((v) => !v)} aria-expanded={choosing}>
                {choosing ? "Close" : "Change pack"}
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-bad-soft px-3.5 py-2.5 text-[13px] font-medium text-bad">
          {error}
        </p>
      )}

      {/* editing: take habits out, put the pack's own back, or add one of your own */}
      {pack && editing && (
        <div className="mt-4" data-pack-editor>
          <ul className="space-y-2">
            {habits.map((h) => (
              <li key={h.id} className="flex min-h-[50px] items-center gap-3 rounded-xl border border-line px-3.5 py-2">
                <span aria-hidden className="text-lg">
                  {h.icon}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{h.name}</span>
                <button type="button" className={`${btnSmall} hover:!border-bad hover:!text-bad`} disabled={pending || habits.length <= 1} onClick={() => run(() => removePackHabit(h.id))} data-remove-pack-habit>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          {panel.missing.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-muted">Taken out — tap to put back</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {panel.missing.map((m) => (
                  <button key={m.name} type="button" disabled={pending} onClick={() => run(() => addPackHabit(m.name, m.icon))} className="rounded-full border border-dashed border-line px-3 py-1.5 text-xs font-medium text-muted hover:border-brand hover:text-brand">
                    + {m.icon} {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const name = newName.trim();
              if (!name) return;
              run(() => addPackHabit(name, newIcon), () => {
                setNewName("");
                setNewIcon("✅");
              });
            }}
          >
            <input className={`${input} !w-14 flex-none !px-0 text-center text-lg`} value={newIcon} maxLength={4} onChange={(e) => setNewIcon(e.target.value)} aria-label="Icon (an emoji)" name="pack_habit_icon" />
            <input className={`${input} !w-auto min-w-0 flex-1`} value={newName} maxLength={60} onChange={(e) => setNewName(e.target.value)} placeholder="Add your own habit…" aria-label="New habit for your pack" name="pack_habit_name" />
            <button type="submit" className={`${btnPrimarySmall} flex-none px-4`} disabled={pending || !newName.trim()}>
              Add
            </button>
          </form>
          <p className="mt-2 text-xs text-muted">Removing a habit keeps its past check-ins. Perfect days count the habits in your pack on each day.</p>
        </div>
      )}

      {pack && !choosing && !editing && (
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
