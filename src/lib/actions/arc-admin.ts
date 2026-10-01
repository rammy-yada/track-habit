"use server";

import { revalidatePath } from "next/cache";
import { arcSeason } from "../arc";
import { BADGE_RULES } from "../arc-config";
import { givePackHabitToMembers } from "../arc-packs";
import { saveArcSettings } from "../arc-settings";
import { requireAdmin } from "../auth";
import { todayIn } from "../dates";
import { execute, isDuplicateError, queryOne } from "../db";
import { clean } from "../text";
import { toId } from "../validation";

// Admin → Winter Arc: the intro's settings, the surprises, and the habit
// packs. As everywhere in the admin area, each action checks requireAdmin().

type Result = { ok: true; note?: string } | { ok: false; error: string };
const INVALID = { ok: false, error: "Invalid request." } as const;
const refresh = () => revalidatePath("/", "layout");
const season = () => arcSeason(todayIn("UTC")).year;

/** Shake, sound and wording of the opening scene, and the surprise messages. */
export async function saveArcSettingsAction(intro: unknown, surprises: unknown): Promise<Result> {
  await requireAdmin();
  await saveArcSettings(intro, surprises); // normalised there: unknown options and over-long text never reach the database
  refresh();
  return { ok: true };
}

export async function savePack(idInput: number | null, nameInput: string, iconInput: string, taglineInput: string, kindInput: string = "arc"): Promise<Result> {
  await requireAdmin();
  const name = clean(nameInput, 60);
  const icon = clean(iconInput, 10) || "❄️";
  const tagline = clean(taglineInput, 160);
  if (name.length < 2) return { ok: false, error: "Give the pack a name (at least 2 characters)." };
  try {
    if (idInput === null) {
      const count = await queryOne<{ n: number | string }>("SELECT COUNT(*) AS n FROM arc_packs");
      if (Number(count?.n ?? 0) >= 20) return { ok: false, error: "20 packs is the most there can be." };
      // who it is for is chosen once, when the pack is made: people may already be on it later
      await execute("INSERT INTO arc_packs (name, icon, tagline, kind) VALUES (?, ?, ?, ?)", [name, icon, tagline, kindInput === "open" ? "open" : "arc"]);
    } else {
      const id = toId(idInput);
      if (!id) return INVALID;
      const changed = await execute("UPDATE arc_packs SET name = ?, icon = ?, tagline = ? WHERE id = ?", [name, icon, tagline, id]);
      if (!changed.rowCount) return { ok: false, error: "Pack not found." };
    }
  } catch (err) {
    if (isDuplicateError(err)) return { ok: false, error: "Another pack already has that name." };
    throw err;
  }
  refresh();
  return { ok: true };
}

/** Hide a pack from people joining (those already on it keep it), or show it again. */
export async function togglePack(idInput: number): Promise<Result> {
  await requireAdmin();
  const id = toId(idInput);
  if (!id) return INVALID;
  await execute("UPDATE arc_packs SET is_active = 1 - is_active WHERE id = ?", [id]);
  refresh();
  return { ok: true };
}

/** Deletes the pack. Members who were on it keep the habits it gave them, as ordinary habits. */
export async function deletePack(idInput: number): Promise<Result> {
  await requireAdmin();
  const id = toId(idInput);
  if (!id) return INVALID;
  await execute("DELETE FROM arc_packs WHERE id = ?", [id]);
  refresh();
  return { ok: true };
}

/** Adds a habit to a pack — and creates it straight away for everyone already on that pack. */
export async function addPackHabit(packIdInput: number, nameInput: string, iconInput: string): Promise<Result> {
  await requireAdmin();
  const packId = toId(packIdInput);
  const name = clean(nameInput, 100);
  const icon = clean(iconInput, 10) || "✅";
  if (!packId) return INVALID;
  if (name.length < 2) return { ok: false, error: "Give the habit a name." };
  if (!(await queryOne("SELECT id FROM arc_packs WHERE id = ?", [packId]))) return { ok: false, error: "Pack not found." };
  if (await queryOne("SELECT id FROM arc_pack_habits WHERE pack_id = ? AND LOWER(name) = LOWER(?)", [packId, name])) return { ok: false, error: "That habit is already in this pack." };
  const count = await queryOne<{ n: number | string }>("SELECT COUNT(*) AS n FROM arc_pack_habits WHERE pack_id = ?", [packId]);
  if (Number(count?.n ?? 0) >= 10) return { ok: false, error: "A pack can hold 10 habits at most." };

  const created = await execute<{ id: number }>("INSERT INTO arc_pack_habits (pack_id, name, icon) VALUES (?, ?, ?) RETURNING id", [packId, name, icon]);
  const given = await givePackHabitToMembers(created.rows[0].id, season());
  refresh();
  return { ok: true, note: given ? `Added, and created for ${given} member${given === 1 ? "" : "s"} already on this pack.` : "Added." };
}

