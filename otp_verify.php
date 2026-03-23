<?php
require_once 'includes/config.php';

$purpose = $_GET['purpose'] ?? 'register'; // register | login | reset
$email   = trim($_GET['email'] ?? '');

if (!in_array($purpose, ['register', 'login', 'reset'])) {
    header('Location: login.php'); exit();
}

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    header('Location: login.php'); exit();
}

// Validate session flow
if ($purpose === 'register' && empty($_SESSION['pending_reg'])) {
    header('Location: register.php'); exit();
}
if ($purpose === 'login' && empty($_SESSION['pending_login_uid'])) {
    header('Location: login.php'); exit();
}
if ($purpose === 'reset' && empty($_SESSION['reset_email'])) {
    header('Location: login.php'); exit();
}

$error   = '';
$success = '';
$csrf    = generateCSRF();

// Always show OTP for simplicity as per user request
$currentOTP = $_SESSION['dev_otp'] ?? '';

// ── Handle OTP submission ──
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'resend') {
        if (!verifyCSRF($_POST['csrf_token'] ?? '')) {
            $error = 'Security error. Please refresh and try again.';
        } else {
            $otp = generateOTP($email, $purpose);
            $_SESSION['dev_otp'] = $otp;
            $currentOTP = $otp;
            $success = 'A new verification code has been generated.';
        }
    }

    if ($action === 'verify') {
        if (!verifyCSRF($_POST['csrf_token'] ?? '')) {
            $error = 'Security error. Please refresh and try again.';
        } else {
            $digits = '';
            for ($i = 1; $i <= 6; $i++) {
                $digits .= preg_replace('/\D/', '', $_POST["d$i"] ?? '');
            }
            if (strlen($digits) < 6) {
                $digits = preg_replace('/\D/', '', $_POST['otp_code'] ?? '');
            }

            if (strlen($digits) !== 6) {
                $error = 'Please enter the full 6-digit code.';
            } elseif (!verifyOTP($email, $digits, $purpose)) {
                $error = 'Invalid or expired code.';
            } else {
                $db = getDB();
                if ($purpose === 'register') {
                    $reg = $_SESSION['pending_reg'];
                    $chk = $db->prepare("SELECT id FROM users WHERE email=? OR username=?");
                    $chk->execute([$reg['email'], $reg['username']]);
                    if ($chk->fetch()) {
                        $error = 'User already exists.';
                    } else {
                        $stmt = $db->prepare("INSERT INTO users (username, email, password, full_name, avatar_color, timezone, email_verified) VALUES (?,?,?,?,?,?,1)");
                        $stmt->execute([$reg['username'], $reg['email'], $reg['password'], $reg['full_name'], $reg['color'], $reg['timezone']]);
                        unset($_SESSION['pending_reg'], $_SESSION['dev_otp']);
                        $newId = $db->lastInsertId();
                        $_SESSION['user_id']   = $newId;
                        $_SESSION['username']  = $reg['username'];
                        $_SESSION['role']      = 'user';
                        $_SESSION['full_name'] = $reg['full_name'];
                        $_SESSION['timezone']  = $reg['timezone'];
                        $db->prepare("UPDATE users SET last_login=UTC_TIMESTAMP() WHERE id=?")->execute([$newId]);
                        header('Location: dashboard.php?welcome=1'); exit();
                    }
                }

                if ($purpose === 'login') {
                    $uid = $_SESSION['pending_login_uid'];
                    unset($_SESSION['pending_login_uid'], $_SESSION['pending_login_email'], $_SESSION['dev_otp']);
                    $u = $db->prepare("SELECT * FROM users WHERE id=? AND is_active=1 LIMIT 1");
                    $u->execute([$uid]);
                    $user = $u->fetch();
                    if ($user) {
                        $_SESSION['user_id']   = $user['id'];
                        $_SESSION['username']  = $user['username'];
                        $_SESSION['role']      = $user['role'];
                        $_SESSION['full_name'] = $user['full_name'];
                        $_SESSION['timezone']  = $user['timezone'];
                        $db->prepare("UPDATE users SET last_login=UTC_TIMESTAMP() WHERE id=?")->execute([$uid]);
                        header('Location: dashboard.php'); exit();
                    }
                }

                if ($purpose === 'reset') {
                    $_SESSION['otp_reset_verified'] = $email;
                    unset($_SESSION['reset_email'], $_SESSION['dev_otp']);
                    header('Location: reset_password.php'); exit();
                }
            }
        }
    }
}

