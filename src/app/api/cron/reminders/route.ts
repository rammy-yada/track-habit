import { NextResponse, type NextRequest } from "next/server";
import { arcSeason } from "@/lib/arc";
import { addDays, diffDays } from "@/lib/dates";
import { execute, query } from "@/lib/db";
import { siteOrigin } from "@/lib/google";
import { getMessages, iconVersions } from "@/lib/messages";
import { formatBytes, getStorage } from "@/lib/storage";
import { storageEmail } from "@/lib/mail";
import { arcReminderEmail, comebackEmail, emailLang, mailEnabled, sendMail, unsubscribeUrl } from "@/lib/mail";
import { pushPublicKey, sendPush } from "@/lib/push";
import { COMEBACK_DAYS, comebackFor, nudgeFor, QUIET_AFTER_DAYS, quoteFor } from "@/lib/quotes";
import { safeEqual } from "@/lib/safe-equal";
import { decodeEntities } from "@/lib/text";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const QUOTE_HOUR = 8; //    morning quote, in each person's own timezone
const EVENING_HOUR = 19; // "you still have habits open" (Winter Arc members)
const COMEBACK_HOUR = 18; // "your habits miss you"
const COMEBACK_EMAIL_DAY = 7; // the one email sent to someone who has been away
const HABIT_WINDOW = 20; // a habit reminder is sent within this many minutes after its set time
const MAX_EMAILS = 40; //   per run: stays well inside a free email plan's daily limit

// When the through-the-day motivation goes out, by how many a day the person
// asked for in Profile. The first of the day is always the morning quote.
const NUDGE_HOURS: Record<number, number[]> = { 0: [], 1: [], 2: [14], 3: [13, 17] };

