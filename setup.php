<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HabitFlow Setup</title>
<style>
  body { font-family: Arial, sans-serif; background: #0a0a0f; color: #f1f0ff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  .box { background: #13131a; border: 1px solid #2a2a3d; border-radius: 16px; padding: 40px; max-width: 520px; width: 100%; }
  h1 { font-size: 24px; margin-bottom: 6px; }
  p { color: #8b8aa8; margin-bottom: 24px; font-size: 14px; }
  .step { background: #1c1c28; border-radius: 10px; padding: 16px 20px; margin-bottom: 12px; font-size: 14px; }
  .step.ok { border-left: 3px solid #34d399; }
  .step.fail { border-left: 3px solid #f87171; }
  .step.info { border-left: 3px solid #7c6ff7; }
  .label { font-weight: 600; margin-bottom: 4px; }
  .sub { color: #8b8aa8; font-size: 13px; }
  .creds { background: #0a0a0f; border-radius: 8px; padding: 14px 18px; margin-top: 20px; }
  .cred-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; }
  .cred-key { color: #8b8aa8; }
  .cred-val { font-weight: 600; color: #34d399; font-family: monospace; }
  .btn { display: inline-block; margin-top: 20px; padding: 12px 28px; background: linear-gradient(135deg, #7c6ff7, #9b8ff9); border-radius: 8px; color: white; text-decoration: none; font-weight: 600; font-size: 15px; }
  .warn { background: rgba(251,191,36,.1); border: 1px solid rgba(251,191,36,.3); color: #fbbf24; border-radius: 8px; padding: 12px 16px; font-size: 13px; margin-top: 16px; }
</style>
</head>
<body>
<div class="box">
  <h1>🌊 HabitFlow Setup</h1>
  <p>Setting up your database and admin account...</p>

<?php
// Database config - change if needed
$host = 'localhost';
$user = 'root';
$pass = '';
$dbname = 'habitflow';

$steps = [];

// Step 1: Connect to MySQL
try {
    $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    $steps[] = ['ok', 'MySQL Connection', 'Connected successfully to MySQL.'];
} catch (Exception $e) {
    $steps[] = ['fail', 'MySQL Connection Failed', $e->getMessage()];
    foreach ($steps as $s) {
        echo "<div class='step {$s[0]}'><div class='label'>" . ($s[0]==='ok'?'✅':'❌') . " {$s[1]}</div><div class='sub'>{$s[2]}</div></div>";
    }
    echo "<div class='warn'>⚠️ Make sure XAMPP MySQL is running and credentials in setup.php are correct.</div></div></body></html>";
    exit();
}

// Step 2: Create database
try {
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `$dbname`");
    $steps[] = ['ok', 'Database', "Database '$dbname' created/selected."];
} catch (Exception $e) {
    $steps[] = ['fail', 'Database Creation Failed', $e->getMessage()];
}

// Step 3: Create tables
$tables = [
    "CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        avatar_color VARCHAR(7) DEFAULT '#6366f1',
        timezone VARCHAR(50) DEFAULT 'UTC',
        role ENUM('user','admin') DEFAULT 'user',
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL,
        INDEX idx_email (email),
        INDEX idx_username (username)
    )",
    "CREATE TABLE IF NOT EXISTS habits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        category VARCHAR(50) DEFAULT 'General',
        icon VARCHAR(10) DEFAULT '✅',
        color VARCHAR(7) DEFAULT '#6366f1',
        frequency ENUM('daily','weekly','monthly') DEFAULT 'daily',
        target_count INT DEFAULT 1,
        reminder_time TIME NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id)
    )",
    "CREATE TABLE IF NOT EXISTS habit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        habit_id INT NOT NULL,
        user_id INT NOT NULL,
        log_date DATE NOT NULL,
        completed_count INT DEFAULT 0,
        notes TEXT,
        mood ENUM('great','good','okay','bad') DEFAULT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_log (habit_id, user_id, log_date),
        INDEX idx_log_date (log_date),
        INDEX idx_user_date (user_id, log_date)
    )",
    "CREATE TABLE IF NOT EXISTS monthly_goals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        habit_id INT NOT NULL,
        year INT NOT NULL,
        month INT NOT NULL,
        target_days INT DEFAULT 20,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
        UNIQUE KEY unique_goal (user_id, habit_id, year, month)
    )",
    "CREATE TABLE IF NOT EXISTS user_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        session_token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )",
    "CREATE TABLE IF NOT EXISTS otp_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(100) NOT NULL,
        otp_code VARCHAR(6) NOT NULL,
        purpose ENUM('register','login','reset') DEFAULT 'register',
        expires_at TIMESTAMP NOT NULL,
        used TINYINT(1) DEFAULT 0,
        attempts INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email_otp (email, otp_code),
        INDEX idx_expires (expires_at)
    )"
];

$allTablesOk = true;
foreach ($tables as $sql) {
    try { $pdo->exec($sql); }
    catch (Exception $e) { $allTablesOk = false; $steps[] = ['fail', 'Table Error', $e->getMessage()]; }
}

// Add email_verified column if upgrading
try {
    $pdo->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified TINYINT(1) DEFAULT 0");
    $pdo->exec("UPDATE users SET email_verified = 1 WHERE role = 'admin'");
} catch (Exception $e) { /* already exists */ }

if ($allTablesOk) $steps[] = ['ok', 'Tables Created', 'All 6 tables created + OTP system ready.'];

// Step 4: Create/update admin user with freshly hashed password
$adminPass = 'OneTwo3!';
$adminEmail = 'admin@123.com';
$hash = password_hash($adminPass, PASSWORD_BCRYPT, ['cost' => 10]);

try {
    // Check if admin exists (by username OR any existing admin email)
    $chk = $pdo->prepare("SELECT id FROM users WHERE username = 'admin' OR email = ? OR email = 'admin@habitflow.com' LIMIT 1");
    $chk->execute([$adminEmail]);
    $existing = $chk->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        $upd = $pdo->prepare("UPDATE users SET password=?, role='admin', is_active=1, email=?, username='admin', full_name='System Administrator' WHERE id=?");
        $upd->execute([$hash, $adminEmail, $existing['id']]);
        $steps[] = ['ok', 'Admin Account', 'Existing admin account updated with new email and password.'];
    } else {
        $ins = $pdo->prepare("INSERT INTO users (username, email, password, full_name, role, avatar_color) VALUES ('admin',?,?,'System Administrator','admin','#f87171')");
        $ins->execute([$adminEmail, $hash]);
        $steps[] = ['ok', 'Admin Account', 'New admin account created successfully.'];
    }
    
    // Verify password works
    $ver = $pdo->prepare("SELECT password FROM users WHERE email=?");
    $ver->execute([$adminEmail]);
    $row = $ver->fetch(PDO::FETCH_ASSOC);
    if ($row && password_verify($adminPass, $row['password'])) {
        $steps[] = ['ok', 'Password Verified', 'Admin password hash verified — login will work correctly.'];
    } else {
        $steps[] = ['fail', 'Password Verification Failed', 'Something went wrong with hashing.'];
    }
} catch (Exception $e) {
    $steps[] = ['fail', 'Admin Account Failed', $e->getMessage()];
}

// Print all steps
foreach ($steps as $s) {
    $icon = $s[0]==='ok' ? '✅' : ($s[0]==='fail' ? '❌' : 'ℹ️');
    echo "<div class='step {$s[0]}'><div class='label'>$icon {$s[1]}</div><div class='sub'>{$s[2]}</div></div>";
}

$hasFailure = count(array_filter($steps, fn($s) => $s[0]==='fail')) > 0;
if (!$hasFailure):
?>
  <div class="creds">
    <div style="font-weight:600;margin-bottom:10px;font-size:14px;">🔑 Admin Login Credentials</div>
    <div class="cred-row"><span class="cred-key">Email</span><span class="cred-val">admin@123.com</span></div>
    <div class="cred-row"><span class="cred-key">Password</span><span class="cred-val">OneTwo3!</span></div>
    <div class="cred-row"><span class="cred-key">Username</span><span class="cred-val">admin</span></div>
  </div>
  <div class="warn">⚠️ Delete <strong>setup.php</strong> after logging in for security!</div>
  <a href="index.php" class="btn">Go to Login →</a>
<?php else: ?>
  <div class="warn">⚠️ Some steps failed. Check error messages above and make sure XAMPP MySQL is running.</div>
<?php endif; ?>

</div>
</body>
</html>
