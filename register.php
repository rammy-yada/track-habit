<?php
require_once 'includes/config.php';
if (isLoggedIn()) { header('Location: dashboard.php'); exit(); }

$registerError = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'register') {
    if (!verifyCSRF($_POST['csrf_token'] ?? '')) {
        $registerError = 'Invalid request. Please try again.';
    } else {
        $fullName        = sanitize($_POST['full_name'] ?? '');
        $username        = sanitize($_POST['username'] ?? '');
        $email           = sanitize($_POST['email'] ?? '');
        $password        = $_POST['password'] ?? '';
        $confirmPassword = $_POST['confirm_password'] ?? '';
        $timezone        = sanitize($_POST['timezone'] ?? 'UTC');

        $errors = [];
        if (strlen($fullName) < 2)                               $errors[] = 'Full name must be at least 2 characters.';
        if (!preg_match('/^[a-zA-Z0-9_]{3,20}$/', $username))   $errors[] = 'Username: 3-20 chars, letters/numbers/underscore only.';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL))          $errors[] = 'Please enter a valid email address.';
        $pwErrors = validatePassword($password);
        if (!empty($pwErrors))                                   $errors[] = 'Password: ' . implode(', ', $pwErrors) . '.';
        if ($password !== $confirmPassword)                      $errors[] = 'Passwords do not match.';

        if (empty($errors)) {
            $db   = getDB();
            $stmt = $db->prepare("SELECT id FROM users WHERE email = ? OR username = ?");
            $stmt->execute([$email, $username]);
            if ($stmt->fetch()) {
                $registerError = 'Email or username already in use.';
            } else {
                $colors = ['#3b82f6','#2563eb','#1d4ed8','#1e40af','#1e3a8a'];
                $_SESSION['pending_reg'] = [
                    'username'  => $username,
                    'email'     => $email,
                    'password'  => password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]),
                    'full_name' => $fullName,
                    'timezone'  => $timezone,
                    'color'     => $colors[array_rand($colors)],
                    'ts'        => time(),
                ];
                $otp = generateOTP($email, 'register');
                $_SESSION['dev_otp'] = $otp; // Always store in session for easy verification UI
                header('Location: otp_verify.php?purpose=register&email=' . urlencode($email));
                exit();
            }
        } else {
            $registerError = implode(' ', $errors);
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
<title>Create Account — HabitFlow</title>
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
    width: 100%; max-width: 440px;
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 32px;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
  }
  .logo { display: flex; align-items: center; gap: 9px; justify-content: center; margin-bottom: 24px; text-decoration: none; color: var(--text-main); }
  .logo-mark { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: #eff6ff; border-radius: 8px; color: var(--primary); }
  .logo-name { font-size: 18px; font-weight: 700; }
  h1 { font-size: 20px; font-weight: 600; margin-bottom: 4px; text-align: center; }
  .subtitle { color: var(--text-muted); font-size: 14px; margin-bottom: 24px; text-align: center; }
  .alert { padding: 10px 14px; border-radius: 6px; font-size: 13px; margin-bottom: 16px; background: #fee2e2; border: 1px solid #fecaca; color: var(--error); }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .form-group { margin-bottom: 16px; }
  label { display: block; font-size: 12px; font-weight: 600; color: var(--text-main); margin-bottom: 6px; }
  .input-wrap { position: relative; }
  input[type="text"], input[type="email"], input[type="password"], select {
    width: 100%; padding: 10px 14px; background: var(--bg-input);
    border: 1px solid var(--border); border-radius: 6px; color: var(--text-main);
    font-family: 'Inter', sans-serif; font-size: 14px; outline: none; transition: border-color 0.2s;
  }
  input:focus, select:focus { border-color: var(--primary); }
  input.error { border-color: var(--error); }
  .toggle-pw { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); cursor: pointer; color: var(--text-muted); font-size: 11px; font-weight: 600; text-transform: uppercase; }
  .field-error { color: var(--error); font-size: 11px; margin-top: 4px; }
  .hint { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
  .btn-submit { width: 100%; padding: 12px; background: var(--primary); border: none; border-radius: 6px; color: white; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 8px; transition: background 0.2s; }
  .btn-submit:hover { background: var(--primary-hover); }
  .bottom { text-align: center; margin-top: 20px; font-size: 14px; color: var(--text-muted); }
  .bottom a { color: var(--primary); text-decoration: none; font-weight: 600; }
  .bottom a:hover { text-decoration: underline; }
  @media(max-width: 500px) { .form-row { grid-template-columns: 1fr; } }
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
  <h1>Create account</h1>
  <p class="subtitle">Start tracking your habits today.</p>

  <?php if ($registerError): ?>
  <div class="alert"><?= htmlspecialchars($registerError) ?></div>
  <?php endif; ?>

  <form method="POST" novalidate id="regForm">
    <input type="hidden" name="action" value="register">
    <input type="hidden" name="csrf_token" value="<?= $csrf ?>">

    <div class="form-row">
      <div class="form-group">
        <label>Full Name</label>
        <input type="text" name="full_name" id="r_name" placeholder="John Doe" required>
        <div class="field-error" id="r_name_err"></div>
      </div>
      <div class="form-group">
        <label>Username</label>
        <input type="text" name="username" id="r_uname" placeholder="john_doe" required>
        <div class="field-error" id="r_uname_err"></div>
      </div>
    </div>

    <div class="form-group">
      <label>Email</label>
      <input type="email" name="email" id="r_email" placeholder="you@example.com" required>
      <div class="field-error" id="r_email_err"></div>
    </div>

    <div class="form-group">
      <label>Password</label>
      <div class="input-wrap">
        <input type="password" name="password" id="r_pw" placeholder="At least 6 characters" autocomplete="new-password" required>
        <span class="toggle-pw" onclick="togglePw('r_pw',this)">Show</span>
      </div>
    </div>

    <div class="form-group">
      <label>Confirm Password</label>
      <div class="input-wrap">
        <input type="password" name="confirm_password" id="r_conf" placeholder="Repeat password" autocomplete="new-password" required>
        <span class="toggle-pw" onclick="togglePw('r_conf',this)">Show</span>
      </div>
      <div class="field-error" id="r_conf_err"></div>
    </div>

    <div class="form-group">
      <label>Timezone</label>
      <select name="timezone" id="r_tz">
        <option value="UTC">UTC</option>
        <option value="America/New_York">New York (EST)</option>
        <option value="America/Chicago">Chicago (CST)</option>
        <option value="America/Denver">Denver (MST)</option>
        <option value="America/Los_Angeles">Los Angeles (PST)</option>
        <option value="Europe/London">London (GMT)</option>
        <option value="Europe/Paris">Paris (CET)</option>
        <option value="Asia/Dubai">Dubai (GST)</option>
        <option value="Asia/Karachi">Karachi (PKT)</option>
        <option value="Asia/Kathmandu">Kathmandu (NPT)</option>
        <option value="Asia/Kolkata">India (IST)</option>
        <option value="Asia/Dhaka">Dhaka (BST)</option>
        <option value="Asia/Bangkok">Bangkok (ICT)</option>
        <option value="Asia/Singapore">Singapore (SGT)</option>
        <option value="Asia/Tokyo">Tokyo (JST)</option>
        <option value="Asia/Seoul">Seoul (KST)</option>
        <option value="Australia/Sydney">Sydney (AEST)</option>
        <option value="Pacific/Auckland">Auckland (NZST)</option>
      </select>
      <div class="hint">Habits reset at midnight in your timezone.</div>
    </div>

    <button type="submit" class="btn-submit">Create Account</button>
  </form>
  <div class="bottom">Already have an account? <a href="login.php">Sign in</a></div>
</div>

<script>
function togglePw(id, el) {
  const i = document.getElementById(id);
  i.type = i.type === 'password' ? 'text' : 'password';
  el.textContent = i.type === 'password' ? 'Show' : 'Hide';
}

// Auto-detect timezone
const sel = document.getElementById('r_tz');
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
for (let opt of sel.options) { if (opt.value === tz) { opt.selected = true; break; } }

// Real-time password hints
document.getElementById('r_pw').addEventListener('input', function() {
  const v = this.value;
  const hints = document.getElementById('pw_hints');
  if (!v) { hints.style.display = 'none'; return; }
  hints.style.display = 'block';
  document.getElementById('hint_len').style.color = v.length >= 8 ? 'var(--success)' : 'var(--error)';
  document.getElementById('hint_upper').style.color = /[A-Z]/.test(v) ? 'var(--success)' : 'var(--error)';
  document.getElementById('hint_num').style.color = /[0-9]/.test(v) ? 'var(--success)' : 'var(--error)';
});

// Form validation
document.getElementById('regForm').addEventListener('submit', function(e) {
  let ok = true;
  const fields = [
    ['r_name', v => v.trim().length >= 2, 'r_name_err', 'At least 2 characters required.'],
    ['r_uname', v => /^[a-zA-Z0-9_]{3,20}$/.test(v.trim()), 'r_uname_err', '3-20 chars, letters/numbers/underscore only.'],
    ['r_email', v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), 'r_email_err', 'Please enter a valid email address.'],
  ];
  fields.forEach(([id, fn, errId, msg]) => {
    const inp = document.getElementById(id);
    const err = document.getElementById(errId);
    if (!fn(inp.value)) { err.textContent = msg; err.style.display='block'; inp.classList.add('error'); ok = false; }
    else { err.style.display='none'; inp.classList.remove('error'); }
  });
  const pw = document.getElementById('r_pw').value;
  const confErr = document.getElementById('r_conf_err');
  if (pw.length < 8 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) {
    confErr.textContent = 'Password must be 8+ characters with 1 uppercase letter and 1 number.';
    confErr.style.display = 'block';
    document.getElementById('r_pw').classList.add('error'); ok = false;
  } else {
    document.getElementById('r_pw').classList.remove('error');
    const conf = document.getElementById('r_conf').value;
    if (pw !== conf) { confErr.textContent = 'Passwords do not match.'; confErr.style.display='block'; document.getElementById('r_conf').classList.add('error'); ok = false; }
    else { confErr.style.display='none'; document.getElementById('r_conf').classList.remove('error'); }
  }
  if (!ok) e.preventDefault();
});
</script>
</body>
</html>
