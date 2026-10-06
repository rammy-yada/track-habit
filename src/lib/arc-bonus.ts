import "server-only";
import { arcSeason, isArcMember } from "./arc";
import { MILESTONES } from "./arc-config";
import type { User } from "./auth";
import { arcNumbers } from "./badges";
import { todayIn } from "./dates";
import { execute } from "./db";
import { emailLang } from "./mail";
import { sendPush } from "./push";

// Points the site awards by itself, on top of the daily ticks:
export const STREAK_BONUS = 25; //   every 7 scoring days in a row (day 7, 14, 21…)
export const MILESTONE_BONUS = 20; // each perfect-day milestone (1, 3, 7, 14… perfect days)

/**
 * Called after someone's ticks are saved. If they have just completed another
 * week of their streak, or reached a perfect-day milestone, the bonus is
 * recorded — once: each has a key, and the database refuses a second row with
 * the same key. Unticking afterwards doesn't take a bonus back.
 */
export async function awardAutoBonuses(user: User): Promise<number> {
  if (user.role !== "user" || !(await isArcMember(user))) return 0;
  const today = todayIn(user.timezone);
  const season = arcSeason(today);
  if (!season.live) return 0;
  const numbers = await arcNumbers(user.id, today);

  const due: { key: string; points: number; reason: string }[] = [];
  for (let week = 1; week * 7 <= numbers.streak; week++) due.push({ key: `streak${week * 7}`, points: STREAK_BONUS, reason: `${week * 7}-day streak` });
  for (const m of MILESTONES) if (numbers.perfect >= m.days) due.push({ key: `perfect${m.days}`, points: MILESTONE_BONUS, reason: `${m.title}: ${m.days} perfect day${m.days === 1 ? "" : "s"}` });

  let earned = 0;
  const reasons: string[] = [];
  for (const bonus of due) {
    const added = await execute("INSERT INTO arc_bonus (user_id, season, points, reason, auto_key) VALUES (?, ?, ?, ?, ?) ON CONFLICT (user_id, season, auto_key) DO NOTHING", [user.id, season.year, bonus.points, bonus.reason, bonus.key]);
    if (added.rowCount > 0) {
      earned += bonus.points;
      reasons.push(bonus.reason);
    }
  }
  if (earned > 0) {
    const ne = emailLang(user) === "ne";
    await sendPush(user.id, {
      title: ne ? `🎁 +${earned} बोनस अङ्क!` : `🎁 +${earned} bonus points!`,
      body: ne ? `${reasons.join(", ")} — बधाई छ! यी अङ्क Winter Arc को लिडरबोर्डमा जोडिए।` : `${reasons.join(" and ")} — well earned. They've been added to your Winter Arc score. Keep it going! 🔥`,
      url: "/arc#leaderboard",
      tag: "bonus",
    }).catch(() => 0);
  }
  return earned;
}
