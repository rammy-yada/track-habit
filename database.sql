-- ============================================================
-- HabitFlow Consolidated Database
-- ============================================================

CREATE DATABASE IF NOT EXISTS habitflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE habitflow;

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  UNIQUE NOT NULL,
    email         VARCHAR(100) UNIQUE NOT NULL,
    password      VARCHAR(255) NOT NULL,
    full_name     VARCHAR(100) NOT NULL,
    avatar_color  VARCHAR(7)   DEFAULT '#3b82f6',
    timezone      VARCHAR(50)  DEFAULT 'UTC',
    role          ENUM('user','admin') DEFAULT 'user',
    is_active     TINYINT(1)   DEFAULT 1,
    email_verified TINYINT(1)  DEFAULT 1, -- Default to verified as we removed email logic
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    last_login    TIMESTAMP    NULL,
    INDEX idx_email    (email),
    INDEX idx_username (username)
);

-- ── Habits ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habits (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT NOT NULL,
    name          VARCHAR(100) NOT NULL,
    description   TEXT,
    category      VARCHAR(50)  DEFAULT 'General',
    icon          VARCHAR(10)  DEFAULT '✅',
    color         VARCHAR(7)   DEFAULT '#3b82f6',
    frequency     ENUM('daily','weekly','monthly') DEFAULT 'daily',
    target_count  INT          DEFAULT 1,
    reminder_time TIME         NULL,
    is_active     TINYINT(1)   DEFAULT 1,
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- ── Habit Logs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habit_logs (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    habit_id        INT NOT NULL,
    user_id         INT NOT NULL,
    log_date        DATE NOT NULL,
    completed_count INT  DEFAULT 0,
    notes           TEXT,
    mood            ENUM('great','good','okay','bad') DEFAULT NULL,
    completed_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (habit_id) REFERENCES habits(id)  ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES users(id)   ON DELETE CASCADE,
    UNIQUE KEY unique_log   (habit_id, user_id, log_date),
    INDEX idx_log_date      (log_date),
    INDEX idx_user_date     (user_id, log_date)
);

-- ── Monthly Goals ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS monthly_goals (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    habit_id    INT NOT NULL,
    year        INT NOT NULL,
    month       INT NOT NULL,
    target_days INT DEFAULT 20,
    notes       TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
    UNIQUE KEY unique_goal (user_id, habit_id, year, month)
);

-- ── User Sessions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_sessions (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT NOT NULL,
    session_token VARCHAR(255) NOT NULL,
    expires_at    TIMESTAMP    NOT NULL,
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── OTP Codes ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_codes (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    email      VARCHAR(100) NOT NULL,
    otp_code   VARCHAR(6)   NOT NULL,
    purpose    ENUM('register','login','reset') DEFAULT 'register',
    expires_at TIMESTAMP    NOT NULL,
    used       TINYINT(1)   DEFAULT 0,
    attempts   INT          DEFAULT 0,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_otp (email, otp_code),
    INDEX idx_expires   (expires_at)
);

-- ── Default Admin User ───────────────────────────────────────
-- Password: admin123
INSERT IGNORE INTO users (username, email, password, full_name, role, is_active, email_verified, avatar_color)
VALUES ('admin', 'admin@habitflow.com', '$2y$10$B3AUT2pDEA3UfW/TXaFN9u1DVTavKgmYX2Km2cSzm7GyIfzkbbPFa', 'System Administrator', 'admin', 1, 1, '#2563eb');
