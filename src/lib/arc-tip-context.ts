import "server-only";
import { arcSeason } from "./arc";
import { addDays, todayIn } from "./dates";
import { query, queryOne } from "./db";
import type { Situation } from "./arc-tips";
import { decodeEntities } from "./text";
import type { User } from "./auth";

/**
 * What a member's last days look like, for picking tips: the situations that
 * apply (most pressing first) and the habit they keep skipping, if any.
 */
export async function tipContext(user: User): Promise<{ situations: Situation[]; neglected: { name: string; days: number } | null }> {
  const today = todayIn(user.timezone);
  const season = arcSeason(today);
  const [member, habits, logs] = await Promise.all([
    queryOne<{ joined: string }>("SELECT joined_at::date::text AS joined FROM winter_arc_members WHERE user_id = ? AND season = ?", [user.id, season.year]),
    query<{ id: number; name: string; created: string }>("SELECT id, name, created_at::date::text AS created FROM habits WHERE user_id = ? AND is_active = 1 AND arc_season = ?", [user.id, season.year]),
    query<{ habit_id: number; log_date: string }>("SELECT habit_id, log_date::text AS log_date FROM habit_logs WHERE user_id = ? AND completed_count > 0 AND log_date BETWEEN ? AND ?", [user.id, addDays(today, -14), today]),
  ]);
  const situations: Situation[] = [];
  if (!member || habits.length === 0) return { situations: ["new"], neglected: null };

  const ids = new Set(habits.map((h) => h.id));
  const done = new Map<number, Set<string>>();
  for (const log of logs) if (ids.has(log.habit_id)) (done.get(log.habit_id) ?? done.set(log.habit_id, new Set()).get(log.habit_id)!).add(log.log_date);
  const ticked = (day: string) => habits.some((h) => done.get(h.id)?.has(day));
  const yesterday = addDays(today, -1);

  // the last seven days (not today): how much of the list got done
  let due = 0;
  let got = 0;
  for (let back = 1; back <= 7; back++) {
    const day = addDays(today, -back);
    for (const h of habits) {
      if (h.created > day) continue;
      due++;
      if (done.get(h.id)?.has(day)) got++;
    }
  }
  const rate = due ? got / due : 0;
  let streak = 0;
  while (streak < 14 && ticked(addDays(today, -1 - streak))) streak++;

  // the habit gone longest without a tick (3+ days, and at least 4 days old)
  let neglected: { name: string; days: number } | null = null;
  for (const h of habits) {
    if (h.created > addDays(today, -4) || done.get(h.id)?.has(today)) continue;
    let gap = 0;
    while (gap < 14 && !done.get(h.id)?.has(addDays(today, -1 - gap))) gap++;
    if (gap >= 3 && (!neglected || gap > neglected.days)) neglected = { name: decodeEntities(h.name), days: gap };
  }

  // an unknown timezone must not take the page down: then it is simply not "evening"
  let hour = 12;
  try {
    hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: user.timezone, hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  } catch {}
  const openToday = habits.some((h) => !done.get(h.id)?.has(today));

  if (member.joined > addDays(today, -3)) situations.push("new");
  if (!ticked(yesterday) && ticked(addDays(today, -2))) situations.push("missed");
  if (hour >= 18 && openToday) situations.push("evening");
  if (neglected) situations.push("neglect");
  if (due >= 3 && rate < 0.5) situations.push("struggling");
  if (streak >= 5) situations.push("streak");
  if (due >= 3 && rate >= 0.85) situations.push("strong");
  return { situations, neglected };
}
