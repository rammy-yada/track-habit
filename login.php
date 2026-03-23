<?php
require_once 'includes/config.php';
if (isLoggedIn()) { header('Location: dashboard.php'); exit(); }

$loginError = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'login') {
    if (!verifyCSRF($_POST['csrf_token'] ?? '')) {
        $loginError = 'Invalid request. Please try again.';
    } else {
        $identifier = sanitize($_POST['identifier'] ?? '');
        $password   = $_POST['password'] ?? '';
        if (empty($identifier) || empty($password)) {
            $loginError = 'Please enter your email/username and password.';
        } else {
            $db   = getDB();
            $stmt = $db->prepare("SELECT * FROM users WHERE (email = ? OR username = ?) AND is_active = 1 LIMIT 1");
            $stmt->execute([$identifier, $identifier]);
            $user = $stmt->fetch();
            if ($user && password_verify($password, $user['password'])) {
                $_SESSION['user_id']   = $user['id'];
                $_SESSION['username']  = $user['username'];
                $_SESSION['role']      = $user['role'];
                $_SESSION['full_name'] = $user['full_name'];
                $_SESSION['timezone']  = $user['timezone'];
                $db->prepare("UPDATE users SET last_login = UTC_TIMESTAMP() WHERE id = ?")->execute([$user['id']]);
                header('Location: dashboard.php');
                exit();
            } else {
                $loginError = 'Invalid credentials.';
            }
        }
    }
}
$csrf = generateCSRF();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sign In — HabitFlow</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  <?= getGlobalThemeStyles() ?>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', system-ui, sans-serif;
    background: var(--bg-main); color: var(--text-main);
    min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px;
  }
  .card {
    width: 100%; max-width: 400px;
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 32px;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
  }
  .logo { display: flex; align-items: center; gap: 9px; justify-content: center; margin-bottom: 24px; text-decoration: none; color: var(--text-main); }
  .logo-mark { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: #eff6ff; border-radius: 8px; color: var(--primary); }
  .logo-name { font-size: 18px; font-weight: 700; }
  h1 { font-size: 20px; font-weight: 600; margin-bottom: 4px; text-align: center; }
  .subtitle { color: var(--text-muted); font-size: 14px; margin-bottom: 24px; text-align: center; }
  .alert { padding: 10px 14px; border-radius: 6px; font-size: 13px; margin-bottom: 18px; background: #fee2e2; border: 1px solid #fecaca; color: var(--error); }
  .form-group { margin-bottom: 16px; }
  label { display: block; font-size: 12px; font-weight: 600; color: var(--text-main); margin-bottom: 6px; }
  .input-wrap { position: relative; }
  input {
    width: 100%; padding: 10px 14px; background: var(--bg-input);
    border: 1px solid var(--border); border-radius: 6px; color: var(--text-main);
    font-family: 'Inter', sans-serif; font-size: 14px; outline: none; transition: border-color 0.2s;
  }
  input:focus { border-color: var(--primary); }
  input.error { border-color: var(--error); }
  .toggle-pw { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); cursor: pointer; color: var(--text-muted); font-size: 11px; font-weight: 600; text-transform: uppercase; }
  .field-error { color: var(--error); font-size: 11px; margin-top: 4px; }
  .btn-submit { width: 100%; padding: 12px; background: var(--primary); border: none; border-radius: 6px; color: white; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 8px; transition: background 0.2s; }
  .btn-submit:hover { background: var(--primary-hover); }
  .bottom { text-align: center; margin-top: 20px; font-size: 14px; color: var(--text-muted); }
  .bottom a { color: var(--primary); text-decoration: none; font-weight: 600; }
  .bottom a:hover { text-decoration: underline; }
</style>
</head>
<body>
<div class="card">
  <a href="index.php" class="logo">
    <div class="logo-mark">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
    </div>
    <span class="logo-name">HabitFlow</span>
  </a>
  <h1>Sign in</h1>
  <p class="subtitle">Welcome back. Enter your details to continue.</p>

  <?php if ($loginError): ?>
  <div class="alert"><?= htmlspecialchars($loginError) ?></div>
  <?php endif; ?>

  <form method="POST" novalidate id="loginForm">
    <input type="hidden" name="action" value="login">
    <input type="hidden" name="csrf_token" value="<?= $csrf ?>">
    <div class="form-group">
      <label>Email or Username</label>
      <input type="text" name="identifier" id="li_id" placeholder="you@example.com" autocomplete="username" required>
      <div class="field-error" id="li_id_err"></div>
    </div>
    <div class="form-group">
      <label>Password</label>
      <div class="input-wrap">
        <input type="password" name="password" id="li_pw" placeholder="Your password" autocomplete="current-password" required>
        <span class="toggle-pw" onclick="togglePw('li_pw',this)">Show</span>
      </div>
      <div class="field-error" id="li_pw_err"></div>
    </div>
    <button type="submit" class="btn-submit">Sign In</button>
  </form>
  <div class="bottom">Don't have an account? <a href="register.php">Create one</a></div>
</div>
<script>
function togglePw(id, el) {
  const i = document.getElementById(id);
  i.type = i.type === 'password' ? 'text' : 'password';
  el.textContent = i.type === 'password' ? 'Show' : 'Hide';
}
document.getElementById('loginForm').addEventListener('submit', function(e) {
  let ok = true;
  const id = document.getElementById('li_id');
  const pw = document.getElementById('li_pw');
  if (!id.value.trim()) { document.getElementById('li_id_err').textContent = 'Required.'; id.classList.add('error'); ok = false; }
  else { document.getElementById('li_id_err').textContent = ''; id.classList.remove('error'); }
  if (!pw.value) { document.getElementById('li_pw_err').textContent = 'Required.'; pw.classList.add('error'); ok = false; }
  else { document.getElementById('li_pw_err').textContent = ''; pw.classList.remove('error'); }
  if (!ok) e.preventDefault();
});
</script>
</body>
</html>
