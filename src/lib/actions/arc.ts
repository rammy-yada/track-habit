"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "../auth";
import { arcSeason } from "../arc";
import { getMemberPack, givePackHabits } from "../arc-packs";
import { arcNumbers, badgesFor } from "../badges";
import { execute, query, queryOne } from "../db";
import { ageOn, countryName, flag, genderLabel } from "../people";
import { decodeEntities } from "../text";
import { formatTimestamp, todayIn } from "../dates";
import { toId } from "../validation";
import { workoutById, WORKOUTS } from "../workouts";

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

// ── Winter Arc: personal goals and the quote to share ────────────────────────

const line = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");

async function memberSeason(): Promise<{ userId: number; year: number } | null> {
  const user = await requireUser();
  const { year } = arcSeason(todayIn(user.timezone));
  return (await queryOne("SELECT 1 AS ok FROM winter_arc_members WHERE user_id = ? AND season = ?", [user.id, year])) ? { userId: user.id, year } : null;
}
const NOT_MEMBER = { ok: false, error: "Join the Winter Arc first." } as const;

/** Something the member wants to have achieved by the end of the season. */
export async function addArcGoal(textInput: string): Promise<Result> {
  const member = await memberSeason();
  if (!member) return NOT_MEMBER;
  const text = line(textInput, 140);
  if (text.length < 3) return { ok: false, error: "Write the goal first." };
  const count = await queryOne<{ n: number | string }>("SELECT COUNT(*) AS n FROM arc_goals WHERE user_id = ? AND season = ?", [member.userId, member.year]);
  if (Number(count?.n ?? 0) >= 7) return { ok: false, error: "Seven goals is plenty. Finish or remove one first." };
  await execute("INSERT INTO arc_goals (user_id, season, text) VALUES (?, ?, ?)", [member.userId, member.year, text]);
  revalidatePath("/arc");
  return { ok: true };
}

export async function toggleArcGoal(idInput: number): Promise<Result> {
  const user = await requireUser();
  const id = toId(idInput);
  if (!id) return { ok: false, error: "Invalid request." };
  // user_id is in the WHERE: the id alone must never be enough to change someone's goal
  await execute("UPDATE arc_goals SET done = 1 - done WHERE id = ? AND user_id = ?", [id, user.id]);
  revalidatePath("/arc");
  return { ok: true };
}

export async function deleteArcGoal(idInput: number): Promise<Result> {
  const user = await requireUser();
  const id = toId(idInput);
  if (!id) return { ok: false, error: "Invalid request." };
  await execute("DELETE FROM arc_goals WHERE id = ? AND user_id = ?", [id, user.id]);
  revalidatePath("/arc");
  return { ok: true };
}

/** The member's own line, shown on the picture they share. */
export async function saveArcQuote(textInput: string): Promise<Result> {
  const member = await memberSeason();
  if (!member) return NOT_MEMBER;
  await execute("UPDATE winter_arc_members SET quote = ? WHERE user_id = ? AND season = ?", [line(textInput, 160), member.userId, member.year]);
  revalidatePath("/arc");
  return { ok: true };
}

// ── Leaderboard profiles ─────────────────────────────────────────────────────

export type ArcProfile = {
  name: string;
  username: string;
  avatar: { id: number; name: string; color: string; version: number };
  isMe: boolean;
  /** Each is present only if that person lets it be shown (Profile → About you). */
  age: number | null;
  gender: string | null;
  country: { code: string; name: string; flag: string } | null;
  memberSince: string;
  pack: string | null;
  numbers: { points: number; streak: number; perfect: number; activeDays: number };
  badges: { name: string; icon: string; description: string }[];
};

/**
 * What one Winter Arc member may see of another, opened from the leaderboard.
 * Only people on this season's leaderboard have a profile, only members can
 * open one, and age, gender and country are left out unless their owner has
 * them switched on.
 */
