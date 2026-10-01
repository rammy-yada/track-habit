"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "../auth";
import { execute, queryOne } from "../db";
import { todayIn } from "../dates";
import { clean } from "../text";
import { isHexColor, toId } from "../validation";
import { MOODS } from "../constants";

type Result = { ok: true } | { ok: false; error: string };

async function ownsHabit(userId: number, habitId: number): Promise<boolean> {
  return (await queryOne("SELECT id FROM habits WHERE id = ? AND user_id = ? AND is_active = 1", [habitId, userId])) !== null;
}

// Ticking a habit is not here: it goes through POST /api/sync so that it also
// works for changes made offline (see src/lib/offline.ts).

export type HabitFormState = { error?: string; ok?: boolean } | null;

export async function addHabitAction(_prev: HabitFormState, formData: FormData): Promise<HabitFormState> {
  const user = await requireUser();
  const name = clean(formData.get("name"), 200);
  const description = clean(formData.get("description"), 1000);
  const icon = clean(formData.get("icon"), 10) || "✅";
  const color = clean(formData.get("color"), 7);
  const frequency = clean(formData.get("frequency"), 10);
  const reminder = clean(formData.get("reminder_time"), 5);
  const target = Math.min(99, Math.max(1, Number.parseInt(String(formData.get("target_count") ?? "1"), 10) || 1));
  let category = clean(formData.get("category"), 50);

  if (!name) return { error: "Habit name is required." };
  if (name.length > 100) return { error: "Name too long (max 100 chars)." };
  if (!["daily", "weekly", "monthly"].includes(frequency)) return { error: "Pick a frequency." };
  if (!isHexColor(color)) return { error: "Pick a color." };
  if (reminder && !/^([01]\d|2[0-3]):[0-5]\d$/.test(reminder)) return { error: "Reminder time looks wrong." };
  if (!(await queryOne("SELECT id FROM categories WHERE name = ?", [category]))) category = "General";

  const count = await queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM habits WHERE user_id = ? AND is_active = 1", [user.id]);
  if (Number(count?.n ?? 0) >= 50) return { error: "Maximum 50 habits allowed." };

  await execute(
    "INSERT INTO habits (user_id, name, description, category, icon, color, frequency, target_count, reminder_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [user.id, name, description, category, icon, color, frequency, target, reminder || null],
  );
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteHabit(habitIdInput: number): Promise<Result> {
  const user = await requireUser();
  const habitId = toId(habitIdInput);
  if (!habitId) return { ok: false, error: "Invalid request." };
  // Soft delete: history stays in the database, the habit just stops showing.
  await execute("UPDATE habits SET is_active = 0 WHERE id = ? AND user_id = ?", [habitId, user.id]);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveNote(habitIdInput: number, moodInput: string, notesInput: string): Promise<Result> {
  const user = await requireUser();
  const habitId = toId(habitIdInput);
  const mood = MOODS.some((m) => m.value === moodInput) ? moodInput : null;
  const notes = clean(notesInput, 2000);
  if (!habitId || !(await ownsHabit(user.id, habitId))) return { ok: false, error: "Habit not found." };

  await execute(
    `INSERT INTO habit_logs (habit_id, user_id, log_date, completed_count, mood, notes) VALUES (?, ?, ?, 0, ?, ?)
     ON CONFLICT (habit_id, user_id, log_date) DO UPDATE SET mood = EXCLUDED.mood, notes = EXCLUDED.notes`,
    [habitId, user.id, todayIn(user.timezone), mood, notes || null],
  );
  revalidatePath("/", "layout");
  return { ok: true };
}
