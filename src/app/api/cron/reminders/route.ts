import { NextResponse, type NextRequest } from "next/server";
import { arcSeason } from "@/lib/arc";
import { addDays } from "@/lib/dates";
import { execute, query } from "@/lib/db";
import { siteOrigin } from "@/lib/google";
import { arcReminderEmail, emailLang, mailEnabled, sendMail, unsubscribeUrl } from "@/lib/mail";
import { pushPublicKey, sendPush } from "@/lib/push";
import { quoteFor } from "@/lib/quotes";
import { safeEqual } from "@/lib/safe-equal";
import { decodeEntities } from "@/lib/text";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const QUOTE_HOUR = 8; //    morning quote, in each person's own timezone
const EVENING_HOUR = 19; // "you still have habits open"
const HABIT_WINDOW = 20; // a habit reminder is sent within this many minutes after its set time
const MAX_EMAILS = 40; //   per run: stays well inside a free email plan's daily limit

type Person = { id: number; email: string; full_name: string; timezone: string; email_lang: string | null; email_reminders: number; member: boolean; push: boolean };

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  return secret.length >= 16 && safeEqual(given, secret);
}

/** Date, hour and minute-of-day right now on that person's clock. */
function clockIn(timezone: string, at: Date) {
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(at).map((p) => [p.type, p.value]));
    return { today: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  } catch {
    return null;
  }
}

/**
 * GET /api/cron/reminders — called every 15 minutes by a scheduler (see
 * .github/workflows/reminders.yml) with `Authorization: Bearer CRON_SECRET`.
 *
 * For each person, on their own clock:
 *   • at a habit's reminder time  → a notification, if that habit isn't ticked yet
 *   • at 8 AM                     → a notification with the day's quote
 *   • at 7 PM, Winter Arc members → a notification and an email, if habits are still open
 *
 * Each of these is sent at most once a day per person (recorded in email_log
 * before sending), so running more often than needed never repeats anything.
 */
