import "server-only";
import { arcSeason } from "./arc";
import type { User } from "./auth";
import { getArcSettings } from "./arc-settings";
import { addDays, todayIn } from "./dates";
import { execute, query, queryOne } from "./db";
import { decodeEntities } from "./text";

/**
 * Two kinds of pack:
 *   "arc"  — chosen when joining the Winter Arc; one per member per season.
 *   "open" — for everyone: any member can add it from their Today screen.
 */
export type PackKind = "arc" | "open";
export type Pack = { id: number; kind: PackKind; name: string; tagline: string; icon: string; active: boolean; members: number; habits: { id: number; name: string; icon: string }[] };

/** Packs with their habits. `season` adds how many members are on each. */
export async function getPacks(options: { activeOnly?: boolean; season?: number; kind?: PackKind } = {}): Promise<Pack[]> {
  const [packs, habits, counts] = await Promise.all([
    query<{ id: number; kind: PackKind; name: string; tagline: string; icon: string; is_active: number }>(`SELECT id, kind, name, tagline, icon, is_active FROM arc_packs ${options.activeOnly ? "WHERE is_active = 1" : ""} ORDER BY id`),
    query<{ id: number; pack_id: number; name: string; icon: string }>("SELECT id, pack_id, name, icon FROM arc_pack_habits ORDER BY id"),
    options.season
      ? query<{ pack_id: number; n: number | string }>(
          `SELECT pack_id, COUNT(*) AS n FROM (
             SELECT pack_id FROM winter_arc_members WHERE season = ? AND pack_id IS NOT NULL
             UNION ALL SELECT pack_id FROM pack_members
           ) m GROUP BY pack_id`,
          [options.season],
        )
      : Promise.resolve([]),
  ]);
  const members = new Map(counts.map((c) => [c.pack_id, Number(c.n)]));
  return packs
    .filter((p) => !options.kind || p.kind === options.kind)
    .map((p) => ({ id: p.id, kind: p.kind, name: p.name, tagline: p.tagline, icon: p.icon, active: p.is_active === 1, members: members.get(p.id) ?? 0, habits: habits.filter((h) => h.pack_id === p.id).map(({ id, name, icon }) => ({ id, name, icon })) }))
    .filter((p) => !options.activeOnly || p.habits.length > 0); // an empty pack isn't offered to members
}

/** The packs for everyone, as one member sees them: which they have added, which they could. (One query: this runs on every load of Today.) */
export async function getOpenPacks(userId: number) {
  const rows = await query<{ id: number; name: string; icon: string; tagline: string; is_active: number; joined: boolean; habits: string[] }>(
    `SELECT p.id, p.name, p.icon, p.tagline, p.is_active, (pm.user_id IS NOT NULL) AS joined,
            COALESCE(json_agg(t.icon || ' ' || t.name ORDER BY t.id) FILTER (WHERE t.id IS NOT NULL), '[]') AS habits
     FROM arc_packs p
     LEFT JOIN pack_members pm ON pm.pack_id = p.id AND pm.user_id = ?
     LEFT JOIN arc_pack_habits t ON t.pack_id = p.id
     WHERE p.kind = 'open'
     GROUP BY p.id, pm.user_id
     ORDER BY p.id`,
    [userId],
  );
  return rows
    .filter((p) => p.joined || (p.is_active === 1 && p.habits.length > 0)) // a hidden pack stays visible to those already on it
    .map(({ id, name, icon, tagline, joined, habits }) => ({ id, name, icon, tagline, joined, habits }));
}

/** The pack this member is on this season (null: not a member, or no pack chosen). */
export async function getMemberPack(userId: number, season: number): Promise<{ id: number; name: string; icon: string } | null> {
  return queryOne("SELECT p.id, p.name, p.icon FROM winter_arc_members m JOIN arc_packs p ON p.id = m.pack_id WHERE m.user_id = ? AND m.season = ?", [userId, season]);
}

const ARC_COLOR = "#64748b"; // the Winter Arc look is monochrome; this is what shows in the normal theme
const OPEN_COLOR = "#2563eb";

/**
 * Gives one member every habit of a pack. A habit they already have under the
 * same name is moved into the pack's section instead of being duplicated.
 * `season` is the Winter Arc season for an "arc" pack, null for an "open" one.
 * Returns how many habits are now in that section.
 */
