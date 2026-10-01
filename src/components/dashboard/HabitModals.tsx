"use client";

import { useActionState, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { btnPrimary, input, label } from "@/components/ui/styles";
import { addHabitAction } from "@/lib/actions/habits";
import { HABIT_COLORS, HABIT_ICONS, MOODS, type Mood } from "@/lib/constants";
import type { Category, HabitView } from "@/lib/data";

export function AddHabitModal({ open, onClose, categories }: { open: boolean; onClose: () => void; categories: Category[] }) {
  return (
    <Modal open={open} onClose={onClose} title="New Habit" width="max-w-lg">
      <AddHabitForm categories={categories} onDone={onClose} />
    </Modal>
  );
}

// Lives inside the modal, so it mounts fresh (empty) every time the modal opens.
function AddHabitForm({ categories, onDone }: { categories: Category[]; onDone: () => void }) {
  const [state, action, pending] = useActionState(addHabitAction, null);
  const [icon, setIcon] = useState(HABIT_ICONS[0]);
  const [color, setColor] = useState(HABIT_COLORS[0]);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-4">
      <Alert kind="error" shakeKey={state}>
        {state?.error}
      </Alert>
      <label className="block">
        <span className={label}>Habit name *</span>
        <input name="name" className={input} placeholder="e.g. Morning Run, Read 30 mins…" maxLength={100} required data-autofocus />
      </label>
      <label className="block">
        <span className={label}>Description</span>
        <textarea name="description" className={`${input} min-h-[64px] resize-y`} placeholder="What does this habit involve?" rows={2} maxLength={1000} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={label}>Category</span>
          <select name="category" className={input}>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={label}>Frequency</span>
          <select name="frequency" className={input} defaultValue="daily">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <label className="block">
          <span className={label}>Reminder time (optional)</span>
          <input type="time" name="reminder_time" className={input} />
        </label>
        <label className="block">
          <span className={label}>Daily target</span>
          <input type="number" name="target_count" className={input} defaultValue={1} min={1} max={99} />
        </label>
      </div>

      <fieldset>
        <legend className={label}>Icon</legend>
        <div className="flex flex-wrap gap-1.5">
          {HABIT_ICONS.map((ic) => (
            <button key={ic} type="button" onClick={() => setIcon(ic)} aria-pressed={icon === ic} aria-label={`Icon ${ic}`} className="relative grid h-9 w-9 place-items-center rounded-lg bg-raised text-lg">
              {icon === ic && <motion.span layoutId="icon-pick" className="absolute inset-0 rounded-lg border-2 border-brand bg-brand-soft" transition={{ type: "spring", stiffness: 500, damping: 34 }} />}
              <motion.span className="relative" animate={{ scale: icon === ic ? 1.15 : 1 }}>
                {ic}
              </motion.span>
            </button>
          ))}
        </div>
        <input type="hidden" name="icon" value={icon} />
      </fieldset>

      <fieldset>
        <legend className={label}>Color</legend>
        <div className="flex flex-wrap gap-2.5">
          {HABIT_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)} aria-pressed={color === c} aria-label={`Color ${c}`} className="relative h-7 w-7 rounded-full" style={{ background: c }}>
              {color === c && <motion.span layoutId="color-pick" className="absolute -inset-1 rounded-full border-2 border-ink" transition={{ type: "spring", stiffness: 500, damping: 34 }} />}
            </button>
          ))}
        </div>
        <input type="hidden" name="color" value={color} />
      </fieldset>

      <SubmitButton pending={pending} pendingLabel="Adding…">
        Add Habit
      </SubmitButton>
    </form>
  );
}

export function NoteModal({ habit, onClose, onSave }: { habit: HabitView | null; onClose: () => void; onSave: (habit: HabitView, mood: Mood | null, notes: string) => void }) {
  return (
    <Modal open={habit !== null} onClose={onClose} title={habit?.name ?? "Log Note"}>
      {habit && <NoteForm habit={habit} onSave={onSave} />}
    </Modal>
  );
}

function NoteForm({ habit, onSave }: { habit: HabitView; onSave: (habit: HabitView, mood: Mood | null, notes: string) => void }) {
  const [mood, setMood] = useState<Mood | null>(habit.mood);
  const [notes, setNotes] = useState(habit.notes);
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className={label}>How are you feeling?</legend>
        <div className="grid grid-cols-4 gap-2">
          {MOODS.map((m) => {
            const selected = mood === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setMood(selected ? null : m.value)}
                aria-pressed={selected}
                className="relative rounded-xl bg-raised px-2 py-2.5 text-center"
              >
                {selected && <motion.span layoutId="mood-pick" className="absolute inset-0 rounded-xl border-2 border-brand bg-brand-soft" transition={{ type: "spring", stiffness: 500, damping: 34 }} />}
                <motion.span className="relative block text-xl" animate={{ scale: selected ? 1.25 : 1, rotate: selected ? [0, -10, 10, 0] : 0 }} transition={{ duration: 0.35 }}>
                  {m.emoji}
                </motion.span>
                <span className="relative mt-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">{m.label}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
      <label className="block">
        <span className={label}>Notes</span>
        <textarea className={`${input} min-h-[96px] resize-y`} placeholder="How did this habit go today?" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
      </label>
      <button type="button" className={`${btnPrimary} w-full py-3`} onClick={() => onSave(habit, mood, notes)}>
        Save Note
      </button>
    </div>
  );
}