export async function GET(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  const canPush = pushPublicKey() !== null;
  const canMail = mailEnabled();
  if (!canPush && !canMail) return NextResponse.json({ note: "Neither email (RESEND_API_KEY / EMAIL_FROM) nor notifications (VAPID keys) are configured." });

  // `at` and `dry` exist for testing: pretend it is another time / only count, don't send
  const atParam = request.nextUrl.searchParams.get("at");
  const now = atParam && !Number.isNaN(Date.parse(atParam)) ? new Date(atParam) : new Date();
  const dry = request.nextUrl.searchParams.get("dry") === "1";
  const origin = siteOrigin(request);
  const utc = clockIn("UTC", now)!;

  // everyone who could be due something: arc members, and anyone with notifications on
  const people = await query<Person>(
    `SELECT u.id, u.email, u.full_name, u.timezone, u.email_lang, u.email_reminders,
            (m.user_id IS NOT NULL) AS member,
            EXISTS (SELECT 1 FROM push_subscriptions p WHERE p.user_id = u.id) AS push
     FROM users u
     LEFT JOIN winter_arc_members m ON m.user_id = u.id AND m.season = ?
     WHERE u.is_active = 1 AND u.role = 'user'
       AND (m.user_id IS NOT NULL OR EXISTS (SELECT 1 FROM push_subscriptions p WHERE p.user_id = u.id))`,
    [arcSeason(utc.today).year],
  );

  const sent = { habitReminders: 0, quotes: 0, eveningNotifications: 0, eveningEmails: 0 };
  // Claim first, send second: if the row already exists this was already sent today.
  const claim = async (userId: number, kind: string, day: string) => dry || (await execute("INSERT INTO email_log (user_id, kind, day) VALUES (?, ?, ?) ON CONFLICT DO NOTHING", [userId, kind, day])).rowCount > 0;
  const release = (userId: number, kind: string, day: string) => execute("DELETE FROM email_log WHERE user_id = ? AND kind = ? AND day = ?", [userId, kind, day]);

  for (const person of people) {
    const clock = clockIn(person.timezone, now);
    if (!clock) continue;
    const { today } = clock;
    const lang = emailLang(person);
    const ne = lang === "ne";
    const name = decodeEntities(person.full_name).split(" ")[0];
    const push = canPush && person.push;

    // ── habit reminders ──
    if (push) {
      const habits = await query<{ id: number; name: string; icon: string; reminder_time: string }>(
        `SELECT h.id, h.name, h.icon, h.reminder_time FROM habits h
         WHERE h.user_id = ? AND h.is_active = 1 AND h.reminder_time IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM habit_logs l WHERE l.habit_id = h.id AND l.log_date = ? AND l.completed_count > 0)`,
        [person.id, today],
      );
      for (const habit of habits) {
        const [h, m] = habit.reminder_time.split(":").map(Number);
        const late = clock.minutes - (h * 60 + m);
        if (late < 0 || late >= HABIT_WINDOW) continue;
        if (!(await claim(person.id, `h${habit.id}`, today))) continue;
        if (!dry) await sendPush(person.id, { title: `${habit.icon} ${decodeEntities(habit.name)}`, body: ne ? "समय भयो। गरेर टिक लगाउनुहोस्।" : "It's time. Do it, then tick it off.", url: "/dashboard", tag: `habit-${habit.id}` });
        sent.habitReminders++;
      }
    }

    // ── morning quote ──
    if (push && clock.hour === QUOTE_HOUR && (await claim(person.id, "push_quote", today))) {
      if (!dry) await sendPush(person.id, { title: ne ? `शुभ प्रभात, ${name}` : `Good morning, ${name}`, body: quoteFor(lang, today), url: "/dashboard", tag: "quote" });
      sent.quotes++;
    }

    // ── evening: Winter Arc members with habits still open ──
    const season = arcSeason(today);
    if (clock.hour !== EVENING_HOUR || !person.member || !season.live) continue;
    const [status] = await query<{ habits: number; done: number }>(
      `SELECT (SELECT COUNT(*) FROM habits WHERE user_id = ? AND is_active = 1) AS habits,
              (SELECT COUNT(*) FROM habit_logs l JOIN habits h ON h.id = l.habit_id AND h.is_active = 1 WHERE l.user_id = ? AND l.log_date = ? AND l.completed_count > 0) AS done`,
      [person.id, person.id, today],
    );
    const left = Number(status.habits) - Number(status.done);
    if (left <= 0) continue; // nothing to remind them of

    if (push && (await claim(person.id, "push_arc", today))) {
      if (!dry)
        await sendPush(person.id, {
          title: ne ? `Winter Arc · दिन ${season.day}` : `Winter Arc · Day ${season.day}`,
          body: ne ? `आजका ${left} बानी बाँकी छन्। मध्यरात अघि पूरा गर्नुहोस्।` : `${left} habit${left === 1 ? "" : "s"} still open today. Finish before midnight.`,
          url: "/dashboard",
          tag: "arc-evening",
        });
      sent.eveningNotifications++;
    }

    if (canMail && person.email_reminders === 1 && sent.eveningEmails < MAX_EMAILS && (await claim(person.id, "arc_reminder", today))) {
      if (!dry) {
        const days = await query<{ log_date: string }>("SELECT DISTINCT log_date FROM habit_logs WHERE user_id = ? AND completed_count > 0 AND log_date BETWEEN ? AND ?", [person.id, addDays(today, -60), addDays(today, -1)]);
        const active = new Set(days.map((d) => d.log_date));
        let streak = 0;
        while (active.has(addDays(today, -1 - streak))) streak++;
        const unsubscribe = unsubscribeUrl(origin, person.id);
        const ok = await sendMail({ to: person.email, unsubscribeUrl: unsubscribe, ...arcReminderEmail(lang, { name, day: season.day, totalDays: season.totalDays, left, streak, url: `${origin}/dashboard`, unsubscribe }) });
        if (!ok) {
          await release(person.id, "arc_reminder", today); // let a later run try again
          continue;
        }
        await new Promise((resolve) => setTimeout(resolve, 600)); // stay under the provider's rate limit
      }
      sent.eveningEmails++;
    }
  }

  return NextResponse.json({ people: people.length, ...sent, dry });
}
