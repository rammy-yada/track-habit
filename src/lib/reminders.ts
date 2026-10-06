import "server-only";
import { arcSeason } from "@/lib/arc";
import { addDays, diffDays } from "@/lib/dates";
import { execute, query } from "@/lib/db";
import { getMessages, iconVersions } from "@/lib/messages";
import { formatBytes, getStorage } from "@/lib/storage";
import { storageEmail } from "@/lib/mail";
import { arcReminderEmail, comebackEmail, emailLang, mailEnabled, sendMail, unsubscribeUrl } from "@/lib/mail";
import { lastPushError, pushProblem, sendPush } from "@/lib/push";
import { CARE, CARE_CATCH_UP, COMEBACK_DAYS, comebackFor, nudgeFor, QUIET_AFTER_DAYS, quoteFor } from "@/lib/quotes";
import { decodeEntities } from "@/lib/text";

const QUOTE_HOUR = 8; //    morning quote, in each person's own timezone
const EVENING_HOUR = 19; // "you still have habits open" (Winter Arc members)
const COMEBACK_HOUR = 18; // "your habits miss you"
const COMEBACK_EMAIL_DAY = 7; // the one email sent to someone who has been away
const HABIT_WINDOW = 180; // a habit reminder is sent within this many minutes after its set time
const MAX_EMAILS = 40; //   per run: stays well inside a free email plan's daily limit

// The scheduler is not punctual: a free one may call only every few hours.
// So nothing here waits for an exact minute. Each message has a time it is
// due FROM and a time it is no longer worth sending; any run in between
// sends it, and the record in email_log keeps it to once a day.
const QUOTE_UNTIL = 12; //  the morning quote isn't sent after noon
const DAY_ENDS = 23; //     nothing is sent after 11 PM
const NUDGE_CATCH_UP = 240; // minutes a "habits still open" nudge stays worth sending

// Through-the-day reminders for habits still open: how many (by what the
// person chose in Profile), and the part of the day each one falls in. The
// exact minute inside that part is different for every person and every day,
// so they don't arrive like clockwork.
const NUDGE_SLOTS: Record<number, [number, number][]> = { 0: [], 1: [], 2: [[12 * 60, 18 * 60]], 3: [[11 * 60, 15 * 60], [15 * 60, 20 * 60]] };
function randomMinute(seed: string, from: number, to: number): number {
  let hash = 2166136261;
  for (const ch of seed) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619) >>> 0;
  return from + (hash % (to - from));
}

type Person = {
  id: number;
  email: string;
  full_name: string;
  timezone: string;
  email_lang: string | null;
  email_reminders: number;
  notify_motivation: number;
  notify_comeback: number;
  notify_care: number;
  joined: string;
  last_done: string | null;
  member: boolean;
  push: boolean;
};

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
 * Sends whatever is due right now. Called by the scheduler
 * (/api/cron/reminders) and, as a back-up, by the app itself while people are
 * using it (see maybeRunReminders).
 *
 * For each person, on their own clock:
 *   • from a habit's reminder time (for 3 hours) → a notification, if that habit isn't ticked yet
 *   • 8 AM to noon                    → the day's quote
 *   • once or twice, at a random time → a reminder, if habits are still open (as often as they chose in Profile)
 *   • from 7 PM, Winter Arc members   → a notification and an email, if habits are still open
 *   • after 2, 4, 7, 14, 30 days away → a "come back" notification (and one email, at a week)
 *
 * Someone who has been away a week stops getting the everyday ones. Each
 * message is sent at most once a day per person (recorded in email_log before
 * sending), so running this often never repeats anything.
 */
