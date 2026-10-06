import "server-only";
import { Pool, types } from "pg";
import { connectionConfig } from "./db-config.mjs";

type Param = string | number | null | Buffer;

// DATE and TIMESTAMP come back as plain strings ("2026-10-01"), not JS Dates,
// so a habit's log_date can never shift a day through a timezone conversion.
for (const oid of [types.builtins.DATE, types.builtins.TIMESTAMP, types.builtins.TIMESTAMPTZ]) {
  types.setTypeParser(oid, (value) => value);
}

// One pool per running copy of the app, stashed on globalThis so dev-mode hot
// reloads reuse it.
//
// It is deliberately tiny. On a serverless host every warm instance has its
// own pool, and a free hosted database allows only ~20 connections in total.
// On Vercel each copy of the app therefore holds exactly ONE connection (a
// page's queries simply run one after another on it), and gives it back after
// a few idle seconds — and the database closes it anyway after 15 (see
// db-config.mjs). Elsewhere the size is DB_POOL_SIZE, 2 unless set.
const globalForDb = globalThis as unknown as { habitflowPool?: Pool; habitflowMigrated?: Promise<void> };

function pool(): Pool {
  if (!globalForDb.habitflowPool) {
    globalForDb.habitflowPool = new Pool({
      ...connectionConfig(),
      max: process.env.VERCEL ? 1 : Number(process.env.DB_POOL_SIZE ?? 2),
      idleTimeoutMillis: 4_000,
      connectionTimeoutMillis: 8_000,
      allowExitOnIdle: true,
    });
    // an idle connection dropping (database restart, network blip) must not crash the server
    globalForDb.habitflowPool.on("error", () => {});
  }
  return globalForDb.habitflowPool;
}

