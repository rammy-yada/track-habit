<?php require_once 'includes/config.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Profile — HabitFlow</title>
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
.profile-header { display: flex; align-items: center; gap: 24px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 32px; margin-bottom: 24px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.big-avatar{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:white;flex-shrink:0;}
.profile-name { font-size: 22px; font-weight: 700; color: var(--text-main); }
.profile-meta{color:var(--text-muted);font-size:14px;margin-top:4px;font-weight:500;}
.form-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 28px; margin-bottom: 24px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.card-title { font-size: 15px; font-weight: 700; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px solid var(--border); color: var(--text-main); }
.form-group{margin-bottom:20px;}
label { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
input[type=text],input[type=email],input[type=password],select{width:100%;padding:10px 14px;background:#f9fafb;border:1px solid var(--border);border-radius:8px;color:var(--text-main);font-family:'Inter',sans-serif;font-size:14px;outline:none;transition:all 0.2s;}
input:focus,select:focus{border-color:var(--primary);background:white;box-shadow:0 0 0 3px rgba(37,99,235,0.05);}
.submit-btn { padding: 10px 24px; background: var(--primary); border: none; border-radius: 8px; color: white; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.submit-btn:hover { background: #1d4ed8; transform: translateY(-1px); }
.alert{padding:12px 16px;border-radius:8px;font-size:13px;margin-bottom:20px;font-weight:500;}
.alert-success{background:#d1fae5;color:var(--success);}
.alert-error{background:#fee2e2;color:var(--error);}
.input-wrap{position:relative;}
.toggle-pw { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); cursor: pointer; color: var(--text-muted); font-size: 12px; font-weight: 600; background: #eaebed; padding: 2px 8px; border-radius: 4px;}
.toggle-pw:hover{color:var(--text-main);background:#dce0e4;}
.color-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;}
.color-swatch{width:28px;height:28px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:all 0.2s;}
.color-swatch.selected{border-color:var(--primary);transform:scale(1.2);box-shadow:0 0 0 2px white inset;}
.danger-zone{border-color:#fee2e2;}
@media(max-width:768px){.sidebar{display:none;}.content{padding:20px;}}
</style>
</head>
<body>
<?php
require_once 'includes/config.php';
requireLogin();
$user = currentUser();
$db = getDB();
$today = getUserDate($user['timezone'] ?? 'UTC');

$profileMsg = ''; $profileType = '';
$pwMsg = ''; $pwType = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verifyCSRF($_POST['csrf_token'] ?? '')) { $profileMsg = 'Invalid request.'; $profileType = 'error'; }
    else {
        $action = $_POST['action'] ?? '';
        
        if ($action === 'update_profile') {
            $fn = sanitize($_POST['full_name'] ?? '');
            $tz = sanitize($_POST['timezone'] ?? 'UTC');
            $color = sanitize($_POST['avatar_color'] ?? '#2563eb');
            if (strlen($fn) < 2) { $profileMsg = 'Name must be at least 2 characters.'; $profileType = 'error'; }
            else {
                $db->prepare("UPDATE users SET full_name=?, timezone=?, avatar_color=? WHERE id=?")->execute([$fn,$tz,$color,$user['id']]);
                $_SESSION['full_name'] = $fn; $_SESSION['timezone'] = $tz;
                $profileMsg = 'Profile updated successfully!'; $profileType = 'success';
                $user = currentUser();
            }
        }
        
        if ($action === 'change_password') {
            $current = $_POST['current_password'] ?? '';
            $new = $_POST['new_password'] ?? '';
            $confirm = $_POST['confirm_password'] ?? '';
            if (!password_verify($current, $user['password'])) { $pwMsg = 'Current password is incorrect.'; $pwType = 'error'; }
            elseif ($new !== $confirm) { $pwMsg = 'New passwords do not match.'; $pwType = 'error'; }
            else {
                $pwErrors = validatePassword($new);
                if (!empty($pwErrors)) { $pwMsg = 'Password must be at least 6 characters.'; $pwType = 'error'; }
                else {
                    $db->prepare("UPDATE users SET password=? WHERE id=?")->execute([password_hash($new,PASSWORD_BCRYPT,['cost'=>12]),$user['id']]);
                    $pwMsg = 'Password changed successfully!'; $pwType = 'success';
                }
            }
        }
    }
}

$stmt = $db->prepare("SELECT COUNT(*) FROM habits WHERE user_id=? AND is_active=1");
$stmt->execute([$user['id']]); $habitCount = $stmt->fetchColumn();
$stmt = $db->prepare("SELECT COUNT(*) FROM habit_logs WHERE user_id=? AND completed_count>0");
$stmt->execute([$user['id']]); $checkinCount = $stmt->fetchColumn();

$csrf = generateCSRF();
?>

<div class="sidebar">
  <div class="sidebar-logo">
    <div class="logo-icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
    </div>
    <div class="logo-text">HabitFlow</div>
  </div>
  <div class="nav-section">
    <div class="nav-label">Main</div>
    <a href="dashboard.php" class="nav-item">Dashboard</a>
    <a href="analytics.php" class="nav-item">Analytics</a>
    <a href="monthly.php" class="nav-item">Monthly View</a>
    <a href="profile.php" class="nav-item active">Profile</a>
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
  <div class="topbar"><div class="page-title">Profile</div></div>
  <div class="content">
    <div class="profile-header">
      <div class="big-avatar" style="background:<?=htmlspecialchars($user['avatar_color'])?>">
        <?=strtoupper(substr($user['full_name'],0,1))?>
      </div>
      <div>
        <div class="profile-name"><?=htmlspecialchars($user['full_name'])?></div>
        <div class="profile-meta">@<?=htmlspecialchars($user['username'])?> · <?=htmlspecialchars($user['email'])?></div>
        <div class="profile-meta" style="margin-top:8px">
          <?=$habitCount?> Habits · <?=$checkinCount?> Check-ins
        </div>
      </div>
    </div>

    <!-- Update profile -->
    <div class="form-card">
      <div class="card-title">Edit Profile</div>
      <?php if($profileMsg):?><div class="alert alert-<?=$profileType?>"><?=$profileMsg?></div><?php endif;?>
      <form method="POST">
        <input type="hidden" name="csrf_token" value="<?=$csrf?>">
        <input type="hidden" name="action" value="update_profile">
        <div class="form-group"><label>Full Name</label><input type="text" name="full_name" value="<?=htmlspecialchars($user['full_name'])?>" required></div>
        <div class="form-group">
          <label>Avatar Color</label>
          <div class="color-row" id="colorRowProfile">
            <?php $colors=['#2563eb','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#14b8a6','#f97316','#84cc16','#ec4899'];
            foreach($colors as $c):?>
            <div class="color-swatch <?=$c===$user['avatar_color']?'selected':''?>" style="background:<?=$c?>" onclick="selectProfileColor(this,'<?=$c?>')"></div>
            <?php endforeach;?>
          </div>
          <input type="hidden" name="avatar_color" id="profileColor" value="<?=htmlspecialchars($user['avatar_color'])?>">
        </div>
        <div class="form-group">
          <label>Timezone</label>
          <select name="timezone">
            <?php foreach(['UTC','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Europe/London','Europe/Paris','Europe/Berlin','Asia/Dubai','Asia/Karachi','Asia/Kolkata','Asia/Dhaka','Asia/Bangkok','Asia/Singapore','Asia/Tokyo','Asia/Seoul','Australia/Sydney','Pacific/Auckland'] as $tz):?>
            <option value="<?=$tz?>" <?=$tz===$user['timezone']?'selected':''?>><?=$tz?></option>
            <?php endforeach;?>
          </select>
        </div>
        <button type="submit" class="submit-btn" style="width:100%">Save Changes</button>
      </form>
    </div>

    <!-- Change password -->
    <div class="form-card">
      <div class="card-title">Change Password</div>
      <?php if($pwMsg):?><div class="alert alert-<?=$pwType?>"><?=$pwMsg?></div><?php endif;?>
      <form method="POST">
        <input type="hidden" name="csrf_token" value="<?=$csrf?>">
        <input type="hidden" name="action" value="change_password">
        <div class="form-group">
          <label>Current Password</label>
          <div class="input-wrap"><input type="password" name="current_password" id="cp_cur" placeholder="Your current password"><span class="toggle-pw" onclick="toggleField('cp_cur',this)">SHOW</span></div>
        </div>
        <div class="form-group">
          <label>New Password</label>
          <div class="input-wrap"><input type="password" name="new_password" id="cp_new" placeholder="At least 6 characters"><span class="toggle-pw" onclick="toggleField('cp_new',this)">SHOW</span></div>
        </div>
        <div class="form-group">
          <label>Confirm New Password</label>
          <div class="input-wrap"><input type="password" name="confirm_password" id="cp_conf" placeholder="Repeat new password"><span class="toggle-pw" onclick="toggleField('cp_conf',this)">SHOW</span></div>
        </div>
        <button type="submit" class="submit-btn" style="width:100%">Update Password</button>
      </form>
    </div>

    <div class="form-card danger-zone">
      <div class="card-title" style="color:var(--error);border-bottom-color:#fee2e2;">Account Info</div>
      <p style="color:var(--text-muted);font-size:14px;margin-bottom:12px;font-weight:500;">Member since <?=date('M j, Y',strtotime($user['created_at']))?></p>
      <p style="color:var(--text-muted);font-size:13px;line-height:1.5;">To delete your account or export data, please contact an administrator.</p>
    </div>
  </div>
</div>

<script>
function selectProfileColor(el, color) {
  document.querySelectorAll('#colorRowProfile .color-swatch').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('profileColor').value = color;
}
function toggleField(id, el) {
  const i = document.getElementById(id);
  i.type = i.type==='password'?'text':'password';
  el.textContent = i.type==='password'?'SHOW':'HIDE';
}
</script>
</body>
</html>
