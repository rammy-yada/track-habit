import "server-only";
import type { User } from "./auth";
import { execute, queryOne } from "./db";
import { isDateString, todayIn } from "./dates";
import { toId } from "./validation";

export type TickResult = { ok: true } | { ok: false; error: string };

/**
 * Marks one habit done / not done for one day. The caller says which state
 * it wants (not "toggle"), so replaying the same change twice — a retry, or
 * an offline change syncing later — is harmless.
 */
export async function setHabitDone(user: User, habitIdInput: unknown, done: boolean, dateInput: unknown, atInput?: unknown): Promise<TickResult> {
  // When the tick was really made, for one that waited offline: it counts for its day. Believed for up to a week back, no further.
  const at = typeof atInput === "number" && atInput <= Date.now() && atInput >= Date.now() - 7 * 86_400_000 ? atInput / 1000 : null;
  const habitId = toId(habitIdInput);
  // a day of slack: the device may be a timezone ahead of the profile setting
  const latest = todayIn("Pacific/Kiritimati");
  if (!habitId || !isDateString(dateInput)) return { ok: false, error: "Invalid request." };
  if (dateInput > latest) return { ok: false, error: "Cannot log future dates." };
  if (dateInput < "2000-01-01") return { ok: false, error: "Invalid request." };
  if (!(await queryOne("SELECT id FROM habits WHERE id = ? AND user_id = ? AND is_active = 1", [habitId, user.id]))) {
    return { ok: false, error: "Habit not found." };
  }

  if (done) {
    await execute(
      "INSERT INTO habit_logs (habit_id, user_id, log_date, completed_count, completed_at) VALUES (?, ?, ?, 1, COALESCE(to_timestamp(?::double precision)::timestamp, NOW())) ON CONFLICT (habit_id, user_id, log_date) DO UPDATE SET completed_count = 1, completed_at = CASE WHEN habit_logs.completed_count > 0 THEN habit_logs.completed_at ELSE EXCLUDED.completed_at END",
      [habitId, user.id, dateInput, at],
    );
  } else {
    // Keep the row if it carries a note or mood — only the completion is undone.
    await execute(
      "UPDATE habit_logs SET completed_count = 0 WHERE habit_id = ? AND user_id = ? AND log_date = ? AND (mood IS NOT NULL OR COALESCE(notes, '') <> '')",
      [habitId, user.id, dateInput],
    );
    await execute("DELETE FROM habit_logs WHERE habit_id = ? AND user_id = ? AND log_date = ? AND mood IS NULL AND COALESCE(notes, '') = ''", [habitId, user.id, dateInput]);
  }
  return { ok: true };
}