// Tables and columns added after the first release. `npm run db:setup` creates
// them too; this brings a database that was set up earlier up to date.
// Once per running copy of the app, one cheap query checks whether the newest
// addition exists; only if it doesn't are the upgrades applied (one round trip).
const UPGRADES = `
  CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY, name VARCHAR(50) NOT NULL UNIQUE, icon VARCHAR(10) DEFAULT '📋', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS winter_arc_members (
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, season INT NOT NULL, joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, season)
  );
  ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(64);
  CREATE UNIQUE INDEX IF NOT EXISTS users_google_id ON users (google_id);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_version INT NOT NULL DEFAULT 0;
  CREATE TABLE IF NOT EXISTS avatars (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, image BYTEA NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ALTER TABLE users ADD COLUMN IF NOT EXISTS email_lang VARCHAR(5);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS email_reminders SMALLINT NOT NULL DEFAULT 1;
  CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL, used SMALLINT NOT NULL DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS email_log (
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind VARCHAR(20) NOT NULL, day DATE NOT NULL, PRIMARY KEY (user_id, kind, day)
  );
  CREATE TABLE IF NOT EXISTS site_images (
    slot VARCHAR(20) PRIMARY KEY, image BYTEA NOT NULL, version INT NOT NULL DEFAULT 1, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL, auth TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS rate_limits (
    id BIGSERIAL PRIMARY KEY, key VARCHAR(160) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS rate_limits_key ON rate_limits (key, created_at);
  CREATE TABLE IF NOT EXISTS site_settings (
      key        VARCHAR(40) PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ALTER TABLE site_images ADD COLUMN IF NOT EXISTS mime VARCHAR(40) NOT NULL DEFAULT 'image/webp';
  CREATE TABLE IF NOT EXISTS arc_packs (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(60)  NOT NULL UNIQUE,
      tagline    VARCHAR(160) NOT NULL DEFAULT '',
      icon       VARCHAR(10)  NOT NULL DEFAULT '❄️',
      is_active  SMALLINT     NOT NULL DEFAULT 1,
      created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS arc_pack_habits (
      id         SERIAL PRIMARY KEY,
      pack_id    INT NOT NULL REFERENCES arc_packs(id) ON DELETE CASCADE,
      name       VARCHAR(100) NOT NULL,
      icon       VARCHAR(10)  NOT NULL DEFAULT '✅',
      created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
  );
  ALTER TABLE winter_arc_members ADD COLUMN IF NOT EXISTS pack_id INT REFERENCES arc_packs(id) ON DELETE SET NULL;
  ALTER TABLE habits ADD COLUMN IF NOT EXISTS arc_habit_id INT REFERENCES arc_pack_habits(id) ON DELETE SET NULL;
  ALTER TABLE habits ADD COLUMN IF NOT EXISTS arc_season INT;
  ALTER TABLE arc_packs ADD COLUMN IF NOT EXISTS kind VARCHAR(10) NOT NULL DEFAULT 'arc';
  CREATE TABLE IF NOT EXISTS pack_members (
      user_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pack_id   INT NOT NULL REFERENCES arc_packs(id) ON DELETE CASCADE,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, pack_id)
  );
  INSERT INTO arc_packs (name, tagline, icon)
    SELECT * FROM (VALUES
      ('Discipline', 'The classic Winter Arc: early mornings, cold water, no excuses.', '🧊'),
      ('Strength', 'Build a body that carries you through the year.', '🏋️'),
      ('Mind', 'Quiet, focus and learning. Sharpen what''s inside.', '🧠')
    ) AS d(name, tagline, icon)
    WHERE NOT EXISTS (SELECT 1 FROM arc_packs);
  INSERT INTO arc_pack_habits (pack_id, name, icon)
    SELECT p.id, d.name, d.icon FROM (VALUES
      ('Discipline', 'Wake up before 6 AM', '⏰'), ('Discipline', 'Cold shower', '🚿'), ('Discipline', 'Workout 45 minutes', '💪'), ('Discipline', 'No sugar or junk food', '🚫'), ('Discipline', 'Read 10 pages', '📖'),
      ('Strength', '50 push-ups', '💪'), ('Strength', '50 squats', '🦵'), ('Strength', '2-minute plank', '🧱'), ('Strength', 'Eat enough protein', '🍳'), ('Strength', 'Sleep 8 hours', '😴'),
      ('Mind', 'Meditate 10 minutes', '🧘'), ('Mind', 'Write in a journal', '✍️'), ('Mind', 'No phone for the first hour', '📵'), ('Mind', 'Read 20 pages', '📚'), ('Mind', 'Walk 30 minutes outside', '🚶')
    ) AS d(pack, name, icon)
    JOIN arc_packs p ON p.name = d.pack
    WHERE NOT EXISTS (SELECT 1 FROM arc_pack_habits);
  CREATE TABLE IF NOT EXISTS blog_posts (
      id           SERIAL PRIMARY KEY,
      slug         VARCHAR(120) NOT NULL UNIQUE,
      title        VARCHAR(160) NOT NULL,
      excerpt      VARCHAR(300) NOT NULL DEFAULT '',
      body         TEXT         NOT NULL,
      published    SMALLINT     NOT NULL DEFAULT 0,
      seo_title    VARCHAR(70)  NOT NULL DEFAULT '',
      seo_description VARCHAR(170) NOT NULL DEFAULT '',
      tags         VARCHAR(200) NOT NULL DEFAULT '',
      cover_version INT         NOT NULL DEFAULT 0,
      published_at TIMESTAMP,
      created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS inquiries (
      id         SERIAL PRIMARY KEY,
      kind       VARCHAR(10)  NOT NULL CHECK (kind IN ('collab', 'brand')),
      name       VARCHAR(100) NOT NULL,
      email      VARCHAR(100) NOT NULL,
      company    VARCHAR(120) NOT NULL DEFAULT '',
      website    VARCHAR(200) NOT NULL DEFAULT '',
      topic      VARCHAR(60)  NOT NULL DEFAULT '',
      budget     VARCHAR(40)  NOT NULL DEFAULT '',
      message    TEXT         NOT NULL,
      status     VARCHAR(10)  NOT NULL DEFAULT 'new',
      created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
  );
  INSERT INTO blog_posts (slug, title, excerpt, body, tags, published, published_at)
    SELECT d.slug, d.title, d.excerpt, d.body, 'habits, winter arc, discipline', 1, NOW() FROM (VALUES
      ('what-is-the-winter-arc', 'What is the Winter Arc, and how do you actually finish it?', 'The Winter Arc runs from October 1 to January 31. Here is what it is, why it works, and the three things that decide whether you finish.', 'The Winter Arc is a simple idea: while most people slow down for the last months of the year and promise to start again in January, you start now. From October 1 to January 31 you pick a small set of habits and do them every day. By the time everyone else is writing resolutions, you already have 123 days behind you.
  
  ## Why winter?
  
  Because it is the hardest time to do it. It is cold, it gets dark early, there are festivals and holidays, and nobody is watching. That is exactly why it works. If you can keep a routine through the months that make it hardest, the rest of the year feels easy.
  
  ## What goes in an arc
  
  Keep it short. Five habits you will really do beat fifteen you will drop in a week. A good arc usually has:
  
  - One thing for your body, like a workout or a long walk
  - One thing for your mind, like reading or study
  - One thing you give up, like sugar or scrolling in bed
  - One thing for rest, like a fixed bedtime
  
  On HabitFlow you can pick a ready-made pack when you join, or choose your own.
  
  ## The three things that decide whether you finish
  
  **Start smaller than you want to.** The first week is not a test of strength. It is a test of whether the plan fits your real life.
  
  **Tick it the same day.** Only ticks made on the day count for points. That rule is there to keep you honest with yourself, not to punish you.
  
  **Never miss twice.** One missed day is an accident. Two is the start of a new habit, the wrong one. If you miss, the only job tomorrow is to show up.
  
  That is the whole arc. No secret, no hack. Just 123 ordinary days in a row.'),
      ('small-habits-beat-big-goals', 'Why small habits beat big goals', 'A big goal tells you where you want to end up. A small habit is what actually moves you there. Here is how to shrink a goal into something you will do today.', 'Everyone has had the same January. A big goal, a burst of energy, and by February it is gone. The goal was not the problem. The problem was that a goal is a place, and you cannot do a place. You can only do an action.
  
  ## A goal is a direction, a habit is a step
  
  "Get fit" is a direction. "Twenty push-ups after I brush my teeth" is a step. You can fail at getting fit for years without noticing. You cannot fail at twenty push-ups without noticing today.
  
  That is the real advantage of a small habit: it gives you an honest answer every single day.
  
  ## How to shrink a goal
  
  Take the goal and keep cutting it down until it sounds almost too easy:
  
  - "Read more" becomes "read 10 pages before bed"
  - "Save money" becomes "write down what I spent today"
  - "Sleep better" becomes "phone outside the bedroom at 11"
  - "Learn to code" becomes "one small exercise before breakfast"
  
  If you would still do it on your worst day, it is the right size.
  
  ## Let the streak do the work
  
  Once a habit is small enough to do daily, the streak starts to help you. On day three you do it because you decided to. On day thirty you do it because you do not want to break the chain. That is not weakness, that is using your own stubbornness in the right direction.
  
  ## Then grow it, slowly
  
  After a few weeks the small version feels automatic. That is the moment to add a little: ten pages become fifteen, twenty push-ups become thirty. Grow the habit only when the current size has stopped feeling like effort.
  
  Big goals are fine. Just do not try to do them. Do the small thing, every day, and let the goal arrive on its own.'),
      ('what-to-do-when-you-miss-a-day', 'You missed a day. Now what?', 'Missing a day does not ruin a habit. What you do the next morning decides everything. A short guide to getting back on track without guilt.', 'It happens to everyone. You were travelling, you were sick, there was a wedding, or you simply forgot. The streak that took weeks to build is back to zero, and a voice says: well, that is over then.
  
  It is not over. It is one day.
  
  ## The streak was never the point
  
  A streak is a tool to keep you going. It is not the result. The reading you did, the workouts you finished, the mornings you got up for, all of that is still yours. A counter going back to zero does not undo a single one of them.
  
  ## The rule that matters: never miss twice
  
  One missed day changes almost nothing. What changes things is the second day, because that is when "I missed" quietly becomes "I stopped".
  
  So the only job the next morning is small and clear: do it once. Not double to make up for it. Not a bigger, stricter plan. Just the normal habit, one time.
  
  ## Make the comeback easy
  
  - Do the smallest version. If the habit is a 45 minute workout, do ten minutes.
  - Do it early, before the day can get in the way.
  - Do not punish yourself. Guilt makes people avoid the thing, not do it.
  
  ## Look for the reason, not the blame
  
  Ask one honest question: why did it slip? Usually the answer is practical. The habit was at the wrong time of day, it was too big, or it depended on something that was not there. Fix that one thing and carry on.
  
  ## Fill it in honestly
  
  On HabitFlow you can go back in the monthly view and correct a day you really did but forgot to tick. Days you did not do stay empty, and that is fine. An honest record with gaps is worth more than a perfect one that is not true.
  
  You are not starting over. You are continuing, with one gap in the middle.')
    ) AS d(slug, title, excerpt, body)
    WHERE NOT EXISTS (SELECT 1 FROM blog_posts);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_motivation SMALLINT NOT NULL DEFAULT 2;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_comeback SMALLINT NOT NULL DEFAULT 1;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS app_icon VARCHAR(10) NOT NULL DEFAULT 'auto';
  CREATE TABLE IF NOT EXISTS arc_goals (
      id         SERIAL PRIMARY KEY,
      user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      season     INT NOT NULL,
      text       VARCHAR(140) NOT NULL,
      done       SMALLINT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS arc_goals_user ON arc_goals (user_id, season);
  ALTER TABLE winter_arc_members ADD COLUMN IF NOT EXISTS quote VARCHAR(160) NOT NULL DEFAULT '';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(2);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS show_age SMALLINT NOT NULL DEFAULT 1;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS show_gender SMALLINT NOT NULL DEFAULT 1;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS show_country SMALLINT NOT NULL DEFAULT 1;
  CREATE TABLE IF NOT EXISTS arc_badges (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(40)  NOT NULL UNIQUE,
      icon        VARCHAR(10)  NOT NULL DEFAULT '🏅',
      description VARCHAR(160) NOT NULL DEFAULT '',
      rule        VARCHAR(10)  NOT NULL DEFAULT 'manual',
      threshold   INT          NOT NULL DEFAULT 0,
      created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS user_badges (
      user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      badge_id   INT NOT NULL REFERENCES arc_badges(id) ON DELETE CASCADE,
      awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, badge_id)
  );
  ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(12);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_care SMALLINT NOT NULL DEFAULT 1;
  CREATE TABLE IF NOT EXISTS products (
      id            SERIAL PRIMARY KEY,
      name          VARCHAR(80)  NOT NULL,
      price         VARCHAR(40)  NOT NULL DEFAULT '',
      description   VARCHAR(600) NOT NULL DEFAULT '',
      url           VARCHAR(300) NOT NULL,
      is_active     SMALLINT     NOT NULL DEFAULT 1,
      image_version INT          NOT NULL DEFAULT 0,
      category      VARCHAR(40)  NOT NULL DEFAULT '',
      clicks        INT          NOT NULL DEFAULT 0,
      created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
  );
  INSERT INTO categories (name, icon)
    SELECT * FROM (VALUES ('Health','🧘'), ('Productivity','🎯'), ('Learning','📚'), ('Finance','💰'), ('Social','🤝'), ('Routine','⏰')) AS d(name, icon)
    WHERE NOT EXISTS (SELECT 1 FROM categories);
`;