export async function givePackHabits(userId: number, packId: number, season: number | null): Promise<number> {
  const templates = await query<{ id: number; name: string; icon: string }>("SELECT id, name, icon FROM arc_pack_habits WHERE pack_id = ? ORDER BY id", [packId]);
  const mine = await query<{ id: number; name: string }>("SELECT id, name FROM habits WHERE user_id = ? AND is_active = 1", [userId]);
  const byName = new Map(mine.map((h) => [decodeEntities(h.name).toLowerCase(), h.id]));
  const category = (await queryOne("SELECT id FROM categories WHERE name = 'Health'")) ? "Health" : "General";
  for (const t of templates) {
    const existing = byName.get(t.name.toLowerCase());
    if (existing) await execute("UPDATE habits SET arc_habit_id = ?, arc_season = ? WHERE id = ? AND user_id = ?", [t.id, season, existing, userId]);
    else await execute("INSERT INTO habits (user_id, name, description, category, icon, color, frequency, target_count, arc_habit_id, arc_season) VALUES (?, ?, '', ?, ?, ?, 'daily', 1, ?, ?)", [userId, t.name, category, t.icon, season ? ARC_COLOR : OPEN_COLOR, t.id, season]);
  }
  return templates.length;
}

// Everyone on a pack: Winter Arc members who chose it this season (their
// habits carry the season), and members who added an "open" pack (no season).
const PACK_PEOPLE = `(
  SELECT user_id, pack_id, season FROM winter_arc_members WHERE season = ? AND pack_id IS NOT NULL
  UNION ALL SELECT user_id, pack_id, NULL::int FROM pack_members
)`;

/** A habit was added to a pack: create it for everyone already on that pack. */
export async function givePackHabitToMembers(templateId: number, season: number): Promise<number> {
  const category = (await queryOne("SELECT id FROM categories WHERE name = 'Health'")) ? "Health" : "General";
  const result = await execute(
    `INSERT INTO habits (user_id, name, description, category, icon, color, frequency, target_count, arc_habit_id, arc_season)
     SELECT m.user_id, t.name, '', ?, t.icon, CASE WHEN m.season IS NULL THEN '${OPEN_COLOR}' ELSE '${ARC_COLOR}' END, 'daily', 1, t.id, m.season
     FROM arc_pack_habits t
     JOIN ${PACK_PEOPLE} m ON m.pack_id = t.pack_id
     WHERE t.id = ?
       AND NOT EXISTS (SELECT 1 FROM habits h WHERE h.user_id = m.user_id AND h.is_active = 1 AND LOWER(h.name) = LOWER(t.name))`,
    [category, season, templateId],
  );
  // anyone who already had a habit of that name: it moves into the pack's section
  await execute(
    `UPDATE habits h SET arc_habit_id = t.id, arc_season = m.season
     FROM arc_pack_habits t JOIN ${PACK_PEOPLE} m ON m.pack_id = t.pack_id
     WHERE t.id = ? AND h.user_id = m.user_id AND h.is_active = 1 AND h.arc_habit_id IS NULL AND LOWER(h.name) = LOWER(t.name)`,
    [season, templateId],
  );
  return result.rowCount;
}

/**
 * How many days in a range were "perfect": every Winter Arc habit the person
 * had on that day was done. A habit only counts from the day it was created,
 * so one added to the pack mid-season doesn't spoil the days before it.
 */
export function countPerfectDays(habits: { id: number; created: string }[], done: Map<number, Set<string>>, from: string, to: string): number {
  let perfect = 0;
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const due = habits.filter((h) => h.created <= day);
    if (due.length > 0 && due.every((h) => done.get(h.id)?.has(day))) perfect++;
  }
  return perfect;
}

/** What the "Your pack" panel on the Winter Arc screen shows. */
export async function getArcPanel(user: User) {
  const today = todayIn(user.timezone);
  const season = arcSeason(today);
  const [pack, habits, packs, settings] = await Promise.all([
    getMemberPack(user.id, season.year),
    query<{ id: number; name: string; icon: string; created: string }>("SELECT id, name, icon, created_at::date::text AS created FROM habits WHERE user_id = ? AND is_active = 1 AND arc_season = ? ORDER BY id", [user.id, season.year]),
    getPacks({ activeOnly: true, kind: "arc" }),
    getArcSettings(),
  ]);
  const logs = habits.length ? await query<{ habit_id: number; log_date: string }>("SELECT habit_id, log_date FROM habit_logs WHERE user_id = ? AND completed_count > 0 AND log_date BETWEEN ? AND ?", [user.id, season.start, today]) : [];
  const done = new Map<number, Set<string>>();
  for (const log of logs) {
    if (!done.has(log.habit_id)) done.set(log.habit_id, new Set());
    done.get(log.habit_id)!.add(log.log_date);
  }
  return {
    today,
    pack,
    packs: packs.map(({ id, name, icon, tagline, habits: list }) => ({ id, name, icon, tagline, habits: list.map((h) => `${h.icon} ${h.name}`) })),
    habits: habits.map((h) => ({ id: h.id, name: decodeEntities(h.name), icon: h.icon, doneToday: done.get(h.id)?.has(today) ?? false })),
    perfectDays: season.live ? countPerfectDays(habits, done, season.start, today) : 0,
    /** The same count without today, which is still live on the device. */
    perfectBefore: season.live ? countPerfectDays(habits, done, season.start, addDays(today, -1)) : 0,
    live: season.live,
    surprises: settings.surprises,
  };
}