/**
 * Takes a habit out of a pack. With `everyone`, it also leaves the checklist
 * of members who got it from the pack (their past check-ins are kept).
 */
export async function removePackHabit(idInput: number, everyone: boolean): Promise<Result> {
  await requireAdmin();
  const id = toId(idInput);
  if (!id) return INVALID;
  if (everyone === true) await execute("UPDATE habits SET is_active = 0 WHERE arc_habit_id = ?", [id]);
  await execute("DELETE FROM arc_pack_habits WHERE id = ?", [id]);
  refresh();
  return { ok: true };
}

// ── Badges ───────────────────────────────────────────────────────────────────

type BadgeInput = { name: string; icon: string; description: string; rule: string; threshold: number };

export async function saveBadge(input: BadgeInput): Promise<Result> {
  await requireAdmin();
  const name = clean(input?.name, 40);
  const icon = clean(input?.icon, 10) || "🏅";
  const description = clean(input?.description, 160);
  const rule = BADGE_RULES.some((r) => r.value === input?.rule) ? input.rule : null;
  const threshold = Math.trunc(Number(input?.threshold));
  if (name.length < 2) return { ok: false, error: "Give the badge a name." };
  if (!rule) return INVALID;
  if (rule !== "manual" && !(threshold >= 1 && threshold <= 100_000)) return { ok: false, error: "Say how many it takes to earn (1 or more)." };
  const count = await queryOne<{ n: number | string }>("SELECT COUNT(*) AS n FROM arc_badges");
  if (Number(count?.n ?? 0) >= 30) return { ok: false, error: "30 badges is the most there can be." };
  try {
    await execute("INSERT INTO arc_badges (name, icon, description, rule, threshold) VALUES (?, ?, ?, ?, ?)", [name, icon, description, rule, rule === "manual" ? 0 : threshold]);
  } catch (err) {
    if (isDuplicateError(err)) return { ok: false, error: "Another badge already has that name." };
    throw err;
  }
  refresh();
  return { ok: true };
}

export async function deleteBadge(idInput: number): Promise<Result> {
  await requireAdmin();
  const id = toId(idInput);
  if (!id) return INVALID;
  await execute("DELETE FROM arc_badges WHERE id = ?", [id]); // user_badges rows go with it
  refresh();
  return { ok: true };
}

/** Give a hand-awarded badge to someone (by username), or take it back. */
export async function setBadgeHolder(badgeIdInput: number, usernameInput: string, give: boolean): Promise<Result> {
  await requireAdmin();
  const badgeId = toId(badgeIdInput);
  const username = clean(usernameInput, 50).replace(/^@/, "");
  if (!badgeId || !username) return INVALID;
  const badge = await queryOne<{ rule: string }>("SELECT rule FROM arc_badges WHERE id = ?", [badgeId]);
  if (!badge) return { ok: false, error: "Badge not found." };
  if (badge.rule !== "manual") return { ok: false, error: "That badge is earned automatically." };
  const user = await queryOne<{ id: number; full_name: string }>("SELECT id, full_name FROM users WHERE LOWER(username) = LOWER(?) AND role = 'user'", [username]);
  if (!user) return { ok: false, error: `No member is called @${username}.` };
  if (give === true) await execute("INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?) ON CONFLICT DO NOTHING", [user.id, badgeId]);
  else await execute("DELETE FROM user_badges WHERE user_id = ? AND badge_id = ?", [user.id, badgeId]);
  refresh();
  return { ok: true, note: give === true ? `Given to ${user.full_name}.` : `Taken back from ${user.full_name}.` };
}