export async function viewArcProfile(userIdInput: number): Promise<{ ok: true; profile: ArcProfile } | { ok: false; error: string }> {
  const viewer = await requireUser();
  const id = toId(userIdInput);
  const today = todayIn(viewer.timezone);
  const { year } = arcSeason(today);
  const target = id
    ? await queryOne<{ id: number; username: string; full_name: string; avatar_color: string; avatar_version: number; gender: string | null; birth_date: string | null; country: string | null; show_age: number; show_gender: number; show_country: number; created_at: string; timezone: string; pack: string | null }>(
        `SELECT u.id, u.username, u.full_name, u.avatar_color, u.avatar_version, u.gender, u.birth_date, u.country, u.show_age, u.show_gender, u.show_country, u.created_at, u.timezone,
                (SELECT p.icon || ' ' || p.name FROM arc_packs p WHERE p.id = m.pack_id) AS pack
         FROM winter_arc_members m JOIN users u ON u.id = m.user_id AND u.is_active = 1 AND u.role = 'user'
         WHERE m.user_id = ? AND m.season = ?`,
        [id, year],
      )
    : null;
  if (!target) return { ok: false, error: "That profile isn't available." };

  const theirToday = todayIn(target.timezone || "UTC");
  const numbers = await arcNumbers(target.id, theirToday);
  const badges = (await badgesFor(target.id, numbers)).filter((b) => b.earned);
  const parts = decodeEntities(target.full_name).trim().split(/\s+/);
  const name = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0]; // first name and last initial, as on the leaderboard
  return {
    ok: true,
    profile: {
      name,
      username: target.username,
      avatar: { id: target.id, name, color: target.avatar_color, version: target.avatar_version },
      isMe: target.id === viewer.id,
      age: target.show_age === 1 && target.birth_date ? ageOn(target.birth_date, theirToday) : null,
      gender: target.show_gender === 1 && target.gender && target.gender !== "private" ? genderLabel(target.gender) : null,
      country: target.show_country === 1 && target.country ? { code: target.country, name: countryName(target.country), flag: flag(target.country) } : null,
      memberSince: formatTimestamp(target.created_at, viewer.timezone),
      pack: target.pack,
      numbers,
      badges: badges.map(({ name: badgeName, icon, description }) => ({ name: badgeName, icon, description })),
    },
  };
}

// ── Popular ──────────────────────────────────────────────────────────────────

/** Adds a habit from the Popular list. Only names from the built-in list or an admin's pack are accepted. */
export async function addPopularHabit(nameInput: string): Promise<Result> {
  const user = await requireUser();
  const name = String(nameInput ?? "").trim().slice(0, 100);
  const workout = WORKOUTS.find((w) => w.name.toLowerCase() === name.toLowerCase());
  const template = workout ? null : await queryOne<{ name: string; icon: string }>("SELECT t.name, t.icon FROM arc_pack_habits t JOIN arc_packs p ON p.id = t.pack_id AND p.is_active = 1 WHERE LOWER(t.name) = LOWER(?) LIMIT 1", [name]);
  const source = workout ? { name: workout.name, icon: workout.icon, color: workout.color, description: workout.steps.join(" · ") } : template ? { name: template.name, icon: template.icon, color: "#2563eb", description: "" } : null;
  if (!source) return { ok: false, error: "That habit isn't available." };
  if (await queryOne("SELECT id FROM habits WHERE user_id = ? AND is_active = 1 AND LOWER(name) = LOWER(?)", [user.id, source.name])) return { ok: true }; // already theirs
  const count = await queryOne<{ n: number | string }>("SELECT COUNT(*) AS n FROM habits WHERE user_id = ? AND is_active = 1", [user.id]);
  if (Number(count?.n ?? 0) >= 50) return { ok: false, error: "Maximum 50 habits allowed." };
  const category = (await queryOne("SELECT id FROM categories WHERE name = 'Health'")) ? "Health" : "General";
  await execute("INSERT INTO habits (user_id, name, description, category, icon, color, frequency, target_count) VALUES (?, ?, ?, ?, ?, ?, 'daily', 1)", [user.id, source.name, source.description, category, source.icon, source.color]);
  revalidatePath("/", "layout");
  return { ok: true };
}