export async function runReminders({ origin, now = new Date(), dry = false }: { origin: string; now?: Date; dry?: boolean }) {
  const pushIssue = pushProblem();
  const canPush = pushIssue === null;
  const canMail = mailEnabled();
  if (!canPush && !canMail) return { note: "Neither email (RESEND_API_KEY / EMAIL_FROM) nor notifications (VAPID keys) are configured." };

  const utc = clockIn("UTC", now)!;

  // Every member, with what is needed to decide: are they in the arc, do they
  // have a device to notify, and when did they last tick anything.
  const people = await query<Person>(
    `SELECT u.id, u.email, u.full_name, u.timezone, u.email_lang, u.email_reminders, u.notify_motivation, u.notify_comeback, u.notify_care,
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

  const sent = { habitReminders: 0, quotes: 0, nudges: 0, care: 0, eveningNotifications: 0, eveningEmails: 0, comebackNotifications: 0, comebackEmails: 0 };
  let emails = 0;
  let delivered = 0; // how many devices actually accepted a notification
  // Claim first, send second: if the row already exists this was already sent today.
  const claim = async (userId: number, kind: string, day: string) => dry || (await execute("INSERT INTO email_log (user_id, kind, day) VALUES (?, ?, ?) ON CONFLICT DO NOTHING", [userId, kind, day])).rowCount > 0;
  const release = (userId: number, kind: string, day: string) => execute("DELETE FROM email_log WHERE user_id = ? AND kind = ? AND day = ?", [userId, kind, day]);

  const failed: string[] = [];
  for (const person of people) {
    // one person's trouble must not stop everyone after them
    try {
      await remind(person);
    } catch (err) {
      failed.push(`#${person.id}: ${(err as Error).message.slice(0, 120)}`);
    }
  }

  async function remind(person: Person) {
    const clock = clockIn(person.timezone, now);
    if (!clock) return;
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
        if (!dry) delivered += await sendPush(person.id, { title: `${habit.icon} ${decodeEntities(habit.name)}`, body: ne ? "समय भयो। गरेर टिक लगाउनुहोस्।" : "It's time. Do it, then tick it off.", url: "/dashboard", tag: `habit-${habit.id}`, badge: await habitsLeft() });
        sent.habitReminders++;
      }
    }

    // ── morning quote ──
    if (push && !quiet && person.notify_motivation > 0 && clock.hour >= QUOTE_HOUR && clock.hour < QUOTE_UNTIL && (await claim(person.id, "push_quote", today))) {
      if (!dry) delivered += await sendPush(person.id, { title: ne ? `शुभ प्रभात, ${name}` : `Good morning, ${name}`, body: quoteFor(lang, today, custom.quotes), url: "/dashboard", tag: "quote", badge: await habitsLeft() });
      sent.quotes++;
    }

    // ── through the day: reminders for habits still open, at a different time for each person each day ──
    if (push && away < 2) {
      const slots = NUDGE_SLOTS[person.notify_motivation] ?? [];
      for (let i = 0; i < slots.length; i++) {
        const due = randomMinute(`${person.id}:${today}:${i}`, slots[i][0], slots[i][1]);
        if (clock.minutes < due || clock.minutes >= due + NUDGE_CATCH_UP || clock.hour >= DAY_ENDS) continue;
        const left = await habitsLeft();
        if (left <= 0 || !(await claim(person.id, `nudge${i}`, today))) continue;
        if (!dry)
          delivered += await sendPush(person.id, {
            title: ne ? `${name}, आजका ${left} बानी बाँकी` : `${name}, ${left} habit${left === 1 ? "" : "s"} to go`,
            body: nudgeFor(lang, `${today}:${i}:${person.id}`, custom.nudges),
            url: "/dashboard",
            tag: "nudge",
            badge: left,
          });
        sent.nudges++;
      }
    }

    // ── daily care: wake up, water, one good thing, sleep — each at a different minute every day ──
    if (push && !quiet && person.notify_care === 1) {
      for (const care of CARE) {
        const due = randomMinute(`${person.id}:${today}:${care.key}`, care.from, care.to);
        if (clock.minutes < due || clock.minutes >= due + CARE_CATCH_UP) continue;
        if (!(await claim(person.id, `care_${care.key}`, today))) continue;
        const lines = care.lines[lang];
        if (!dry) delivered += await sendPush(person.id, { title: care.title[lang], body: lines[randomMinute(`${today}:${care.key}:${person.id}`, 0, lines.length)], url: "/dashboard", tag: `care-${care.key}` });
        sent.care++;
      }
    }

    // ── coming back: 2, 4, 7, 14 and 30 days after the last tick ──
    if (person.notify_comeback === 1 && clock.hour >= COMEBACK_HOUR && clock.hour < DAY_ENDS && (COMEBACK_DAYS as readonly number[]).includes(away)) {
      if (push && (await claim(person.id, `back${away}`, today))) {
        const message = comebackFor(lang, away, person.last_done !== null, custom.comeback);
        // these arrive with their own picture, so they don't look like the everyday ones
        if (!dry) delivered += await sendPush(person.id, { ...message, url: "/dashboard", tag: "comeback", icon: awayIcon });
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
    if (clock.hour < EVENING_HOUR || clock.hour >= DAY_ENDS || !person.member || !season.live || quiet) return;
    const left = await habitsLeft();
    if (left <= 0) return; // nothing to remind them of

    if (push && (await claim(person.id, "push_arc", today))) {
      if (!dry)
        delivered += await sendPush(person.id, {
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
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 600)); // stay under the provider's rate limit
      }
      emails++;
      sent.eveningEmails++;
    }
  }

  return { people: people.length, ...sent, delivered, dry, ...(storage ? { storage } : {}), ...(pushIssue ? { pushProblem: pushIssue } : {}), ...(lastPushError && delivered === 0 ? { lastPushError } : {}), ...(failed.length ? { failed } : {}) };
}

/**
 * The back-up trigger: while anyone has the app open it checks in every few
 * minutes; at most once every ten minutes that check-in also runs the
 * reminders. So they go out on time whenever the site is in use, however late
 * the scheduler is.
 */
export async function maybeRunReminders(origin: string): Promise<void> {
  const claimed = await execute(
    "INSERT INTO site_settings (key, value) VALUES ('reminders_ran', '1') ON CONFLICT (key) DO UPDATE SET updated_at = NOW() WHERE site_settings.updated_at < NOW() - INTERVAL '10 minutes'",
  );
  if (claimed.rowCount > 0) await runReminders({ origin });
}
