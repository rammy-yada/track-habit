import "server-only";
import { query, queryOne } from "./db";
import { ARC_HABITS_PER_DAY, ARC_POINTS_PER_HABIT, arcSeason } from "./arc";
import { getCategories } from "./data";
import { addDays, formatDate, todayIn } from "./dates";
import { decodeEntities } from "./text";

// Everything the admin area reads. Admin screens show accounts and totals —
// never the contents of anyone's habits, notes or moods.

const num = async (sql: string, params: (string | number)[] = []) => Number((await queryOne<{ n: number | string }>(sql, params))?.n ?? 0);

function lastDays(rows: { day: string; n: number | string }[], today: string, days: number) {
  const byDay = new Map(rows.map((r) => [r.day, Number(r.n)]));
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - (days - 1));
    return { label: formatDate(date, { weekday: "short" }), value: byDay.get(date) ?? 0 };
  });
}

export async function getAdminOverview() {
  const today = (await queryOne<{ d: string }>("SELECT CURRENT_DATE::text AS d"))?.d ?? todayIn("UTC");
  const season = arcSeason(today);
  const [totalUsers, activeUsers, newThisWeek, admins, totalHabits, checkinsToday, arcMembers, withPhoto, activity, signups, popular, recent] = await Promise.all([
    num("SELECT COUNT(*) AS n FROM users"),
    num("SELECT COUNT(*) AS n FROM users WHERE is_active = 1"),
    num("SELECT COUNT(*) AS n FROM users WHERE created_at::date > CURRENT_DATE - 7"),
    num("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'"),
    num("SELECT COUNT(*) AS n FROM habits WHERE is_active = 1"),
    num("SELECT COUNT(*) AS n FROM habit_logs WHERE completed_count > 0 AND log_date = CURRENT_DATE"),
    num("SELECT COUNT(*) AS n FROM winter_arc_members WHERE season = ?", [season.year]),
    num("SELECT COUNT(*) AS n FROM users WHERE avatar_version > 0"),
    query<{ day: string; n: number }>("SELECT log_date::text AS day, COUNT(*) AS n FROM habit_logs WHERE completed_count > 0 AND log_date > CURRENT_DATE - 14 GROUP BY log_date"),
    query<{ day: string; n: number }>("SELECT created_at::date::text AS day, COUNT(*) AS n FROM users WHERE created_at::date > CURRENT_DATE - 14 GROUP BY 1"),
    query<{ category: string; n: number }>("SELECT category, COUNT(*) AS n FROM habits WHERE is_active = 1 GROUP BY category ORDER BY n DESC LIMIT 6"),
    query<{ id: number; username: string; full_name: string; avatar_color: string; avatar_version: number; created_at: string }>(
      "SELECT id, username, full_name, avatar_color, avatar_version, created_at FROM users ORDER BY created_at DESC, id DESC LIMIT 6",
    ),
  ]);

  return {
    stats: { totalUsers, activeUsers, disabledUsers: totalUsers - activeUsers, newThisWeek, admins, totalHabits, checkinsToday, arcMembers, withPhoto },
    arcLive: season.live,
    activity: lastDays(activity, today, 14),
    signups: lastDays(signups, today, 14),
    popular: popular.map((p) => ({ label: decodeEntities(p.category), value: Number(p.n) })),
    recent: recent.map((u) => ({ ...u, full_name: decodeEntities(u.full_name) })),
  };
}

export type AdminUserRow = {
  id: number;
  username: string;
  email: string;
  full_name: string;
  avatar_color: string;
  avatar_version: number;
  role: "user" | "admin";
  is_active: number;
  google: boolean;
  created_at: string;
  last_login: string | null;
  habit_count: number;
  checkin_count: number;
};

export async function getAdminUsers(search: string): Promise<AdminUserRow[]> {
  const like = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
  const rows = await query<AdminUserRow & { google_id: string | null }>(
    `SELECT u.id, u.username, u.email, u.full_name, u.avatar_color, u.avatar_version, u.role, u.is_active, u.google_id, u.created_at, u.last_login,
            (SELECT COUNT(*) FROM habits h WHERE h.user_id = u.id AND h.is_active = 1) AS habit_count,
            (SELECT COUNT(*) FROM habit_logs l WHERE l.user_id = u.id AND l.completed_count > 0) AS checkin_count
     FROM users u
     ${search ? "WHERE u.username ILIKE ? OR u.email ILIKE ? OR u.full_name ILIKE ?" : ""}
     ORDER BY u.created_at DESC, u.id DESC`,
    search ? [like, like, like] : [],
  );
  return rows.map(({ google_id, ...u }) => ({ ...u, full_name: decodeEntities(u.full_name), google: google_id !== null, habit_count: Number(u.habit_count), checkin_count: Number(u.checkin_count) }));
}

export async function getAdminCategories() {
  const [categories, counts] = await Promise.all([
    getCategories(),
    query<{ category: string; n: number }>("SELECT category, COUNT(*) AS n FROM habits WHERE is_active = 1 GROUP BY category"),
  ]);
  const byName = new Map(counts.map((c) => [decodeEntities(c.category), Number(c.n)]));
  return categories.map((c) => ({ ...c, habits: byName.get(c.name) ?? 0 }));
}

export async function getAdminArc() {
  const today = (await queryOne<{ d: string }>("SELECT CURRENT_DATE::text AS d"))?.d ?? todayIn("UTC");
  const season = arcSeason(today);
  const rows = await query<{ id: number; username: string; full_name: string; avatar_color: string; avatar_version: number; joined_at: string; points: number | string; active_days: number | string }>(
    `SELECT u.id, u.username, u.full_name, u.avatar_color, u.avatar_version, m.joined_at,
            COALESCE(SUM(d.pts), 0) AS points, COUNT(d.log_date) AS active_days
     FROM winter_arc_members m
     JOIN users u ON u.id = m.user_id
     LEFT JOIN (
       SELECT user_id, log_date, LEAST(COUNT(*), ${ARC_HABITS_PER_DAY}) * ${ARC_POINTS_PER_HABIT} AS pts
       FROM habit_logs
       WHERE completed_count > 0 AND log_date BETWEEN ? AND ? AND ABS(completed_at::date - log_date) <= 1
       GROUP BY user_id, log_date
     ) d ON d.user_id = m.user_id
     WHERE m.season = ?
     GROUP BY u.id, u.username, u.full_name, u.avatar_color, u.avatar_version, m.joined_at
     ORDER BY points DESC, active_days DESC, m.joined_at ASC, u.id ASC`,
    [season.start, season.end, season.year],
  );
  return {
    season,
    members: rows.map((r, i) => ({ ...r, rank: i + 1, full_name: decodeEntities(r.full_name), points: Number(r.points), active_days: Number(r.active_days) })),
  };
}