function upToDate(): Promise<void> {
  globalForDb.habitflowMigrated ??= (async () => {
    // the newest addition: a column, so the check looks for that column
    const check = await pool().query("SELECT to_regclass('public.products') IS NOT NULL AS ok");
    if (!check.rows[0].ok) await pool().query(UPGRADES);
  })().catch((err) => {
    globalForDb.habitflowMigrated = undefined; // try again on the next request
    throw err;
  });
  return globalForDb.habitflowMigrated;
}

// Couldn't even get a connection (database busy or out of connections): worth
// one more try. Only failures from *before* the query ran are retried, so a
// write can never be applied twice.
//
// The same goes for a connection the database closed while it sat idle
// (57P05, or the socket simply being gone): the query never reached the
// database, so it is sent again on a fresh connection.
const BUSY = new Set(["53300", "57P03", "08001", "ECONNREFUSED", "57P05", "08006", "08003", "ECONNRESET", "EPIPE"]);
const isBusy = (err: { code?: string; message?: string }) => BUSY.has(err.code ?? "") || /timeout exceeded when trying to connect|Connection terminated|Client has encountered a connection error/i.test(err.message ?? "");

/** Queries are written with `?` placeholders; Postgres wants $1, $2, … */
function numbered(sql: string): string {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
}

