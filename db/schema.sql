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
