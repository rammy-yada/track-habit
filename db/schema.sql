-- ============================================================
-- HabitFlow database (PostgreSQL)
-- Applied by `npm run db:setup`; every statement is idempotent.
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id             SERIAL PRIMARY KEY,
    username       VARCHAR(50)  NOT NULL UNIQUE,
    email          VARCHAR(100) NOT NULL UNIQUE,
    password       VARCHAR(255) NOT NULL,
    full_name      VARCHAR(100) NOT NULL,
    avatar_color   VARCHAR(7)   DEFAULT '#3b82f6',
    timezone       VARCHAR(50)  DEFAULT 'UTC',
    role           VARCHAR(10)  NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active      SMALLINT     NOT NULL DEFAULT 1,
    email_verified SMALLINT     DEFAULT 1,
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    last_login     TIMESTAMP    NULL,
    google_id      VARCHAR(64)  NULL   -- set for accounts created with "Sign in with Google"
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS users_google_id ON users (google_id);
-- bumped each time the profile photo changes (0 = no photo); also busts caches
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_version INT NOT NULL DEFAULT 0;

-- Profile photos: small WebP images (256px), one per user.
CREATE TABLE IF NOT EXISTS avatars (
    user_id    INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    image      BYTEA NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- "Tom" and "tom" are the same account: usernames and emails are unique ignoring case.
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower ON users (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS habits (
    id            SERIAL PRIMARY KEY,
    user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name          VARCHAR(100) NOT NULL,
    description   TEXT,
    category      VARCHAR(50)  DEFAULT 'General',
    icon          VARCHAR(10)  DEFAULT '✅',
    color         VARCHAR(7)   DEFAULT '#3b82f6',
    frequency     VARCHAR(10)  NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    target_count  INT          DEFAULT 1,
    reminder_time TIME         NULL,
    is_active     SMALLINT     NOT NULL DEFAULT 1,
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS habits_user ON habits (user_id);

-- One row per habit per day.
CREATE TABLE IF NOT EXISTS habit_logs (
    id              SERIAL PRIMARY KEY,
    habit_id        INT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id         INT NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    log_date        DATE NOT NULL,
    completed_count INT  NOT NULL DEFAULT 0,
    notes           TEXT,
    mood            VARCHAR(10) CHECK (mood IN ('great', 'good', 'okay', 'bad')),
    completed_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (habit_id, user_id, log_date)
);
CREATE INDEX IF NOT EXISTS habit_logs_user_date ON habit_logs (user_id, log_date);
CREATE INDEX IF NOT EXISTS habit_logs_date ON habit_logs (log_date);

CREATE TABLE IF NOT EXISTS monthly_goals (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    habit_id    INT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    year        INT NOT NULL,
    month       INT NOT NULL,
    target_days INT DEFAULT 20,
    notes       TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, habit_id, year, month)
);

CREATE TABLE IF NOT EXISTS otp_codes (
    id         SERIAL PRIMARY KEY,
    email      VARCHAR(100) NOT NULL,
    otp_code   VARCHAR(6)   NOT NULL,
    purpose    VARCHAR(10)  NOT NULL DEFAULT 'register' CHECK (purpose IN ('register', 'login', 'reset')),
    expires_at TIMESTAMP    NOT NULL,
    used       SMALLINT     NOT NULL DEFAULT 0,
    attempts   INT          NOT NULL DEFAULT 0,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS otp_codes_email ON otp_codes (email, purpose);

CREATE TABLE IF NOT EXISTS categories (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(50) NOT NULL UNIQUE,
    icon       VARCHAR(10) DEFAULT '📋',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Winter Arc (Oct 1 – Dec 31): one row per user per year they opt in.
-- Joining is what puts a user on the public leaderboard.
CREATE TABLE IF NOT EXISTS winter_arc_members (
    user_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    season    INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, season)
);

-- ── Email ────────────────────────────────────────────────────
-- email_lang: NULL = choose from the timezone (Nepal → Nepali, otherwise English)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_lang VARCHAR(5);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_reminders SMALLINT NOT NULL DEFAULT 1;

-- "Forgot password" links. Only a SHA-256 hash of the token is stored, so a
-- copy of this table cannot be used to reset anyone's password.
CREATE TABLE IF NOT EXISTS password_resets (
    id         SERIAL PRIMARY KEY,
    user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used       SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- One row per reminder sent, so nobody gets the same reminder twice in a day.
CREATE TABLE IF NOT EXISTS email_log (
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind    VARCHAR(20) NOT NULL,
    day     DATE NOT NULL,
    PRIMARY KEY (user_id, kind, day)
);

-- ── Winter Arc extras ────────────────────────────────────────
-- Pictures an admin uploads for the intro scene ("before" / "after").
CREATE TABLE IF NOT EXISTS site_images (
    slot       VARCHAR(20) PRIMARY KEY,
    image      BYTEA NOT NULL,
    version    INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Push notifications ───────────────────────────────────────
-- One row per device that has notifications turned on. `endpoint` is the
-- device's address at its browser's push service.
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id         SERIAL PRIMARY KEY,
    user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint   TEXT NOT NULL UNIQUE,
    p256dh     TEXT NOT NULL,
    auth       TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Guess limiting: one row per failed sign-in / email requested. Too many
-- recent rows for a key and the action is refused (see src/lib/throttle.ts).
CREATE TABLE IF NOT EXISTS rate_limits (
    id         BIGSERIAL PRIMARY KEY,
    key        VARCHAR(160) NOT NULL,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS rate_limits_key ON rate_limits (key, created_at);

-- ── Site settings ────────────────────────────────────────────
-- Small pieces of admin-editable configuration, stored as JSON text.
-- 'arc' holds the Winter Arc intro's shake, sound and wording, and the
-- surprise messages. site_images.mime lets that table hold the intro sound too.
--
-- ── Winter Arc packs ─────────────────────────────────────────
-- A pack is a ready-made set of habits an admin puts together. A member picks
-- one when joining; its habits are created for them automatically
-- (habits.arc_habit_id points back at the pack habit, habits.arc_season marks
-- the habit as part of that season's Winter Arc section). A habit added to a
-- pack later is created for everyone already on that pack.
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
-- Packs come in two kinds. 'arc': chosen when joining the Winter Arc (one per
-- member per season, recorded in winter_arc_members.pack_id). 'open': any
-- member can add it from their Today screen at any time (pack_members).
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

-- ── Blog ─────────────────────────────────────────────────────
-- Posts written in Admin → Blog. The body is plain text with a few simple
-- marks (## heading, - list item, **bold**); it is never treated as HTML.
--
-- ── Inquiries ────────────────────────────────────────────────
-- What people send through the Collaborate and Brand deals forms.
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

-- ── Notification and app-icon preferences ────────────────────
-- notify_motivation: motivation notifications a day (0 = none, up to 3).
-- notify_comeback:   1 = nudge me when I have been away for a few days.
-- app_icon:          'auto' (Winter Arc icon while in the arc), 'classic' or 'arc'.
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_motivation SMALLINT NOT NULL DEFAULT 2;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_comeback SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS app_icon VARCHAR(10) NOT NULL DEFAULT 'auto';

-- ── Winter Arc: personal goals and quote ─────────────────────
-- arc_goals: what a member wants to have achieved by the end of the season.
-- winter_arc_members.quote: a line of their own, put on a picture to share.
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

-- ── Profile details, and who may see them ────────────────────
-- gender, birth_date and country are asked for once, before the app can be
-- used. On someone's leaderboard profile their age, gender and country are
-- shown only while the matching show_* switch is on (Profile → Privacy).
--
-- ── Winter Arc badges ────────────────────────────────────────
-- Made by an admin. rule says how one is earned: 'points', 'streak' or
-- 'perfect' (reached automatically at `threshold`), or 'manual' (given to
-- chosen people — recorded in user_badges).
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
