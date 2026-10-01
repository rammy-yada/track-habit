import "server-only";
import { query, queryOne } from "./db";
import { arcSeason, isArcMember } from "./arc";
import { countPerfectDays, getMemberPack, getOpenPacks } from "./arc-packs";
import { getArcSettings } from "./arc-settings";
import type { User } from "./auth";
import { addDays, daysInMonth, formatDate, formatTime, todayIn } from "./dates";
import { decodeEntities } from "./text";
import type { Mood } from "./constants";

type HabitRow = {
  id: number;
  name: string;
  description: string | null;
  category: string;
  icon: string;
  color: string;
  frequency: "daily" | "weekly" | "monthly";
  target_count: number;
  reminder_time: string | null;
  /** The Winter Arc season this habit belongs to, if it came from a pack. */
  arc_season: number | null;
  /** The day it was created (YYYY-MM-DD). */
  created: string;
  /** The pack-for-everyone this habit came from, if any. */
  pack_id: number | null;
};

export type HabitView = {
  id: number;
  name: string;
  category: string;
  icon: string;
  color: string;
  frequency: string;
  reminder: string | null;
  /** Raw values, for the edit form. */
  description: string;
  target: number;
  reminderTime: string;
  doneToday: boolean;
  /** Part of this season's Winter Arc pack: shown in its own section. */
  arc: boolean;
  /** The pack-for-everyone it belongs to (shown as a section of its own), or null. */
  packId: number | null;
  /** Consecutive completed days ending yesterday; today adds one when done. */
  streakBefore: number;
  /** The six days before today, oldest first. */
  week: boolean[];
  /** All-time check-ins, not counting today. */
  totalBefore: number;
  /** Days of the current month already completed, not counting today. */
  monthDays: number[];
  mood: Mood | null;
  notes: string;
};

export type Category = { id: number; name: string; icon: string };

async function activeHabits(userId: number): Promise<HabitRow[]> {
  const rows = await query<HabitRow>(
    `SELECT h.id, h.name, h.description, h.category, h.icon, h.color, h.frequency, h.target_count, h.reminder_time, h.arc_season, h.created_at::date::text AS created,
            (SELECT pm.pack_id FROM arc_pack_habits t JOIN pack_members pm ON pm.pack_id = t.pack_id AND pm.user_id = h.user_id WHERE t.id = h.arc_habit_id AND h.arc_season IS NULL) AS pack_id
     FROM habits h WHERE h.user_id = ? AND h.is_active = 1 ORDER BY h.created_at ASC, h.id ASC`,
    [userId],
  );
  return rows.map((h) => ({ ...h, name: decodeEntities(h.name), category: decodeEntities(h.category) }));
}