async function run(sql: string, params: Param[]) {
  const text = numbered(sql);
  try {
    await upToDate();
    return await pool().query(text, params);
  } catch (first) {
    const err = first as { code?: string; message?: string };
    if (isBusy(err)) {
      // out of connections: give the others a moment to finish and hand theirs back
      await new Promise((resolve) => setTimeout(resolve, err.code === "53300" ? 1500 : 350));
      await upToDate();
      return pool().query(text, params);
    }
    throw first;
  }
}

/** SELECT → rows. Always parameterised — values are never built into the SQL text. */
export async function query<T = Record<string, unknown>>(sql: string, params: Param[] = []): Promise<T[]> {
  return (await run(sql, params)).rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(sql: string, params: Param[] = []): Promise<T | null> {
  return (await query<T>(sql, params))[0] ?? null;
}

/** INSERT / UPDATE / DELETE → how many rows changed (plus any RETURNING rows). */
export async function execute<T = Record<string, unknown>>(sql: string, params: Param[] = []): Promise<{ rowCount: number; rows: T[] }> {
  const result = await run(sql, params);
  return { rowCount: result.rowCount ?? 0, rows: result.rows as T[] };
}

/** A UNIQUE constraint was violated (e.g. the username was taken a moment ago). */
export function isDuplicateError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}
