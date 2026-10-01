"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "../auth";
import { arcSeason } from "../arc";
import { execute, queryOne } from "../db";
import { todayIn } from "../dates";
import { workoutById } from "../workouts";

type Result = { ok: true } | { ok: false; error: string };

/** Opt in to this year's Winter Arc — and to appearing on its leaderboard. */
export async function joinArc(): Promise<Result> {
  const user = await requireUser();
  const { year } = arcSeason(todayIn(user.timezone));
  await execute("INSERT INTO winter_arc_members (user_id, season) VALUES (?, ?) ON CONFLICT DO NOTHING", [user.id, year]);
  revalidatePath("/arc");
  return { ok: true };
}

export async function leaveArc(): Promise<Result> {
  const user = await requireUser();
  const { year } = arcSeason(todayIn(user.timezone));
  await execute("DELETE FROM winter_arc_members WHERE user_id = ? AND season = ?", [user.id, year]);
  revalidatePath("/arc");
  return { ok: true };
}

/** Turns a recommended workout into one of the user's habits. */
export async function addWorkoutHabit(workoutId: string): Promise<Result> {
  const user = await requireUser();
  const workout = workoutById(String(workoutId));
  if (!workout) return { ok: false, error: "Unknown workout." };

  if (await queryOne("SELECT id FROM habits WHERE user_id = ? AND is_active = 1 AND name = ?", [user.id, workout.name])) {
    return { ok: false, error: "That one is already in your habits." };
  }
  const count = await queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM habits WHERE user_id = ? AND is_active = 1", [user.id]);
  if (Number(count?.n ?? 0) >= 50) return { ok: false, error: "Maximum 50 habits allowed." };

  const category = (await queryOne("SELECT id FROM categories WHERE name = 'Health'")) ? "Health" : "General";
  await execute("INSERT INTO habits (user_id, name, description, category, icon, color, frequency, target_count) VALUES (?, ?, ?, ?, ?, ?, 'daily', 1)", [
    user.id,
    workout.name,
    workout.steps.join(" · "),
    category,
    workout.icon,
    workout.color,
  ]);
  revalidatePath("/", "layout");
  return { ok: true };
}