export async function getCategories(): Promise<Category[]> {
  const rows = await query<Category>("SELECT id, name, icon FROM categories ORDER BY name ASC");
  return rows.map((c) => ({ ...c, name: decodeEntities(c.name) }));
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboard(user: User) {
  const today = todayIn(user.timezone);
  const [habits, logs, totals, todayNotes, categories, packs] = await Promise.all([
    activeHabits(user.id),
    // One query for a year of history instead of one query per habit per day.
    query<{ habit_id: number; log_date: string }>(
      "SELECT habit_id, log_date FROM habit_logs WHERE user_id = ? AND completed_count > 0 AND log_date BETWEEN ? AND ?",
      [user.id, addDays(today, -366), today],
    ),
    query<{ habit_id: number; total: number }>(
      "SELECT habit_id, COUNT(*) AS total FROM habit_logs WHERE user_id = ? AND completed_count > 0 GROUP BY habit_id",
      [user.id],
    ),
    query<{ habit_id: number; mood: Mood | null; notes: string | null }>(
      "SELECT habit_id, mood, notes FROM habit_logs WHERE user_id = ? AND log_date = ?",
      [user.id, today],
    ),
    getCategories(),
    getOpenPacks(user.id),
  ]);

  const doneDates = new Map<number, Set<string>>();
  for (const log of logs) {
    if (!doneDates.has(log.habit_id)) doneDates.set(log.habit_id, new Set());
    doneDates.get(log.habit_id)!.add(log.log_date);
  }
  const totalByHabit = new Map(totals.map((t) => [t.habit_id, Number(t.total)]));
  const noteByHabit = new Map(todayNotes.map((n) => [n.habit_id, n]));
  const monthPrefix = today.slice(0, 8);
  const season = arcSeason(today);
  const arcHabits = season.live ? habits.filter((h) => h.arc_season === season.year) : [];

  const views: HabitView[] = habits.map((h) => {
    const dates = doneDates.get(h.id) ?? new Set<string>();
    const doneToday = dates.has(today);
    let streakBefore = 0;
    while (streakBefore < 366 && dates.has(addDays(today, -1 - streakBefore))) streakBefore++;
    return {
      id: h.id,
      name: h.name,
      category: h.category,
      icon: h.icon,
      color: h.color,
      frequency: h.frequency,
      reminder: h.reminder_time ? formatTime(h.reminder_time) : null,
      description: decodeEntities(h.description),
      target: h.target_count ?? 1,
      reminderTime: h.reminder_time?.slice(0, 5) ?? "",
      doneToday,
      arc: arcHabits.includes(h),
      packId: arcHabits.includes(h) ? null : h.pack_id,
      streakBefore,
      week: [6, 5, 4, 3, 2, 1].map((back) => dates.has(addDays(today, -back))),
      totalBefore: (totalByHabit.get(h.id) ?? 0) - (doneToday ? 1 : 0),
      monthDays: [...dates].filter((d) => d.startsWith(monthPrefix) && d !== today).map((d) => Number(d.slice(8))),
      mood: noteByHabit.get(h.id)?.mood ?? null,
      notes: noteByHabit.get(h.id)?.notes ?? "",
    };
  });

  // Habits completed per day, last 30 days up to yesterday (today is live on the client).
  const activeIds = new Set(habits.map((h) => h.id));
  const perDay = new Map<string, number>();
  for (const log of logs) if (activeIds.has(log.habit_id)) perDay.set(log.log_date, (perDay.get(log.log_date) ?? 0) + 1);
  const trend = Array.from({ length: 30 }, (_, i) => {
    const date = addDays(today, i - 30);
    return { label: formatDate(date, { month: "short", day: "numeric" }), value: perDay.get(date) ?? 0 };
  });

  // The Winter Arc section: which pack, how many perfect days so far (not
  // counting today, which is still live on the client), and the surprises.
  let arc: { pack: string | null; day: number; totalDays: number; perfectBefore: number; surprises: string[] } | null = null;
  if (arcHabits.length > 0) {
    const [pack, settings] = await Promise.all([getMemberPack(user.id, season.year), getArcSettings()]);
    arc = { pack: pack ? `${pack.icon} ${pack.name}` : null, day: season.day, totalDays: season.totalDays, perfectBefore: countPerfectDays(arcHabits, doneDates, season.start, addDays(today, -1)), surprises: settings.surprises };
  }

  // while the season is running, someone who hasn't joined is shown the way in
  const arcInvite = season.live && arcHabits.length === 0 && !(await isArcMember(user)) ? { day: season.day, totalDays: season.totalDays } : null;

  return {
    today,
    arc,
    arcInvite,
    packs,
    todayLabel: formatDate(today, { weekday: "short", month: "short", day: "numeric" }),
    monthLabel: formatDate(today, { month: "long", year: "numeric" }),
    daysInMonth: daysInMonth(Number(today.slice(0, 4)), Number(today.slice(5, 7))),
    habits: views,
    trend,
    categories,
  };
}

// ── Analytics ────────────────────────────────────────────────────────────────

export async function getAnalytics(user: User) {
  const today = todayIn(user.timezone);
  const count = async (sql: string, params: (string | number)[]) => Number((await queryOne<{ n: number }>(sql, params))?.n ?? 0);

  const [totalHabits, todayDone, activeDays, totalCheckins, recent, categories, habitStats, dow, moods] = await Promise.all([
    count("SELECT COUNT(*) AS n FROM habits WHERE user_id = ? AND is_active = 1", [user.id]),
    count(
      "SELECT COUNT(*) AS n FROM habit_logs hl JOIN habits h ON h.id = hl.habit_id AND h.is_active = 1 WHERE hl.user_id = ? AND hl.log_date = ? AND hl.completed_count > 0",
      [user.id, today],
    ),
    count("SELECT COUNT(DISTINCT log_date) AS n FROM habit_logs WHERE user_id = ? AND completed_count > 0", [user.id]),
    count("SELECT COUNT(*) AS n FROM habit_logs WHERE user_id = ? AND completed_count > 0", [user.id]),
    query<{ log_date: string; n: number }>(
      "SELECT log_date, COUNT(*) AS n FROM habit_logs WHERE user_id = ? AND completed_count > 0 AND log_date BETWEEN ? AND ? GROUP BY log_date",
      [user.id, addDays(today, -27), today],
    ),
    query<{ category: string; n: number }>(
      `SELECT h.category, COUNT(hl.id) AS n
       FROM habits h LEFT JOIN habit_logs hl ON h.id = hl.habit_id AND hl.completed_count > 0
       WHERE h.user_id = ? AND h.is_active = 1
       GROUP BY h.category ORDER BY n DESC`,
      [user.id],
    ),
    query<{ id: number; name: string; icon: string; color: string; total_done: number; month_done: number }>(
      `SELECT h.id, h.name, h.icon, h.color,
              COUNT(hl.id) AS total_done,
              COUNT(hl.id) FILTER (WHERE hl.log_date > ?) AS month_done
       FROM habits h LEFT JOIN habit_logs hl ON h.id = hl.habit_id AND hl.completed_count > 0
       WHERE h.user_id = ? AND h.is_active = 1
       GROUP BY h.id, h.name, h.icon, h.color ORDER BY total_done DESC`,
      [addDays(today, -30), user.id],
    ),
    query<{ dow: number; n: number }>(
      "SELECT EXTRACT(DOW FROM log_date)::int AS dow, COUNT(*) AS n FROM habit_logs WHERE user_id = ? AND completed_count > 0 GROUP BY dow",
      [user.id],
    ),
    query<{ mood: Mood; n: number }>("SELECT mood, COUNT(*) AS n FROM habit_logs WHERE user_id = ? AND mood IS NOT NULL GROUP BY mood", [user.id]),
  ]);

  // Four 7-day windows ending today, oldest first.
  const byDate = new Map(recent.map((r) => [r.log_date, Number(r.n)]));
  const weekly = [3, 2, 1, 0].map((weeksAgo) => {
    let value = 0;
    for (let d = 0; d < 7; d++) value += byDate.get(addDays(today, -(weeksAgo * 7 + d))) ?? 0;
    const start = addDays(today, -(weeksAgo * 7 + 6));
    return { label: weeksAgo === 0 ? "This week" : `${formatDate(start, { month: "short", day: "numeric" })}`, value };
  });

  const dowCounts = Array<number>(7).fill(0);
  for (const row of dow) dowCounts[Number(row.dow)] = Number(row.n);
  const moodCounts = new Map(moods.map((m) => [m.mood, Number(m.n)]));

  return {
    todayLabel: formatDate(today, { month: "short", day: "numeric", year: "numeric" }),
    totalHabits,
    todayDone,
    activeDays,
    totalCheckins,
    weekly,
    dayOfWeek: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label, i) => ({ label, value: dowCounts[i] })),
    categories: categories.map((c) => ({ label: decodeEntities(c.category), value: Number(c.n) })),
    moods: (["great", "good", "okay", "bad"] as const).map((mood) => ({ mood, value: moodCounts.get(mood) ?? 0 })),
    habits: habitStats.map((h) => ({
      id: h.id,
      name: decodeEntities(h.name),
      icon: h.icon,
      color: h.color,
      total: Number(h.total_done),
      percent: Math.min(100, Math.round((Number(h.month_done) / 30) * 100)),
    })),
  };
}

