"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "../auth";
import { arcSeason } from "../arc";
import { getMemberPack, givePackHabits } from "../arc-packs";
import { execute, query, queryOne } from "../db";
import { todayIn } from "../dates";
import { toId } from "../validation";
import { workoutById } from "../workouts";

type Result = { ok: true } | { ok: false; error: string };

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

/**
 * The last step of the join flow: creates the chosen pack's habits for this
 * person, adds any extras they picked (skipping ones they already have) and
 * enters them into this season's arc.
 */
export async function startArc(packIdInput: number | null, workoutIds: string[]): Promise<Result> {
  const user = await requireUser();
  // administrators manage the challenge; they don't appear on its leaderboard
  if (user.role === "admin") return { ok: false, error: "Administrator accounts don't take part in the Winter Arc." };
  const picked = [...new Set(Array.isArray(workoutIds) ? workoutIds.map(String) : [])].slice(0, 12).map(workoutById).filter((w) => w !== undefined);
  const { year } = arcSeason(todayIn(user.timezone));
  const packId = packIdInput === null ? null : toId(packIdInput);
  const pack = packId ? await queryOne<{ id: number }>("SELECT p.id FROM arc_packs p WHERE p.id = ? AND p.kind = 'arc' AND p.is_active = 1 AND EXISTS (SELECT 1 FROM arc_pack_habits t WHERE t.pack_id = p.id)", [packId]) : null;
  if (packIdInput !== null && !pack) return { ok: false, error: "That pack is no longer available. Choose another." };

  const existing = await query<{ name: string }>("SELECT name FROM habits WHERE user_id = ? AND is_active = 1", [user.id]);
  const have = new Set(existing.map((h) => h.name.toLowerCase()));
  const toAdd = picked.filter((w) => !have.has(w.name.toLowerCase())).slice(0, Math.max(0, 50 - existing.length));
  if (!pack && existing.length + toAdd.length === 0) return { ok: false, error: "Choose a pack or at least one habit to start with." };

  const category = (await queryOne("SELECT id FROM categories WHERE name = 'Health'")) ? "Health" : "General";
  for (const workout of toAdd) {
    await execute("INSERT INTO habits (user_id, name, description, category, icon, color, frequency, target_count) VALUES (?, ?, ?, ?, ?, ?, 'daily', 1)", [user.id, workout.name, workout.steps.join(" · "), category, workout.icon, workout.color]);
  }
  await execute("INSERT INTO winter_arc_members (user_id, season, pack_id) VALUES (?, ?, ?) ON CONFLICT (user_id, season) DO UPDATE SET pack_id = COALESCE(EXCLUDED.pack_id, winter_arc_members.pack_id)", [user.id, year, pack?.id ?? null]);
  if (pack) await givePackHabits(user.id, pack.id, year);
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * For someone already in the arc: take a pack (or swap to another). The new
 * pack's habits are created; the old pack's habits leave the checklist — their
 * history stays in the database, like any deleted habit.
 */
export async function choosePack(packIdInput: number): Promise<Result> {
  const user = await requireUser();
  const packId = toId(packIdInput);
  const { year } = arcSeason(todayIn(user.timezone));
  if (!(await queryOne("SELECT 1 AS ok FROM winter_arc_members WHERE user_id = ? AND season = ?", [user.id, year]))) return { ok: false, error: "Join the Winter Arc first." };
  const pack = packId ? await queryOne<{ id: number }>("SELECT p.id FROM arc_packs p WHERE p.id = ? AND p.kind = 'arc' AND p.is_active = 1 AND EXISTS (SELECT 1 FROM arc_pack_habits t WHERE t.pack_id = p.id)", [packId]) : null;
  if (!pack) return { ok: false, error: "That pack is no longer available. Choose another." };

  const current = await getMemberPack(user.id, year);
  if (current?.id === pack.id) return { ok: true };
  if (current) await execute("UPDATE habits SET is_active = 0 WHERE user_id = ? AND arc_season = ? AND arc_habit_id IN (SELECT id FROM arc_pack_habits WHERE pack_id = ?)", [user.id, year, current.id]);
  await execute("UPDATE winter_arc_members SET pack_id = ? WHERE user_id = ? AND season = ?", [pack.id, user.id, year]);
  await givePackHabits(user.id, pack.id, year);
  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Packs for everyone (not tied to the Winter Arc) ──────────────────────────

/** Adds an "open" pack: its habits are created for this person, in a section of their own. */
export async function addPack(packIdInput: number): Promise<Result> {
  const user = await requireUser();
  if (user.role === "admin") return { ok: false, error: "Administrator accounts don't track habits." };
  const packId = toId(packIdInput);
  const pack = packId ? await queryOne<{ id: number }>("SELECT p.id FROM arc_packs p WHERE p.id = ? AND p.kind = 'open' AND p.is_active = 1 AND EXISTS (SELECT 1 FROM arc_pack_habits t WHERE t.pack_id = p.id)", [packId]) : null;
  if (!pack) return { ok: false, error: "That pack is no longer available." };
  const count = await queryOne<{ n: number | string }>("SELECT COUNT(*) AS n FROM habits WHERE user_id = ? AND is_active = 1", [user.id]);
  if (Number(count?.n ?? 0) >= 50) return { ok: false, error: "Maximum 50 habits allowed. Remove some first." };

  await execute("INSERT INTO pack_members (user_id, pack_id) VALUES (?, ?) ON CONFLICT DO NOTHING", [user.id, pack.id]);
  await givePackHabits(user.id, pack.id, null);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Removes an "open" pack: its habits leave the checklist (past check-ins are kept, like any deleted habit). */
export async function removePack(packIdInput: number): Promise<Result> {
  const user = await requireUser();
  const packId = toId(packIdInput);
  if (!packId) return { ok: false, error: "Invalid request." };
  const left = await execute("DELETE FROM pack_members WHERE user_id = ? AND pack_id = ?", [user.id, packId]);
  if (left.rowCount) await execute("UPDATE habits SET is_active = 0 WHERE user_id = ? AND arc_season IS NULL AND arc_habit_id IN (SELECT id FROM arc_pack_habits WHERE pack_id = ?)", [user.id, packId]);
  revalidatePath("/", "layout");
  return { ok: true };
}
