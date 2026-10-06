import "server-only";
import { arcSeason, BONUS_SQL, DAILY_POINTS } from "./arc";
import { todayIn } from "./dates";
import { execute, query } from "./db";
import { emailLang } from "./mail";
import { pushProblem, sendPush } from "./push";

const BOARD = 10; // "on the leaderboard" means the top ten

type Row = { id: number; full_name: string; timezone: string; email_lang: string | null; points: number | string; push: boolean; before: number | null };

/** The hour right now on that person's clock (12 if their timezone can't be read). */
function hourIn(timezone: string): number {
  try {
    return Number(new Intl.DateTimeFormat("en-GB", { timeZone: timezone || "UTC", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  } catch {
    return 12;
  }
}

/**
 * Looks at the Winter Arc leaderboard, compares everyone's place with where
 * they were last time, and tells the people whose place changed: climbed,
 * slipped, onto the board, onto the podium, first place, or off the board.
 *
 * Kept from being a nuisance: only people with points are told anything, each
 * kind of news is sent at most once a day per person, and nothing is sent
 * between 10 PM and 7 AM on their own clock. The new places are always saved,
 * so a change that wasn't announced isn't announced late.
 *
 * `actorId` is the person whose ticks prompted this look, if any.
 */
export async function notifyRankChanges(actorId?: number): Promise<number> {
  const today = todayIn("UTC");
  const season = arcSeason(today);
  if (!season.live) return 0;
  const rows = await query<Row>(
    `SELECT u.id, u.full_name, u.timezone, u.email_lang,
            COALESCE(SUM(d.pts), 0) + ${BONUS_SQL} AS points,
            EXISTS (SELECT 1 FROM push_subscriptions p WHERE p.user_id = u.id) AS push,
            (SELECT r.rank FROM arc_ranks r WHERE r.user_id = m.user_id AND r.season = m.season) AS before
     FROM winter_arc_members m
     JOIN users u ON u.id = m.user_id AND u.is_active = 1 AND u.role = 'user'
     LEFT JOIN (${DAILY_POINTS}) d ON d.user_id = m.user_id
     WHERE m.season = ?
     GROUP BY u.id, u.full_name, u.timezone, u.email_lang, m.joined_at, m.user_id, m.season
     ORDER BY points DESC, COUNT(d.log_date) DESC, m.joined_at ASC, u.id ASC`,
    [season.start, season.end, season.year],
  );
  const canPush = pushProblem() === null;
  let told = 0;

  for (let i = 0; i < rows.length; i++) {
    const person = rows[i];
    const rank = i + 1;
    if (Number(person.points) <= 0) continue; // not on the board yet: nothing to say, nothing to remember
    const before = person.before;
    if (before === rank) continue;
    await execute("INSERT INTO arc_ranks (user_id, season, rank) VALUES (?, ?, ?) ON CONFLICT (user_id, season) DO UPDATE SET rank = EXCLUDED.rank", [person.id, season.year, rank]);

    // Someone seen for the first time is only told if they are the one who
    // just ticked (they have earned their way onto the board this minute).
    // Anyone else is simply noted, so they aren't told news that isn't news.
    if (before === null && person.id !== actorId) continue;

    const hour = hourIn(person.timezone);
    if (!canPush || !person.push || hour < 7 || hour >= 22) continue;
    const ne = emailLang(person) === "ne";
    const name = person.full_name.split(" ")[0];
    const up = before === null || rank < before;
    let kind: string;
    let title: string;
    let body: string;
    if (up && rank === 1) {
      kind = "rank_top";
      title = ne ? "👑 तपाईं #1 मा हुनुहुन्छ!" : "👑 You're #1!";
      body = ne ? `${name}, अहिले Winter Arc को लिडरबोर्डमा सबैभन्दा माथि तपाईं हुनुहुन्छ। सबैले तपाईंलाई पछ्याइरहेका छन् — ठाउँ जोगाउनुहोस्!` : `${name}, you're at the very top of the Winter Arc leaderboard right now. Everyone is chasing you — hold the spot!`;
    } else if (up && rank <= 3 && (before === null || before > 3)) {
      kind = "rank_podium";
      title = ne ? `🏅 पोडियममा! तपाईं #${rank}` : `🏅 You're on the podium: #${rank}`;
      body = ne ? `${name}, तपाईं शीर्ष तीनमा पुग्नुभयो। अझ एक कदम माथि जान आजका बानी पूरा गर्नुहोस्।` : `${name}, you've broken into the top three. Finish today's habits and see how much higher you can go.`;
    } else if (up && (before === null || before > BOARD) && rank <= BOARD) {
      kind = "rank_in";
      title = ne ? `🏆 लिडरबोर्डमा स्वागत छ: #${rank}` : `🏆 You're on the leaderboard: #${rank}`;
      body = ne ? `${name}, तपाईं Winter Arc को शीर्ष ${BOARD} मा हुनुहुन्छ। हरेक टिकले तपाईंलाई माथि लैजान्छ।` : `${name}, you've made the top ${BOARD} of the Winter Arc. Every habit you tick from here moves you up.`;
    } else if (up) {
      kind = "rank_up";
      const places = before === null ? 0 : before - rank;
      title = ne ? `📈 तपाईं #${rank} मा उक्लिनुभयो!` : `📈 You climbed to #${rank}!`;
      body = ne ? `${name}, ${places > 0 ? `${places} स्थान माथि! ` : ""}यही गति कायम राख्नुहोस्, अर्को स्थान टाढा छैन।` : `${name}, ${places > 0 ? `that's ${places} place${places === 1 ? "" : "s"} up. ` : ""}Keep this pace and the next spot is within reach.`;
    } else if (before !== null && before <= BOARD && rank > BOARD) {
      kind = "rank_out";
      title = ne ? `⚠️ तपाईं शीर्ष ${BOARD} बाट बाहिरिनुभयो` : `⚠️ You've dropped out of the top ${BOARD}`;
      body = ne ? `${name}, अहिले तपाईं #${rank} मा हुनुहुन्छ। आजका बानी पूरा गरेर फेरि फर्किनुहोस्!` : `${name}, you're now #${rank}. A full day of habits can put you straight back on the board.`;
    } else {
      kind = "rank_down";
      title = ne ? `📉 कसैले तपाईंलाई उछिन्यो: अब #${rank}` : `📉 Someone passed you: now #${rank}`;
      body = ne ? `${name}, तपाईं #${before} बाट #${rank} मा झर्नुभयो। आज एउटा बानी थप्नुभयो भने ठाउँ फिर्ता लिन सक्नुहुन्छ।` : `${name}, you've slipped from #${before} to #${rank}. One more habit today could take the place back.`;
    }
    // once a day per kind of news, so a tight race doesn't buzz a phone all afternoon
    const claimed = await execute("INSERT INTO email_log (user_id, kind, day) VALUES (?, ?, ?) ON CONFLICT DO NOTHING", [person.id, kind, todayIn(person.timezone || "UTC")]);
    if (claimed.rowCount === 0) continue;
    told += await sendPush(person.id, { title, body, url: "/arc#leaderboard", tag: "rank" }).catch(() => 0);
  }
  return told;
}
