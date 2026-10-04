import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { overLimit } from "@/lib/throttle";

export const dynamic = "force-dynamic";

/** GET /api/export — everything HabitFlow holds about the signed-in user, as one JSON file. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (await overLimit(`export:${user.id}`, 10, 60)) return NextResponse.json({ error: "Too many requests. Please wait a while and try again." }, { status: 429 });

  const [habits, logs, arc] = await Promise.all([
    query("SELECT id, name, description, category, icon, color, frequency, target_count, reminder_time, is_active, created_at FROM habits WHERE user_id = ? ORDER BY id", [user.id]),
    query("SELECT habit_id, log_date, completed_count, mood, notes, completed_at FROM habit_logs WHERE user_id = ? ORDER BY log_date, habit_id", [user.id]),
    query("SELECT season, joined_at FROM winter_arc_members WHERE user_id = ? ORDER BY season", [user.id]),
  ]);

  const data = {
    exported_at: new Date().toISOString(),
    account: {
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      timezone: user.timezone,
      role: user.role,
      signs_in_with_google: Boolean(user.google_id),
      has_profile_photo: user.avatar_version > 0,
      created_at: user.created_at,
      last_login: user.last_login,
    },
    habits,
    check_ins: logs,
    winter_arc: arc,
  };
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="habitflow-${user.username}.json"`, "Cache-Control": "no-store" },
  });
}
