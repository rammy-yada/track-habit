"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { btnPrimary, card, eyebrow, input } from "@/components/ui/styles";
import { addArcGoal, deleteArcGoal, toggleArcGoal } from "@/lib/actions/arc";
import { whenOnline } from "@/lib/offline";

export type Goal = { id: number; text: string; done: boolean };
type Op = { type: "toggle" | "remove"; id: number } | { type: "add"; text: string };

const IDEAS = ["Finish all 123 days", "Run 5 km without stopping", "Read 6 books", "Wake up at 5:30 every weekday", "Lose 5 kg", "Save a fixed amount every month"];

const reduce = (goals: Goal[], op: Op): Goal[] =>
  op.type === "add" ? [...goals, { id: -Date.now(), text: op.text, done: false }] : op.type === "remove" ? goals.filter((g) => g.id !== op.id) : goals.map((g) => (g.id === op.id ? { ...g, done: !g.done } : g));

/**
 * The Goals tab: what this member wants to have achieved by the end of the
 * season. Up to seven, each ticked off when reached. Private — nobody else
 * sees them.
 */
export function ArcGoals({ goals, endsOn, member }: { goals: Goal[]; endsOn: string; member: boolean }) {
  const [list, apply] = useOptimistic(goals, reduce);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const reached = list.filter((g) => g.done).length;

  function run(op: Op, task: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await whenOnline(async () => {
        apply(op);
        return task();
      });
      if (!result.ok) setError(result.error);
    });
  }
  function add(value: string) {
    const goal = value.trim();
    if (goal.length < 3) return;
    setText("");
    run({ type: "add", text: goal }, () => addArcGoal(goal));
  }

  if (!member)
    return (
      <div className={`${card} p-7 text-center`}>
        <p className="text-4xl" aria-hidden>
          🎯
        </p>
        <h2 className="mt-3 font-display text-xl font-bold tracking-tight">Set your goals for the winter</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">Join the Winter Arc to choose a pack of habits and write down what you want to have achieved by {endsOn}.</p>
        <Link href="/arc/start" className={`${btnPrimary} mt-5`}>
          Join the Winter Arc
        </Link>
      </div>
    );

  return (
    <section className={`${card} p-5`} aria-label="My goals" data-arc-goals>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className={eyebrow}>By {endsOn}</p>
          <h2 className="font-display text-lg font-bold tracking-tight">My goals</h2>
        </div>
        {list.length > 0 && (
          <span className="text-sm font-bold tabular-nums">
            {reached}/{list.length} <span className="text-xs font-medium text-muted">reached</span>
          </span>
        )}
      </div>
      <p className="mt-1 text-[13px] text-muted">What do you want to be able to say when the arc ends? Only you can see these.</p>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-bad-soft px-3.5 py-2.5 text-[13px] font-medium text-bad">
          {error}
        </p>
      )}

      <ul className="mt-4 space-y-2">
        <AnimatePresence initial={false}>
          {list.map((goal) => (
            <motion.li key={goal.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${goal.done ? "border-transparent bg-good-soft" : "border-line"}`}>
              <button type="button" role="checkbox" aria-checked={goal.done} aria-label={`${goal.done ? "Mark as not reached" : "Mark as reached"}: ${goal.text}`} disabled={goal.id < 0} onClick={() => run({ type: "toggle", id: goal.id }, () => toggleArcGoal(goal.id))} className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 text-sm font-bold ${goal.done ? "border-good bg-good text-white" : "border-line text-transparent"}`}>
                ✓
              </button>
              <span className={`min-w-0 flex-1 break-words text-sm font-medium ${goal.done ? "text-good line-through" : ""}`}>{goal.text}</span>
              <button type="button" aria-label={`Remove goal: ${goal.text}`} disabled={goal.id < 0} onClick={() => run({ type: "remove", id: goal.id }, () => deleteArcGoal(goal.id))} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-bad-soft hover:text-bad">
                ✕
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {list.length < 7 && (
        <>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              add(text);
            }}
          >
            <input className={`${input} min-w-0 flex-1`} name="arc_goal" value={text} maxLength={140} placeholder={list.length ? "Add another goal…" : "Write your first goal…"} onChange={(e) => setText(e.target.value)} aria-label="New goal" />
            <button type="submit" className={btnPrimary} disabled={text.trim().length < 3}>
              Add
            </button>
          </form>
          {list.length === 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="py-1 text-xs text-muted">Ideas:</span>
              {IDEAS.map((idea) => (
                <button key={idea} type="button" onClick={() => add(idea)} className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted hover:border-brand hover:text-brand">
                  {idea}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
