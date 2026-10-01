<?php require_once 'includes/config.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Support Us — <?= APP_NAME ?></title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
<?= getGlobalThemeStyles() ?>
:root { --sidebar-w: 240px; }
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Inter', sans-serif;background:var(--bg-main);color:var(--text-main);min-height:100vh;display:flex;}
.sidebar { width: var(--sidebar-w); min-width: var(--sidebar-w); background: var(--bg-card); border-right: 1px solid var(--border); display: flex; flex-direction: column; height: 100vh; position: sticky; top: 0; }
.sidebar-logo{padding:24px 20px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border);}
.logo-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: #eff6ff; border-radius: 8px; flex-shrink: 0; color: var(--primary); }
.logo-text { font-size: 18px; font-weight: 700; color: var(--text-main); }
.nav-section{padding:16px 12px 8px;}
.nav-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; padding: 0 8px; margin-bottom: 8px; }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; color: var(--text-muted); font-size: 14px; font-weight: 600; text-decoration: none; cursor: pointer; transition: all 0.2s; margin-bottom: 2px; }
.nav-item:hover { background: #f3f4f6; color: var(--text-main); }
.nav-item.active { background: #eff6ff; color: var(--primary); }
.sidebar-footer { margin-top: auto; padding: 16px 12px; border-top: 1px solid var(--border); }
.user-card{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background: #f9fafb;}
.avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;}
.user-info{flex:1;min-width:0;}
.user-name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.user-role{font-size:11px;color:var(--text-muted);}
.logout-btn{color:var(--text-muted);font-size:18px;cursor:pointer;text-decoration:none;padding:4px;}
.logout-btn:hover{color:var(--error);}
.main{flex:1;overflow-y:auto;background: var(--bg-main);}
.topbar { display: flex; align-items: center; padding: 20px 32px; border-bottom: 1px solid var(--border); background: var(--bg-main); position: sticky; top: 0; z-index: 10; }
.page-title { font-size: 20px; font-weight: 700; }
.content{padding:28px 32px;max-width:700px;}
.form-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 28px; margin-bottom: 24px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.card-title { font-size: 15px; font-weight: 700; margin-bottom: 8px; color: var(--text-main); }
.card-sub { font-size: 13px; color: var(--text-muted); margin-bottom: 24px; line-height: 1.5; }
.amount-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
.amount-opt { padding: 10px 18px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; background: var(--bg-input); color: var(--text-main); transition: all 0.2s; }
.amount-opt.selected, .amount-opt:hover { border-color: var(--primary); color: var(--primary); background: #eff6ff; }
.form-group{margin-bottom:20px;}
label { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
input[type=number],input[type=text]{width:100%;padding:10px 14px;background:#f9fafb;border:1px solid var(--border);border-radius:8px;color:var(--text-main);font-family:'Inter',sans-serif;font-size:14px;outline:none;transition:all 0.2s;}
input:focus{border-color:var(--primary);background:white;box-shadow:0 0 0 3px rgba(37,99,235,0.05);}
.submit-btn { padding: 12px 24px; background: var(--primary); border: none; border-radius: 8px; color: white; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; width: 100%; display: flex; align-items: center; justify-content: center; }
.submit-btn:hover { background: #1d4ed8; }
.esewa-logo { height: 28px; width: 28px; vertical-align: middle; margin-left: 8px; }
.btn-esewa-logo { height: 18px; width: 18px; vertical-align: middle; margin-right: 8px; margin-bottom: 2px; }
.alert{padding:12px 16px;border-radius:8px;font-size:13px;margin-bottom:20px;font-weight:500;}
.alert-success{background:#d1fae5;color:var(--success);}
.alert-error{background:#fee2e2;color:var(--error);}
.hist-table{width:100%;border-collapse:collapse;font-size:13px;}
.hist-table th{text-align:left;padding:8px 10px;color:var(--text-muted);font-weight:600;font-size:11px;text-transform:uppercase;border-bottom:1px solid var(--border);}
.hist-table td{padding:10px;border-bottom:1px solid #f3f4f6;}
.status-pill{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;}
.status-completed{background:#d1fae5;color:var(--success);}
.status-pending{background:#fef3c7;color:#d97706;}
.status-failed{background:#fee2e2;color:var(--error);}
.retry-btn{padding:5px 12px;border:1px solid var(--border);border-radius:6px;background:var(--bg-input);color:var(--primary);font-size:12px;font-weight:600;cursor:pointer;}
.retry-btn:hover{background:#eff6ff;border-color:var(--primary);}
.empty-hist{color:var(--text-muted);font-size:13px;padding:8px 0;}
@media(max-width:768px){.sidebar{display:none;}.content{padding:20px;}}
</style>
</head>
<body>
<?php
require_once 'includes/config.php';
requireLogin();
$user = currentUser();
$db = getDB();

// Silent upgrade — creates the table on first visit, same pattern used
// elsewhere in the app (see admin/index.php's categories table).
$db->exec("CREATE TABLE IF NOT EXISTS donations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    transaction_uuid VARCHAR(64) NOT NULL UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending','completed','failed') DEFAULT 'pending',
    esewa_ref_id VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)");

// An abandoned eSewa checkout never calls us back at all, so it would sit as
// "pending" forever. Anything left pending for over an hour is treated as
// abandoned and swept to "failed" so history reflects reality.
$db->exec("UPDATE donations SET status='failed' WHERE status='pending' AND created_at < (NOW() - INTERVAL 60 MINUTE)");

$error = '';
$payFields = null; // populated when we need to auto-submit the browser to eSewa

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'donate') {
    if (!verifyCSRF($_POST['csrf_token'] ?? '')) {
        $error = 'Invalid request. Please try again.';
    } else {
        $amount = (float)($_POST['amount'] ?? 0);
        if ($amount < 10 || $amount > 100000) {
            $error = 'Please enter an amount between NPR 10 and NPR 100,000.';
        } else {
            $amountStr = number_format($amount, 2, '.', '');
            $transactionUuid = date('Ymd-His') . '-' . bin2hex(random_bytes(4));

            $db->prepare("INSERT INTO donations (user_id, transaction_uuid, amount, status) VALUES (?,?,?, 'pending')")
               ->execute([$user['id'], $transactionUuid, $amountStr]);

            $fields = [
                'amount'                  => $amountStr,
                'tax_amount'              => '0',
                'total_amount'            => $amountStr,
                'transaction_uuid'        => $transactionUuid,
                'product_code'            => ESEWA_PRODUCT_CODE,
                'product_service_charge'  => '0',
                'product_delivery_charge' => '0',
                'success_url'             => APP_URL . '/esewa_success.php',
                'failure_url'             => APP_URL . '/esewa_failure.php?tx=' . urlencode($transactionUuid),
                'signed_field_names'      => 'total_amount,transaction_uuid,product_code',
            ];
            $fields['signature'] = esewaSignature($fields, ['total_amount', 'transaction_uuid', 'product_code'], ESEWA_SECRET_KEY);
            $payFields = $fields;
        }
    }
}

$stmt = $db->prepare("SELECT * FROM donations WHERE user_id=? ORDER BY created_at DESC LIMIT 10");
$stmt->execute([$user['id']]);
$history = $stmt->fetchAll();

$csrf = generateCSRF();
$flash = getFlash();
?>

<div class="sidebar">
  <div class="sidebar-logo">
    <div class="logo-icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
    </div>
    <div class="logo-text"><?= APP_NAME ?></div>
  </div>
  <div class="nav-section">
    <div class="nav-label">Main</div>
    <a href="dashboard.php" class="nav-item">Dashboard</a>
    <a href="analytics.php" class="nav-item">Analytics</a>
    <a href="monthly.php" class="nav-item">Monthly View</a>
    <a href="profile.php" class="nav-item">Profile</a>
    <a href="donate.php" class="nav-item active">Support Us</a>
    <?php if(isAdmin()):?><a href="admin/index.php" class="nav-item">Management</a><?php endif;?>
  </div>
  <div class="sidebar-footer">
    <div class="user-card">
      <div class="avatar" style="background:<?=htmlspecialchars($user['avatar_color'])?>;color:white"><?=strtoupper(substr($user['full_name'],0,1))?></div>
      <div class="user-info"><div class="user-name"><?=htmlspecialchars($user['full_name'])?></div><div class="user-role"><?=ucfirst($user['role'])?></div></div>
      <a href="logout.php" class="logout-btn" title="Logout" onclick="return confirm('Are you sure you want to logout?');">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      </a>
    </div>
  </div>
</div>

<div class="main">
  <div class="topbar"><div class="page-title">Support Us <img src="assets/images/esewa-logo.png" alt="eSewa" class="esewa-logo"></div></div>
  <div class="content">

    <?php if ($flash): ?>
    <div class="alert alert-<?= $flash['type'] === 'success' ? 'success' : 'error' ?>"><?= htmlspecialchars($flash['message']) ?></div>
    <?php endif; ?>

    <div class="form-card">
      <div class="card-title">Enjoying HabitFlow?</div>
      <div class="card-sub">
        Send a small contribution to support development. This runs against eSewa's
        official test environment, so no real money moves — it's here to demonstrate
        a working payment gateway integration.
      </div>

      <?php if ($error): ?><div class="alert alert-error"><?= htmlspecialchars($error) ?></div><?php endif; ?>

      <form method="POST" id="donateForm">
        <input type="hidden" name="action" value="donate">
        <input type="hidden" name="csrf_token" value="<?= $csrf ?>">
        <div class="form-group">
          <label>Choose an amount (NPR)</label>
          <div class="amount-row" id="amountRow">
            <?php foreach ([50, 100, 200, 500] as $a): ?>
            <div class="amount-opt" data-amt="<?= $a ?>" onclick="pickAmount(this)">Rs <?= $a ?></div>
            <?php endforeach; ?>
          </div>
          <input type="number" name="amount" id="amountInput" min="10" max="100000" step="1" placeholder="Or enter a custom amount" required>
        </div>
        <button type="submit" class="submit-btn"><img src="assets/images/esewa-logo.png" alt="" class="btn-esewa-logo">Proceed to eSewa</button>
      </form>
    </div>

    <?php if ($payFields): ?>
    <!-- Auto-submitting redirect form — this is the standard "hosted checkout"
         pattern: we never touch card/wallet details, we just hand the browser
         off to eSewa with a signed set of fields. -->
    <form id="esewaForm" action="<?= htmlspecialchars(ESEWA_FORM_URL) ?>" method="POST" style="display:none">
      <?php foreach ($payFields as $key => $val): ?>
      <input type="hidden" name="<?= htmlspecialchars($key) ?>" value="<?= htmlspecialchars($val) ?>">
      <?php endforeach; ?>
    </form>
    <script>document.getElementById('esewaForm').submit();</script>
    <?php endif; ?>

    <div class="form-card">
      <div class="card-title">Your Support History</div>
      <?php if (empty($history)): ?>
      <div class="empty-hist">No contributions yet.</div>
      <?php else: ?>
      <table class="hist-table">
        <thead><tr><th>Date</th><th>Amount</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <?php foreach ($history as $h): ?>
          <tr>
            <td><?= date('M j, Y g:i A', strtotime($h['created_at'])) ?></td>
            <td>Rs <?= number_format((float)$h['amount'], 2) ?></td>
            <td><span class="status-pill status-<?= $h['status'] ?>"><?= ucfirst($h['status']) ?></span></td>
            <td>
              <?php if (in_array($h['status'], ['pending', 'failed'], true)): ?>
              <form method="POST" style="display:inline">
                <input type="hidden" name="action" value="donate">
                <input type="hidden" name="csrf_token" value="<?= $csrf ?>">
                <input type="hidden" name="amount" value="<?= htmlspecialchars($h['amount']) ?>">
                <button type="submit" class="retry-btn">Retry</button>
              </form>
              <?php endif; ?>
            </td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
      <?php endif; ?>
    </div>

  </div>
</div>

<script>
function pickAmount(el) {
  document.querySelectorAll('.amount-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('amountInput').value = el.dataset.amt;
}
</script>
</body>
</html>
