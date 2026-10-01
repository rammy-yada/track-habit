"use client";

import { useCallback, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Spotlight } from "@/components/ui/Spotlight";
import { Reveal } from "@/components/ui/Reveal";
import { TrendChart } from "@/components/charts/TrendChart";
import { btnPrimary, card, eyebrow } from "@/components/ui/styles";
import { addPack, removePack } from "@/lib/actions/arc";
import { deleteHabit, saveNote } from "@/lib/actions/habits";
import { resolveDone, setDone, settle, useOfflineQueue, whenOnline } from "@/lib/offline";
import type { Mood } from "@/lib/constants";
import type { getDashboard, HabitView } from "@/lib/data";
import { badgeEnabled } from "@/components/AppPrefs";
import { MILESTONES } from "@/lib/arc-config";
import { ArcSurprise, surpriseSeen } from "./ArcSurprise";
import { Confetti, Flame } from "./effects";
import { HabitRow } from "./HabitRow";
import { Modal } from "@/components/ui/Modal";
import { HabitFormModal, NoteModal } from "./HabitModals";
import { SupportNudge } from "./SupportNudge";

type Op = { type: "remove"; id: number } | { type: "note"; id: number; mood: Mood | null; notes: string };
type Filter = "all" | "pending" | "done";

function reduce(habits: HabitView[], op: Op): HabitView[] {
  if (op.type === "remove") return habits.filter((h) => h.id !== op.id);
  return habits.map((h) => (h.id === op.id ? { ...h, mood: op.mood, notes: op.notes } : h));
}