// ── Monthly grid ─────────────────────────────────────────────────────────────

export async function getMonthly(user: User, yearParam?: string, monthParam?: string) {
  const today = todayIn(user.timezone);
  const currentYear = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7));

  let year = Number.parseInt(yearParam ?? "", 10);
  let month = Number.parseInt(monthParam ?? "", 10);
  if (!Number.isFinite(year)) year = currentYear;
  if (!Number.isFinite(month)) month = currentMonth;
  year = Math.max(2020, Math.min(year, currentYear));
  month = Math.max(1, Math.min(12, month));
  if (year === currentYear && month > currentMonth) month = currentMonth;

  const pad = (n: number) => String(n).padStart(2, "0");
  const days = daysInMonth(year, month);
  const start = `${year}-${pad(month)}-01`;
  const end = `${year}-${pad(month)}-${pad(days)}`;

  const [habits, logs] = await Promise.all([
    activeHabits(user.id),
    query<{ habit_id: number; log_date: string }>(
      "SELECT habit_id, log_date FROM habit_logs WHERE user_id = ? AND log_date BETWEEN ? AND ? AND completed_count > 0",
      [user.id, start, end],
    ),
  ]);

  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const canGoNext = next.y < currentYear || (next.y === currentYear && next.m <= currentMonth);
  const canGoPrev = prev.y >= 2020;

  return {
    key: `${year}-${pad(month)}`,
    label: formatDate(start, { month: "long", year: "numeric" }),
    today,
    days: Array.from({ length: days }, (_, i) => {
      const date = `${year}-${pad(month)}-${pad(i + 1)}`;
      return { day: i + 1, date, weekday: formatDate(date, { weekday: "short" }), isToday: date === today, isPast: date <= today };
    }),
    habits: habits.map((h) => ({ id: h.id, name: h.name, icon: h.icon, color: h.color })),
    done: logs.map((l) => `${l.habit_id}:${l.log_date}`),
    prevHref: canGoPrev ? `/monthly?y=${prev.y}&m=${prev.m}` : null,
    nextHref: canGoNext ? `/monthly?y=${next.y}&m=${next.m}` : null,
  };
}

// ── Profile ──────────────────────────────────────────────────────────────────

export async function getProfileStats(userId: number) {
  const [habits, checkins] = await Promise.all([
    queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM habits WHERE user_id = ? AND is_active = 1", [userId]),
    queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM habit_logs WHERE user_id = ? AND completed_count > 0", [userId]),
  ]);
  return { habits: Number(habits?.n ?? 0), checkins: Number(checkins?.n ?? 0) };
}
