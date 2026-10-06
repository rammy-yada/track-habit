import "server-only";
import { query, queryOne } from "./db";
import type { User } from "./auth";
import { addDays, diffDays, formatDate, todayIn } from "./dates";
import { decodeEntities } from "./text";

// ── The Winter Arc: Oct 1 – Jan 31 ───────────────────────────────────────────
// A season is named after the year it starts in, and runs across New Year:
// January still belongs to the season that began the previous October.

export const ARC_POINTS_PER_HABIT = 10;
export const ARC_HABITS_PER_DAY = 5; // only the first five habits of a day score
export const ARC_FULL_DAY_BONUS = 10; // extra for a day with all five
/** The most one day can earn. */
export const ARC_DAILY_MAX = ARC_HABITS_PER_DAY * ARC_POINTS_PER_HABIT + ARC_FULL_DAY_BONUS;
/** Points for a day with this many ticks. (The same sum is written in SQL below.) */
export const arcDayPoints = (ticks: number) => Math.min(ticks, ARC_HABITS_PER_DAY) * ARC_POINTS_PER_HABIT + (ticks >= ARC_HABITS_PER_DAY ? ARC_FULL_DAY_BONUS : 0);
/** SQL for a member's admin-given bonus points this season. */
export const BONUS_SQL = "COALESCE((SELECT SUM(b.points) FROM arc_bonus b WHERE b.user_id = m.user_id AND b.season = m.season), 0)";

export function arcSeason(today: string) {
  const calendarYear = Number(today.slice(0, 4));
  const year = Number(today.slice(5, 7)) === 1 ? calendarYear - 1 : calendarYear;
  const start = `${year}-10-01`;
  const end = `${year + 1}-01-31`;
  const live = today >= start && today <= end;
  return {
    year,
    start,
    end,
    live,
    totalDays: diffDays(start, end) + 1,
    day: live ? diffDays(start, today) + 1 : 0,
    startsIn: live ? 0 : Math.max(0, diffDays(today, start)),
    range: `${formatDate(start, { month: "short", day: "numeric" })} – ${formatDate(end, { month: "short", day: "numeric", year: "numeric" })}`,
  };
}

/** Is this person in the current season? (One small query; used to switch their account into the Winter Arc look.) */
export async function isArcMember(user: User): Promise<boolean> {
  const { year } = arcSeason(todayIn(user.timezone));
  return (await queryOne("SELECT 1 AS yes FROM winter_arc_members WHERE user_id = ? AND season = ?", [user.id, year])) !== null;
}

// One row per user per day: points for that day, capped at five habits.
// A tick only scores if it was made on (or within a day of) the day it is
// for — filling in old days from the monthly grid fixes your record but
// doesn't move you up the leaderboard.
const DAILY_POINTS = `
  SELECT user_id, log_date, LEAST(COUNT(*), ${ARC_HABITS_PER_DAY}) * ${ARC_POINTS_PER_HABIT} + CASE WHEN COUNT(*) >= ${ARC_HABITS_PER_DAY} THEN ${ARC_FULL_DAY_BONUS} ELSE 0 END AS pts
  FROM habit_logs
  WHERE completed_count > 0 AND log_date BETWEEN ? AND ?
    AND ABS(completed_at::date - log_date) <= 1
  GROUP BY user_id, log_date`;

type BoardRow = { id: number; username: string; full_name: string; avatar_color: string; avatar_version: number; points: number | string; active_days: number | string };

/** "Tom Legacy" → "Tom L." — enough to recognise a friend, not a full name. */
function publicName(fullName: string): string {
  const parts = decodeEntities(fullName).trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
}

export async function getArc(user: User) {
  const today = todayIn(user.timezone);
  const season = arcSeason(today);

  const [rows, myDays] = await Promise.all([
    query<BoardRow>(
      `SELECT u.id, u.username, u.full_name, u.avatar_color, u.avatar_version,
              COALESCE(SUM(d.pts), 0) + ${BONUS_SQL} AS points, COUNT(d.log_date) AS active_days
       FROM winter_arc_members m
       JOIN users u ON u.id = m.user_id AND u.is_active = 1
       LEFT JOIN (${DAILY_POINTS}) d ON d.user_id = m.user_id
       WHERE m.season = ?
       GROUP BY u.id, u.username, u.full_name, u.avatar_color, u.avatar_version, m.joined_at, m.user_id, m.season
       ORDER BY points DESC, active_days DESC, m.joined_at ASC, u.id ASC`,
      [season.start, season.end, season.year],
    ),
    query<{ log_date: string; pts: number | string }>(`SELECT log_date, pts FROM (${DAILY_POINTS}) d WHERE user_id = ?`, [season.start, season.end, user.id]),
  ]);

  const board = rows.map((row, i) => ({
    rank: i + 1,
    name: publicName(row.full_name),
    username: row.username,
    color: row.avatar_color,
    avatar: { id: row.id, name: publicName(row.full_name), color: row.avatar_color, version: row.avatar_version },
    points: Number(row.points),
    activeDays: Number(row.active_days),
    isMe: row.id === user.id,
  }));
  const mine = board.find((entry) => entry.isMe) ?? null;

  // Current run of scoring days, counted back from today (or yesterday, if today isn't ticked yet).
  const scored = new Map(myDays.map((d) => [d.log_date, Number(d.pts)]));
  let streak = 0;
  let cursor = scored.has(today) ? today : addDays(today, -1);
  while (scored.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }

  return {
    season,
    members: board.length,
    board: board.slice(0, 30),
    me: mine && { ...mine, streak, today: scored.get(today) ?? 0, dailyMax: ARC_DAILY_MAX },
  };
}