$labels = [
    'register' => ['title' => 'Verify Your Email', 'sub' => 'Confirm your account creation.'],
    'login'    => ['title' => 'Verification Code', 'sub' => 'Confirm your login identity.'],
    'reset'    => ['title' => 'Reset Password',     'sub' => 'Verify before changing password.'],
];
$label = $labels[$purpose];
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= htmlspecialchars($label['title']) ?> – HabitFlow</title>
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
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 32px;
    width: 100%; max-width: 440px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
  }
  .logo { display: flex; align-items: center; gap: 9px; justify-content: center; margin-bottom: 24px; text-decoration: none; color: var(--text-main); }
  .logo-mark { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: #eff6ff; border-radius: 8px; color: var(--primary); }
  .logo-name { font-size: 18px; font-weight: 700; }
  .back-link { display: inline-block; color: var(--text-muted); font-size: 13px; text-decoration: none; margin-bottom: 24px; font-weight: 500; }
  .back-link:hover { color: var(--primary); }
  h1 { font-size: 20px; font-weight: 700; margin-bottom: 8px; text-align: center; }
  .subtitle { color: var(--text-muted); font-size: 14px; margin-bottom: 24px; text-align: center; }
  .otp-display {
    background: #eff6ff; border: 1px dashed var(--primary); border-radius: 8px;
    padding: 16px; text-align: center; margin-bottom: 24px;
  }
  .otp-display span { display: block; font-size: 12px; color: var(--primary); font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
  .otp-display strong { font-size: 28px; letter-spacing: 8px; color: var(--primary); font-family: monospace; }
  
  .alert { padding: 10px 14px; border-radius: 6px; font-size: 13px; margin-bottom: 20px; }
  .alert-error { background: #fee2e2; border: 1px solid #fecaca; color: var(--error); }
  .alert-success { background: #d1fae5; border: 1px solid #a7f3d0; color: var(--success); }

  .otp-boxes { display: flex; gap: 8px; justify-content: center; margin-bottom: 24px; }
  .otp-box {
    width: 48px; height: 56px; background: var(--bg-input); border: 1px solid var(--border);
    border-radius: 8px; text-align: center; font-size: 20px; font-weight: 700; color: var(--text-main); outline: none; transition: border-color 0.2s;
  }
  .otp-box:focus { border-color: var(--primary); }
  
  .btn-verify {
    width: 100%; padding: 12px; background: var(--primary); color: white; border: none; border-radius: 8px;
    font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s;
  }
  .btn-verify:hover { background: var(--primary-hover); }
  .btn-verify:disabled { opacity: 0.6; cursor: not-allowed; }

  .resend-row { text-align: center; margin-top: 24px; font-size: 13px; color: var(--text-muted); }
  .btn-resend { background: none; border: none; color: var(--primary); font-weight: 600; cursor: pointer; text-decoration: underline; margin-left: 4px; }
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
  <a href="login.php" class="back-link">← Change login details</a>
  <h1><?= htmlspecialchars($label['title']) ?></h1>
  <p class="subtitle"><?= htmlspecialchars($label['sub']) ?></p>

  <?php if ($currentOTP): ?>
  <div class="otp-display">
    <span>Your Verification Code</span>
    <strong><?= $currentOTP ?></strong>
  </div>
  <?php endif; ?>

  <?php if ($error):   ?><div class="alert alert-error"><?= $error ?></div><?php endif; ?>
  <?php if ($success): ?><div class="alert alert-success"><?= $success ?></div><?php endif; ?>

  <form method="POST" id="verifyForm">
    <input type="hidden" name="action" value="verify">
    <input type="hidden" name="csrf_token" value="<?= $csrf ?>">

    <div class="otp-boxes">
      <?php for($i=1; $i<=6; $i++): ?>
      <input class="otp-box" type="text" name="d<?= $i ?>" id="d<?= $i ?>" maxlength="1" inputmode="numeric" autocomplete="one-time-code" <?= $i===1?'autofocus':'' ?>>
      <?php endfor; ?>
    </div>

    <button type="submit" class="btn-verify" id="verifyBtn">Verify & Continue</button>
  </form>

  <form method="POST" class="resend-row">
    <input type="hidden" name="action" value="resend">
    <input type="hidden" name="csrf_token" value="<?= $csrf ?>">
    Didn't receive it? <button type="submit" class="btn-resend">Regenerate Code</button>
  </form>
</div>

<script>
const boxes = document.querySelectorAll('.otp-box');
boxes.forEach((box, i) => {
  box.addEventListener('input', e => {
    const val = e.target.value.replace(/\D/g, '');
    e.target.value = val ? val[val.length - 1] : '';
    if (val && i < boxes.length - 1) boxes[i + 1].focus();
  });
  box.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && !box.value && i > 0) boxes[i - 1].focus();
  });
});

// Auto-fill for convenience since we show it on screen
<?php if ($currentOTP): ?>
const code = "<?= $currentOTP ?>";
[...code].forEach((ch, i) => { if(boxes[i]) boxes[i].value = ch; });
<?php endif; ?>
</script>
</body>
</html>