export function HabitBoard({ data }: { data: Awaited<ReturnType<typeof getDashboard>> }) {
  // A tick is written to the on-device queue first (so it works offline) and
  // shown at once; what you see is the server's data with the queue on top.
  const queue = useOfflineQueue();
  const [optimistic, apply] = useOptimistic(data.habits, reduce);
  const habits = optimistic.map((h) => ({ ...h, doneToday: resolveDone(queue, h.id, data.today, h.doneToday) }));
  useEffect(() => {
    for (const h of data.habits) settle(h.id, data.today, h.doneToday);
  }, [data.habits, data.today, queue]);
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<HabitView | null>(null);
  const [menuFor, setMenuFor] = useState<HabitView | null>(null);
  const [noteFor, setNoteFor] = useState<HabitView | null>(null);
  const [deleting, setDeleting] = useState<HabitView | null>(null);
  const [bursts, setBursts] = useState<Record<number, number>>({});
  const [celebrating, setCelebrating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const total = habits.length;
  const doneCount = habits.filter((h) => h.doneToday).length;
  const rate = total ? Math.round((doneCount / total) * 100) : 0;
  const bestStreak = habits.reduce((best, h) => Math.max(best, h.streakBefore + (h.doneToday ? 1 : 0)), 0);
  const checkins = habits.reduce((sum, h) => sum + h.totalBefore + (h.doneToday ? 1 : 0), 0);
  const allDone = total > 0 && doneCount === total;
  const visible = habits.filter((h) => filter === "all" || (filter === "done") === h.doneToday);

  // Winter Arc members: the pack's habits get a section of their own, and
  // finishing all of them opens the day's surprise.
  const arcHabits = habits.filter((h) => h.arc);
  const arcDone = arcHabits.filter((h) => h.doneToday).length;
  const arcAllDone = data.arc !== null && arcHabits.length > 0 && arcDone === arcHabits.length;
  const perfectDays = (data.arc?.perfectBefore ?? 0) + (arcAllDone ? 1 : 0);
  const nextBadge = MILESTONES.find((m) => m.days > perfectDays);
  const [surprise, setSurprise] = useState(false);
  const closeSurprise = useCallback(() => setSurprise(false), []);
  const todayDay = Number(data.today.slice(8));

  // The number on the app's icon: habits still open today (none when done).
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (!nav.setAppBadge) return;
    const left = total - doneCount;
    void (left > 0 && badgeEnabled() ? nav.setAppBadge(left) : nav.clearAppBadge?.())?.catch(() => {});
  }, [total, doneCount]);

  // Celebrate only when *you* just finished the last habit — not on page load.
  const interacted = useRef(false);
  const wasAllDone = useRef(allDone);
  useEffect(() => {
    if (allDone && !wasAllDone.current && interacted.current) setCelebrating(true);
    wasAllDone.current = allDone;
  }, [allDone]);
  // The gift pops up by itself once a day, at the moment the last arc habit is
  // ticked. After that it can be reopened from the section's header.
  const wasArcDone = useRef(arcAllDone);
  useEffect(() => {
    if (arcAllDone && !wasArcDone.current && interacted.current && !surpriseSeen(data.today)) {
      const timer = setTimeout(() => setSurprise(true), 900); // let the tick animation land first
      wasArcDone.current = arcAllDone;
      return () => clearTimeout(timer);
    }
    wasArcDone.current = arcAllDone;
  }, [arcAllDone, data.today]);
  useEffect(() => {
    if (!celebrating) return;
    const timer = setTimeout(() => setCelebrating(false), 3400);
    return () => clearTimeout(timer);
  }, [celebrating]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  function toggle(habit: HabitView) {
    const done = !habit.doneToday;
    interacted.current = true;
    if (done) setBursts((b) => ({ ...b, [habit.id]: Date.now() }));
    setDone(habit.id, data.today, done);
  }

  function remove(habit: HabitView) {
    startTransition(async () => {
      const result = await whenOnline(async () => {
        apply({ type: "remove", id: habit.id });
        return deleteHabit(habit.id);
      });
      if (!result.ok) setToast(result.error);
    });
  }

  function saveHabitNote(habit: HabitView, mood: Mood | null, notes: string) {
    setNoteFor(null);
    startTransition(async () => {
      const result = await whenOnline(async () => {
        apply({ type: "note", id: habit.id, mood, notes });
        return saveNote(habit.id, mood ?? "", notes);
      });
      setToast(result.ok ? "Note saved." : result.error);
    });
  }

  // Packs for everyone: each one the member has added is a section of its own.
  const myPacks = data.packs.filter((p) => p.joined);
  const otherPacks = data.packs.filter((p) => !p.joined);
  const [leavingPack, setLeavingPack] = useState<(typeof data.packs)[number] | null>(null);
  const [packBusy, startPack] = useTransition();
  const closeLeavingPack = useCallback(() => setLeavingPack(null), []);
  function changePack(task: () => Promise<{ ok: true } | { ok: false; error: string }>, done: string) {
    startPack(async () => {
      const result = await whenOnline(task);
      setToast(result.ok ? done : result.error);
    });
  }
  const grouped = habits.some((h) => h.arc || h.packId !== null);

  const row = (habit: HabitView) => (
    <HabitRow key={habit.id} habit={habit} burstKey={bursts[habit.id] ?? null} onToggle={() => toggle(habit)} onNote={() => setNoteFor(habit)} onEdit={() => setEditing(habit)} onDelete={() => setDeleting(habit)} onMenu={() => setMenuFor(habit)} />
  );

  const closeAdd = useCallback(() => setAdding(false), []);
  const closeEdit = useCallback(() => setEditing(null), []);
  const closeMenu = useCallback(() => setMenuFor(null), []);
  const closeNote = useCallback(() => setNoteFor(null), []);
  const closeDelete = useCallback(() => setDeleting(null), []);

  return (
    <>
      <PageHeader title="Today's Habits">
        <span className="rounded-xl border border-line bg-card px-3.5 py-2 text-[13px] font-medium text-muted">{data.todayLabel}</span>
        <motion.button type="button" className={btnPrimary} onClick={() => setAdding(true)} whileTap={{ scale: 0.95 }} whileHover={{ y: -1 }}>
          <span className="text-base leading-none">+</span> Add Habit
        </motion.button>
      </PageHeader>

      <div className="space-y-7 px-4 py-6 md:px-8 md:py-7">
        {/* ── the Winter Arc is running and this person isn't in it yet ── */}
        {data.arcInvite && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Link href="/arc" className="relative flex items-center gap-4 overflow-hidden rounded-2xl bg-ink px-5 py-4 text-bg" data-arc-invite>
              <span aria-hidden className="shine absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              <motion.span className="relative text-3xl" aria-hidden animate={{ rotate: [0, 60] }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }}>
                ❄
              </motion.span>
              <span className="relative min-w-0 flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
                  Live now · Day {data.arcInvite.day} of {data.arcInvite.totalDays}
                </span>
                <span className="block font-display text-lg font-bold leading-tight">The Winter Arc has started</span>
                <span className="block text-[13px] opacity-80">Pick a pack, show up every day, climb the leaderboard.</span>
              </span>
              <span className="relative shrink-0 rounded-xl bg-bg px-3.5 py-2 text-sm font-bold text-ink">Join →</span>
            </Link>
          </motion.div>
        )}

        {/* ── Stats ── */}
        <motion.section
          aria-label="Today at a glance"
          className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
          initial="hidden"
          animate="shown"
          variants={{ shown: { transition: { staggerChildren: 0.07 } } }}
        >
          <StatTile className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-4">
              <ProgressRing value={total ? doneCount / total : 0}>
                <span className="text-[13px] font-bold">
                  <AnimatedNumber value={rate} />%
                </span>
              </ProgressRing>
              <div>
                <div className="text-3xl font-semibold tracking-tight">
                  <AnimatedNumber value={doneCount} />
                  <span className="text-muted">/{total}</span>
                </div>
                <div className={eyebrow}>Done today</div>
              </div>
            </div>
          </StatTile>
          <StatTile>
            <div className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
              <AnimatedNumber value={bestStreak} />
              <Flame lit={bestStreak > 0} size={24} />
            </div>
            <div className={eyebrow}>Best streak (days)</div>
            <div className="mt-2 text-xs font-medium text-brand">{bestStreak > 0 ? "Keep it going!" : "Start one today"}</div>
          </StatTile>
          <StatTile>
            <div className="text-3xl font-semibold tracking-tight">
              <AnimatedNumber value={checkins} />
            </div>
            <div className={eyebrow}>Total check-ins</div>
            <div className="mt-2 text-xs font-medium text-brand">All time</div>
          </StatTile>
          <StatTile className="col-span-2 lg:col-span-1">
            <div className="text-3xl font-semibold tracking-tight">
              <AnimatedNumber value={total} />
            </div>
            <div className={eyebrow}>Active habits</div>
            <div className="mt-2 text-xs font-medium text-brand">Tracking now</div>
          </StatTile>
        </motion.section>

        {/* ── Checklist ── */}
        <section aria-label="Today's checklist">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold tracking-tight">Today&apos;s Checklist</h2>
            <div className="flex rounded-full border border-line bg-card p-1" role="tablist" aria-label="Filter habits">
              {(["all", "pending", "done"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={filter === f}
                  onClick={() => setFilter(f)}
                  className={`relative rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${filter === f ? "text-on-brand" : "text-muted hover:text-ink"}`}
                >
                  {filter === f && <motion.span layoutId="filter-pill" className="absolute inset-0 rounded-full bg-brand-solid" transition={{ type: "spring", stiffness: 480, damping: 36 }} />}
                  <span className="relative">{f}</span>
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {allDone && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="mb-3 flex items-center gap-3 rounded-2xl bg-good-soft px-4 py-3 text-sm font-semibold text-good">
                  <motion.span className="text-lg" animate={{ rotate: [0, -14, 14, -8, 8, 0] }} transition={{ duration: 0.9, delay: 0.2 }}>
                    🎉
                  </motion.span>
                  Perfect day — every habit is done.
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <SupportNudge show={allDone} today={data.today} />

          {/* ── Winter Arc members: the pack, in its own section ── */}
          {data.arc && arcHabits.length > 0 && (
            <div className="mb-6 rounded-3xl border border-line bg-raised/50 p-3 sm:p-4" data-section="arc">
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 px-1">
                <div className="min-w-0 flex-1">
                  <p className={eyebrow}>
                    ❄️ Winter Arc · Day {data.arc.day}/{data.arc.totalDays}
                  </p>
                  <h3 className="truncate font-display text-base font-bold tracking-tight">{data.arc.pack ?? "Your pack"}</h3>
                </div>
                <div className="text-right text-xs font-medium text-muted">
                  <div>
                    <span className="text-sm font-bold tabular-nums text-ink">
                      {arcDone}/{arcHabits.length}
                    </span>{" "}
                    today
                  </div>
                  <div>
                    {perfectDays} perfect {perfectDays === 1 ? "day" : "days"}
                    {nextBadge && ` · badge at ${nextBadge.days}`}
                  </div>
                </div>
              </div>
              <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-line">
                <motion.div className="h-full rounded-full bg-brand-solid" initial={false} animate={{ width: `${(arcDone / arcHabits.length) * 100}%` }} transition={{ type: "spring", stiffness: 200, damping: 26 }} />
              </div>
              <AnimatePresence>
                {arcAllDone && (
                  <motion.button type="button" onClick={() => setSurprise(true)} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-3 flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-brand-solid px-4 py-3 text-left text-sm font-semibold text-on-brand" data-open-surprise>
                    <motion.span className="text-xl" aria-hidden animate={{ rotate: [0, -12, 12, -6, 6, 0] }} transition={{ duration: 1, repeat: Infinity, repeatDelay: 1.6 }}>
                      🎁
                    </motion.span>
                    <span className="flex-1">Pack complete — open today&apos;s surprise</span>
                    <span aria-hidden>→</span>
                  </motion.button>
                )}
              </AnimatePresence>
              <ul className="space-y-2.5">
                <AnimatePresence mode="popLayout" initial={false}>
                  {visible.filter((h) => h.arc).map(row)}
                </AnimatePresence>
              </ul>
              {visible.every((h) => !h.arc) && <p className="px-1 py-2 text-center text-xs text-muted">{filter === "done" ? "None of the pack ticked yet today." : "The whole pack is done."}</p>}
            </div>
          )}
          {/* ── packs the member has added: a section each ── */}
          {myPacks.map((pack) => {
            const mine = habits.filter((h) => h.packId === pack.id);
            const packDone = mine.filter((h) => h.doneToday).length;
            const shown = visible.filter((h) => h.packId === pack.id);
            return (
              <div key={pack.id} className="mb-6 rounded-3xl border border-line bg-raised/50 p-3 sm:p-4" data-section="pack" data-pack={pack.name}>
                <div className="mb-3 flex items-center gap-3 px-1">
                  <div className="min-w-0 flex-1">
                    <p className={eyebrow}>Pack</p>
                    <h3 className="truncate font-display text-base font-bold tracking-tight">
                      {pack.icon} {pack.name}
                    </h3>
                  </div>
                  <span className="text-xs font-medium text-muted">
                    <span className="text-sm font-bold tabular-nums text-ink">
                      {packDone}/{mine.length}
                    </span>{" "}
                    today{mine.length > 0 && packDone === mine.length ? " 🎉" : ""}
                  </span>
                  <button type="button" className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-muted hover:border-bad hover:text-bad" disabled={packBusy} onClick={() => setLeavingPack(pack)}>
                    Remove
                  </button>
                </div>
                <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-line">
                  <motion.div className="h-full rounded-full bg-brand-solid" initial={false} animate={{ width: mine.length ? `${(packDone / mine.length) * 100}%` : 0 }} transition={{ type: "spring", stiffness: 200, damping: 26 }} />
                </div>
                <ul className="space-y-2.5">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {shown.map(row)}
                  </AnimatePresence>
                </ul>
                {shown.length === 0 && <p className="px-1 py-2 text-center text-xs text-muted">{mine.length === 0 ? "This pack has no habits right now." : filter === "done" ? "None of this pack ticked yet today." : "This pack is done for today."}</p>}
              </div>
            );
          })}
          {grouped && habits.some((h) => !h.arc && h.packId === null) && <h3 className="mb-3 px-1 font-display text-base font-bold tracking-tight">My other habits</h3>}

          {total === 0 ? (
            <EmptyState onAdd={() => setAdding(true)} />
          ) : (
            <ul className="space-y-2.5">
              <AnimatePresence mode="popLayout" initial={false}>
                {visible.filter((h) => !h.arc && h.packId === null).map(row)}
                {visible.length === 0 && !grouped && (
                  <motion.li key="none" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
                    {filter === "done" ? "Nothing ticked off yet today." : "Nothing pending — you're all caught up."}
                  </motion.li>
                )}
              </AnimatePresence>
            </ul>
          )}

          {/* ── packs on offer: ready-made sets of habits, added with one tap ── */}
          {otherPacks.length > 0 && (
            <div className="mt-8" data-pack-shelf>
              <h3 className="font-display text-base font-bold tracking-tight">Habit packs</h3>
              <p className="mb-3 text-[13px] text-muted">Ready-made sets of habits. Add one and its habits appear above in a section of their own.</p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {otherPacks.map((pack) => (
                  <div key={pack.id} className={`${card} p-4`} data-pack={pack.name}>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl" aria-hidden>
                        {pack.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold">{pack.name}</div>
                        {pack.tagline && <p className="text-xs text-muted">{pack.tagline}</p>}
                      </div>
                      <button type="button" className="rounded-xl bg-brand-solid px-3 py-1.5 text-xs font-semibold text-on-brand hover:bg-brand-solid-hover disabled:opacity-60" disabled={packBusy} onClick={() => changePack(() => addPack(pack.id), `"${pack.name}" added to your habits.`)}>
                        Add pack
                      </button>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-muted">{pack.habits.join(" · ")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Trend + month ── */}
        {total > 0 && (
          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Reveal className="min-w-0">
              <section className={`${card} p-5`}>
                <h2 className="text-sm font-bold">30-day completion</h2>
                <p className="mb-3 text-xs text-muted">Habits completed per day</p>
                <TrendChart data={[...data.trend, { label: "Today", value: doneCount }]} unit="habits" caption="Habits completed per day over the last 30 days" />
              </section>
            </Reveal>
            <Reveal delay={0.08} className="min-w-0">
              <section className={`${card} p-5`}>
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h2 className="text-sm font-bold">{data.monthLabel}</h2>
                  <Link href="/monthly" className="text-xs font-semibold text-brand hover:underline">
                    Open monthly view →
                  </Link>
                </div>
                <div className="overflow-x-auto pb-1">
                  <table className="border-separate border-spacing-y-1.5 text-xs">
                    <tbody>
                      {habits.map((h, row) => {
                        const days = new Set(h.monthDays);
                        if (h.doneToday) days.add(todayDay);
                        return (
                          <tr key={h.id}>
                            <th scope="row" className="max-w-[120px] truncate pr-3 text-left font-medium text-muted">
                              <span aria-hidden>{h.icon}</span> {h.name}
                            </th>
                            {Array.from({ length: data.daysInMonth }, (_, i) => {
                              const day = i + 1;
                              const done = days.has(day);
                              return (
                                <td key={day} className="px-[1.5px]">
                                  <span
                                    title={`${data.monthLabel.split(" ")[0]} ${day}${day > todayDay ? "" : done ? " — done" : " — missed"}`}
                                    className={`cell-in block h-3 w-3 rounded-[4px] ${day === todayDay ? "ring-1 ring-brand ring-offset-1 ring-offset-card" : ""} ${day > todayDay ? "border border-line" : done ? "" : "bg-raised"}`}
                                    style={{ ["--d" as string]: row * 2 + i, background: done ? h.color : undefined }}
                                  />
                                </td>
                              );
                            })}
                            <td className="pl-3 text-right font-semibold tabular-nums text-ink">{Math.round((days.size / todayDay) * 100)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </Reveal>
          </div>
        )}
      </div>

      <HabitFormModal open={adding} onClose={closeAdd} categories={data.categories} />
      <HabitFormModal open={editing !== null} onClose={closeEdit} categories={data.categories} habit={editing} />
      {/* phone action sheet */}
      <Modal open={menuFor !== null} onClose={closeMenu} title={menuFor?.name ?? ""} width="max-w-sm">
        {menuFor && (
          <div className="space-y-2">
            {(
              [
                ["Add a note or mood", () => setNoteFor(menuFor)],
                ["Edit habit", () => setEditing(menuFor)],
                ["Delete habit", () => setDeleting(menuFor)],
              ] as const
            ).map(([text, open], i) => (
              <button
                key={text}
                type="button"
                onClick={() => {
                  closeMenu();
                  open();
                }}
                className={`w-full rounded-xl border border-line px-4 py-3.5 text-left text-[15px] font-semibold ${i === 2 ? "text-bad" : "text-ink"}`}
              >
                {text}
              </button>
            ))}
          </div>
        )}
      </Modal>
      <NoteModal habit={noteFor} onClose={closeNote} onSave={saveHabitNote} />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete this habit?"
        body={`"${deleting?.name ?? ""}" will be removed from your checklist. Its past check-ins stay in the database.`}
        confirmLabel="Delete"
        onConfirm={() => deleting && remove(deleting)}
        onClose={closeDelete}
      />

      {data.arc && <ArcSurprise open={surprise} onClose={closeSurprise} today={data.today} perfectDays={perfectDays} surprises={data.arc.surprises} />}
      <ConfirmDialog
        open={leavingPack !== null}
        title="Remove this pack?"
        body={`The "${leavingPack?.name ?? ""}" habits will leave your checklist. Their past check-ins stay in the database, and you can add the pack again later.`}
        confirmLabel="Remove pack"
        onConfirm={() => leavingPack && changePack(() => removePack(leavingPack.id), "Pack removed.")}
        onClose={closeLeavingPack}
      />
      {celebrating && <Confetti />}
      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            className="fixed bottom-24 left-1/2 z-40 max-w-[90vw] rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-bg shadow-xl md:bottom-8"
            initial={{ opacity: 0, y: 24, x: "-50%", scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: 16, x: "-50%", scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function StatTile({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={{ hidden: { opacity: 0, y: 16 }, shown: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 24 } } }}>
      <Spotlight className={`${card} h-full p-5`}>{children}</Spotlight>
    </motion.div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-dashed border-line bg-card px-6 py-14 text-center">
      <div className="relative mx-auto mb-6 grid h-14 w-14 place-items-center">
        <span className="ripple absolute inset-0 rounded-full border border-brand" />
        <span className="ripple absolute inset-0 rounded-full border border-brand [animation-delay:1.2s]" />
        <span className="relative grid h-14 w-14 place-items-center rounded-full bg-brand-soft text-2xl font-light text-brand">+</span>
      </div>
      <h3 className="font-display text-xl font-bold tracking-tight">No habits yet</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">Start building better habits today. Add your first habit to begin tracking!</p>
      <motion.button type="button" className={`${btnPrimary} mt-6`} onClick={onAdd} whileTap={{ scale: 0.95 }}>
        Add Your First Habit
      </motion.button>
    </motion.div>
  );
}