type Person = {
  id: number;
  email: string;
  full_name: string;
  timezone: string;
  email_lang: string | null;
  email_reminders: number;
  notify_motivation: number;
  notify_comeback: number;
  joined: string;
  last_done: string | null;
  member: boolean;
  push: boolean;
};

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
 *   • midday / afternoon          → motivation, if habits are still open (as often as they chose in Profile)
 *   • at 7 PM, Winter Arc members → a notification and an email, if habits are still open
 *   • after 2, 4, 7, 14, 30 days away → a "come back" notification (and one email, at a week)
 *
 * Someone who has been away a week stops getting the everyday ones: an app
 * you have stopped using should go quiet, not louder.
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

  // Every member, with what is needed to decide: are they in the arc, do they
  // have a device to notify, and when did they last tick anything.
  const people = await query<Person>(
    `SELECT u.id, u.email, u.full_name, u.timezone, u.email_lang, u.email_reminders, u.notify_motivation, u.notify_comeback,
            u.created_at::date::text AS joined,
            (SELECT MAX(l.log_date)::text FROM habit_logs l WHERE l.user_id = u.id AND l.completed_count > 0) AS last_done,
            (m.user_id IS NOT NULL) AS member,
            EXISTS (SELECT 1 FROM push_subscriptions p WHERE p.user_id = u.id) AS push
     FROM users u
     LEFT JOIN winter_arc_members m ON m.user_id = u.id AND m.season = ?
     WHERE u.is_active = 1 AND u.role = 'user'`,
    [arcSeason(utc.today).year],
  );

  // wording and icons an admin has set (Admin → Notifications); empty parts use the built-in ones
  const [custom, icons] = await Promise.all([getMessages(), iconVersions()]);
  const awayIcon = `/app-icon/away?s=192&v=${icons.away}`;

  // ── once a day: tidy up, and check how full the database is ──
  let storage: string | undefined;
  const admins = await query<{ id: number; email: string }>("SELECT id, email FROM users WHERE role = 'admin' AND is_active = 1 ORDER BY id LIMIT 3");
  if (!dry && admins[0] && (await execute("INSERT INTO email_log (user_id, kind, day) VALUES (?, 'daily_check', ?) ON CONFLICT DO NOTHING", [admins[0].id, utc.today])).rowCount > 0) {
    // records of what was sent only matter for a day or two: without this the table grows for ever
    await execute("DELETE FROM email_log WHERE day < CURRENT_DATE - 40");
    await execute("DELETE FROM rate_limits WHERE created_at < NOW() - INTERVAL '2 days'");
    await execute("DELETE FROM otp_codes WHERE expires_at < NOW() - INTERVAL '2 days'");
    await execute("DELETE FROM password_resets WHERE expires_at < NOW() - INTERVAL '7 days'");
    const usage = await getStorage();
    storage = usage.state;
    if (usage.state !== "ok" && canMail) {
      const message = storageEmail({ full: usage.state === "full", used: formatBytes(usage.usedBytes), limit: `${usage.limitGb} GB`, percent: Math.round(usage.share * 100), url: `${origin}/sigmadev` });
      for (const admin of admins) await sendMail({ to: admin.email, ...message });
    }
  }

  const sent = { habitReminders: 0, quotes: 0, nudges: 0, eveningNotifications: 0, eveningEmails: 0, comebackNotifications: 0, comebackEmails: 0 };
  let emails = 0;
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
    const mail = canMail && person.email_reminders === 1;
    // whole days since they last ticked anything (or, if they never have, since they signed up)
    const away = Math.max(0, diffDays(person.last_done ?? person.joined, today));
    const quiet = away >= QUIET_AFTER_DAYS;

    // how many habits are still open today — looked up only when something needs it
    let leftToday: number | undefined;
    const habitsLeft = async () => {
      if (leftToday === undefined) {
        const [status] = await query<{ habits: number; done: number }>(
          `SELECT (SELECT COUNT(*) FROM habits WHERE user_id = ? AND is_active = 1) AS habits,
                  (SELECT COUNT(*) FROM habit_logs l JOIN habits h ON h.id = l.habit_id AND h.is_active = 1 WHERE l.user_id = ? AND l.log_date = ? AND l.completed_count > 0) AS done`,
          [person.id, person.id, today],
        );
        leftToday = Number(status.habits) - Number(status.done);
      }
      return leftToday;
    };

    // ── habit reminders: asked for explicitly, so they always go out ──
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
        if (!dry) await sendPush(person.id, { title: `${habit.icon} ${decodeEntities(habit.name)}`, body: ne ? "समय भयो। गरेर टिक लगाउनुहोस्।" : "It's time. Do it, then tick it off.", url: "/dashboard", tag: `habit-${habit.id}`, badge: await habitsLeft() });
        sent.habitReminders++;
      }
    }

    // ── morning quote ──
    if (push && !quiet && person.notify_motivation > 0 && clock.hour === QUOTE_HOUR && (await claim(person.id, "push_quote", today))) {
      if (!dry) await sendPush(person.id, { title: ne ? `शुभ प्रभात, ${name}` : `Good morning, ${name}`, body: quoteFor(lang, today, custom.quotes), url: "/dashboard", tag: "quote", badge: await habitsLeft() });
      sent.quotes++;
    }

    // ── through-the-day motivation: only while there is something left to do, and not for someone who is away ──
    if (push && away < 2 && (NUDGE_HOURS[person.notify_motivation] ?? []).includes(clock.hour)) {
      const left = await habitsLeft();
      if (left > 0 && (await claim(person.id, `nudge${clock.hour}`, today))) {
        if (!dry)
          await sendPush(person.id, {
            title: ne ? `${name}, आजका ${left} बानी बाँकी` : `${name}, ${left} habit${left === 1 ? "" : "s"} to go`,
            body: nudgeFor(lang, `${today}:${clock.hour}:${person.id}`, custom.nudges),
            url: "/dashboard",
            tag: "nudge",
            badge: left,
          });
        sent.nudges++;
      }
    }

    // ── coming back: 2, 4, 7, 14 and 30 days after the last tick ──
    if (person.notify_comeback === 1 && clock.hour === COMEBACK_HOUR && (COMEBACK_DAYS as readonly number[]).includes(away)) {
      if (push && (await claim(person.id, `back${away}`, today))) {
        const message = comebackFor(lang, away, person.last_done !== null, custom.comeback);
        // these arrive with their own picture, so they don't look like the everyday ones
        if (!dry) await sendPush(person.id, { ...message, url: "/dashboard", tag: "comeback", icon: awayIcon });
        sent.comebackNotifications++;
      }
      if (mail && away === COMEBACK_EMAIL_DAY && emails < MAX_EMAILS && (await claim(person.id, "comeback_mail", today))) {
        if (!dry) {
          const unsubscribe = unsubscribeUrl(origin, person.id);
          const ok = await sendMail({ to: person.email, unsubscribeUrl: unsubscribe, ...comebackEmail(lang, { name, days: away, url: `${origin}/dashboard`, unsubscribe }) });
          if (!ok) await release(person.id, "comeback_mail", today); // let a later run try again
          else await new Promise((resolve) => setTimeout(resolve, 600)); // stay under the provider's rate limit
        }
        emails++;
        sent.comebackEmails++;
      }
    }

    // ── evening: Winter Arc members with habits still open ──
    const season = arcSeason(today);
    if (clock.hour !== EVENING_HOUR || !person.member || !season.live || quiet) continue;
    const left = await habitsLeft();
    if (left <= 0) continue; // nothing to remind them of

    if (push && (await claim(person.id, "push_arc", today))) {
      if (!dry)
        await sendPush(person.id, {
          title: ne ? `Winter Arc · दिन ${season.day}` : `Winter Arc · Day ${season.day}`,
          body: ne ? `आजका ${left} बानी बाँकी छन्। मध्यरात अघि पूरा गर्नुहोस्।` : `${left} habit${left === 1 ? "" : "s"} still open today. Finish before midnight.`,
          url: "/dashboard",
          tag: "arc-evening",
          badge: left,
        });
      sent.eveningNotifications++;
    }

    if (mail && emails < MAX_EMAILS && (await claim(person.id, "arc_reminder", today))) {
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
      emails++;
      sent.eveningEmails++;
    }
  }

  return NextResponse.json({ people: people.length, ...sent, dry, ...(storage ? { storage } : {}) });
}
