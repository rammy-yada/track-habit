<?php
// ─────────────────────────────────────────────────────────────────────────────
// HabitFlow — includes/config.php
// ─────────────────────────────────────────────────────────────────────────────

// ── Application ──────────────────────────────────────────────
define('APP_NAME',       'HabitFlow');
define('APP_VERSION',    '1.0.0');

// Dynamic base path detection for portability
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$scriptName = dirname($_SERVER['SCRIPT_NAME']);
$basePath = ($scriptName === '/' || $scriptName === '\\') ? '' : $scriptName;
define('APP_URL', $protocol . "://" . $host . $basePath);

// ── Database ──────────────────────────────────────────────────
define('DB_HOST', '127.0.0.1');
define('DB_PORT', '3306');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'habitflow');

// ── Session ───────────────────────────────────────────────────
define('SESSION_LIFETIME', 86400); // 24 hours

// ── Timezone ──────────────────────────────────────────────────
date_default_timezone_set('UTC');

// ─────────────────────────────────────────────────────────────────────────────
// Session Initialization
// ─────────────────────────────────────────────────────────────────────────────
if (session_status() === PHP_SESSION_NONE) {
    session_start([
        'cookie_lifetime' => SESSION_LIFETIME,
        'cookie_httponly' => true,
        'cookie_samesite' => 'Strict',
    ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Database Connection
// ─────────────────────────────────────────────────────────────────────────────
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            die('<p style="font-family:sans-serif;color:#ef4444;padding:20px">Database connection failed. Please ensure XAMPP MySQL is running.</p>');
        }
    }
    return $pdo;
}

// ─────────────────────────────────────────────────────────────────────────────
// Authentication Helpers
// ─────────────────────────────────────────────────────────────────────────────
function isLoggedIn(): bool {
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

function requireLogin(): void {
    if (!isLoggedIn()) {
        header('Location: ' . APP_URL . '/login.php');
        exit();
    }
}

function isAdmin(): bool {
    return isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
}

function requireAdmin(): void {
    requireLogin();
    if (!isAdmin()) {
        header('Location: ' . APP_URL . '/dashboard.php');
        exit();
    }
}

function currentUser(): ?array {
    if (!isLoggedIn()) return null;
    $db   = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    return $stmt->fetch() ?: null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Input / Security Helpers
// ─────────────────────────────────────────────────────────────────────────────
function sanitize(string $input): string {
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

function validatePassword(string $password): array {
    $errors = [];
    if (strlen($password) < 8) {
        $errors[] = "Minimum 8 characters required";
    }
    if (!preg_match('/[A-Z]/', $password)) {
        $errors[] = "At least one uppercase letter required";
    }
    if (!preg_match('/[0-9]/', $password)) {
        $errors[] = "At least one number required";
    }
    return $errors;
}

function generateCSRF(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCSRF(string $token): bool {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getUserDate(string $timezone = 'UTC'): string {
    $dt = new DateTime('now', new DateTimeZone($timezone));
    return $dt->format('Y-m-d');
}

function setFlash(string $type, string $message): void {
    $_SESSION['flash'] = ['type' => $type, 'message' => $message];
}

function getFlash(): ?array {
    if (isset($_SESSION['flash'])) {
        $flash = $_SESSION['flash'];
        unset($_SESSION['flash']);
        return $flash;
    }
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// OTP Helpers
// ─────────────────────────────────────────────────────────────────────────────
function generateOTP(string $email, string $purpose = 'register'): string {
    $db = getDB();
    $db->prepare("UPDATE otp_codes SET used=1 WHERE email=? AND purpose=? AND used=0")->execute([$email, $purpose]);
    $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $db->prepare("INSERT INTO otp_codes (email, otp_code, purpose, expires_at) VALUES (?,?,?, UTC_TIMESTAMP() + INTERVAL 10 MINUTE)")->execute([$email, $code, $purpose]);
    return $code;
}

function verifyOTP(string $email, string $code, string $purpose = 'register'): bool {
    $db   = getDB();
    $stmt = $db->prepare("SELECT id, otp_code, attempts FROM otp_codes WHERE email=? AND purpose=? AND used=0 AND expires_at > UTC_TIMESTAMP() ORDER BY created_at DESC LIMIT 1");
    $stmt->execute([$email, $purpose]);
    $row = $stmt->fetch();
    if (!$row || $row['attempts'] >= 5) return false;
    $db->prepare("UPDATE otp_codes SET attempts=attempts+1 WHERE id=?")->execute([$row['id']]);
    if (hash_equals($row['otp_code'], trim($code))) {
        $db->prepare("UPDATE otp_codes SET used=1 WHERE id=?")->execute([$row['id']]);
        return true;
    }
    return false;
}

// Global Theme Styles (White, Blue, Black)
function getGlobalThemeStyles() {
    return "
    :root {
        --primary: #2563eb;
        --primary-hover: #1d4ed8;
        --bg-main: #ffffff;
        --bg-card: #f9fafb;
        --bg-input: #ffffff;
        --text-main: #111827;
        --text-muted: #6b7280;
        --border: #e5e7eb;
        --success: #10b981;
        --error: #ef4444;
    }";
}
