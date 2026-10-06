import "server-only";
import { addDays } from "./dates";
import { arcDayPoints, arcSeason } from "./arc";
import type { BadgeRule } from "./arc-config";
import { countPerfectDays } from "./arc-packs";
import { query } from "./db";

export type Badge = { id: number; name: string; icon: string; description: string; rule: BadgeRule; threshold: number };
export type ShownBadge = Badge & { earned: boolean; /** how far along, 0 to 1 (automatic badges) */ progress: number };

/** Every badge, with who holds each hand-given one (for the admin screen). */
export async function getBadges(): Promise<(Badge & { holders: number; holderNames: string[] })[]> {
  const rows = await query<Badge & { holder_names: string[] }>(
    `SELECT b.id, b.name, b.icon, b.description, b.rule, b.threshold,
            COALESCE((SELECT json_agg(u.username ORDER BY ub.awarded_at) FROM user_badges ub JOIN users u ON u.id = ub.user_id WHERE ub.badge_id = b.id), '[]') AS holder_names
     FROM arc_badges b ORDER BY b.rule = 'manual', b.threshold, b.id`,
  );
  return rows.map(({ holder_names, ...b }) => ({ ...b, holders: holder_names.length, holderNames: holder_names.slice(0, 40) }));
}

/** One member's numbers for this season: what the automatic badges are measured against. */
export async function arcNumbers(userId: number, today: string) {
  const season = arcSeason(today);
  const [days, habits] = await Promise.all([
    query<{ log_date: string; n: number | string }>(
      "SELECT log_date, COUNT(*) AS n FROM habit_logs WHERE user_id = ? AND completed_count > 0 AND log_date BETWEEN ? AND ? AND ABS(completed_at::date - log_date) <= 1 GROUP BY log_date",
      [userId, season.start, season.end],
    ),
    query<{ id: number; created: string }>("SELECT id, created_at::date::text AS created FROM habits WHERE user_id = ? AND is_active = 1 AND arc_season = ?", [userId, season.year]),
  ]);
  const scored = new Set(days.map((d) => d.log_date));
  const bonus = await query<{ n: number | string }>("SELECT COALESCE(SUM(points), 0) AS n FROM arc_bonus WHERE user_id = ? AND season = ?", [userId, season.year]);
  const points = days.reduce((sum, d) => sum + arcDayPoints(Number(d.n)), 0) + Number(bonus[0]?.n ?? 0);
  let streak = 0;
  let cursor = scored.has(today) ? today : addDays(today, -1);
  while (scored.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  let perfect = 0;
  if (habits.length && season.live) {
    const logs = await query<{ habit_id: number; log_date: string }>("SELECT habit_id, log_date FROM habit_logs WHERE user_id = ? AND completed_count > 0 AND log_date BETWEEN ? AND ?", [userId, season.start, today]);
    const done = new Map<number, Set<string>>();
    for (const log of logs) {
      if (!done.has(log.habit_id)) done.set(log.habit_id, new Set());
      done.get(log.habit_id)!.add(log.log_date);
    }
    perfect = countPerfectDays(habits, done, season.start, today);
  }
  return { points, streak, perfect, activeDays: days.length };
}

/** Every badge as one member sees it: earned or not, and how close. */
export async function badgesFor(userId: number, numbers: { points: number; streak: number; perfect: number }): Promise<ShownBadge[]> {
  const [badges, given] = await Promise.all([query<Badge>("SELECT id, name, icon, description, rule, threshold FROM arc_badges ORDER BY rule = 'manual', threshold, id"), query<{ badge_id: number }>("SELECT badge_id FROM user_badges WHERE user_id = ?", [userId])]);
  const mine = new Set(given.map((g) => g.badge_id));
  return badges.map((badge) => {
    if (badge.rule === "manual") return { ...badge, earned: mine.has(badge.id), progress: mine.has(badge.id) ? 1 : 0 };
    const value = numbers[badge.rule];
    return { ...badge, earned: value >= badge.threshold, progress: badge.threshold > 0 ? Math.min(1, value / badge.threshold) : 1 };
  });
}
