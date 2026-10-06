import "server-only";
import { query } from "./db";
import { WORKOUT_CATEGORIES, WORKOUTS } from "./workouts";

export type PopularItem = { name: string; icon: string; group: string; people: number; mine: boolean };

/**
 * The habits most people here are doing. Only habits from the built-in list
 * and from the admin's packs are counted and shown: what someone typed in for
 * themselves is private, and never appears here however many people share it.
 */
export async function getPopular(userId: number): Promise<PopularItem[]> {
  const packHabits = await query<{ name: string; icon: string; pack: string }>("SELECT t.name, t.icon, p.name AS pack FROM arc_pack_habits t JOIN arc_packs p ON p.id = t.pack_id WHERE p.is_active = 1");
  const known = new Map<string, { name: string; icon: string; group: string }>();
  for (const w of WORKOUTS) known.set(w.name.toLowerCase(), { name: w.name, icon: w.icon, group: WORKOUT_CATEGORIES.find((c) => c.id === w.category)?.label ?? "" });
  for (const h of packHabits) if (!known.has(h.name.toLowerCase())) known.set(h.name.toLowerCase(), { name: h.name, icon: h.icon, group: `${h.pack} pack` });

  const counts = await query<{ n: string; people: number | string; mine: boolean }>(
    "SELECT LOWER(name) AS n, COUNT(DISTINCT user_id) AS people, BOOL_OR(user_id = ?) AS mine FROM habits WHERE is_active = 1 AND LOWER(name) = ANY(?::text[]) GROUP BY 1",
    [userId, `{${[...known.keys()].map((k) => `"${k.replace(/["\\]/g, "")}"`).join(",")}}`],
  );
  const byName = new Map(counts.map((c) => [c.n, c]));
  return [...known.entries()]
    .map(([key, item]) => ({ ...item, people: Number(byName.get(key)?.people ?? 0), mine: byName.get(key)?.mine === true }))
    .sort((a, b) => b.people - a.people || a.name.localeCompare(b.name))
    .slice(0, 24);
}
