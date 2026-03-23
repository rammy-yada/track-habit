<?php require_once '../includes/config.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin Panel — HabitFlow</title>
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
.admin-badge { background: #fee2e2; color: var(--error); font-size: 10px; padding: 2px 8px; border-radius: 4px; margin-left: 6px; font-weight: 800; }
.nav-section{padding:16px 12px 8px;}
.nav-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; padding: 0 8px; margin-bottom: 8px; }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; color: var(--text-muted); font-size: 14px; font-weight: 600; text-decoration: none; cursor: pointer; transition: all 0.2s; margin-bottom: 2px; }
.nav-item:hover { background: #f3f4f6; color: var(--text-main); }
.nav-item.active { background: #fee2e2; color: var(--error); }
.sidebar-footer { margin-top: auto; padding: 16px 12px; border-top: 1px solid var(--border); }
.user-card{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background: #f9fafb;}
.avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;}
.user-info{flex:1;min-width:0;}
.user-name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.user-role{font-size:11px;color:var(--text-muted);}
.logout-btn{color:var(--text-muted);font-size:18px;cursor:pointer;text-decoration:none;padding:4px;}
.logout-btn:hover{color:var(--error);}
.main{flex:1;overflow-y:auto;background: var(--bg-main);}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:20px 32px;border-bottom:1px solid var(--border);background:var(--bg-main);position:sticky;top:0;z-index:10;}
.page-title{font-size:20px;font-weight:700;}
.content{padding:28px 32px;}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px;}
.stat-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.stat-value { font-size: 28px; font-weight: 700; color: var(--text-main); }
.stat-label { font-size: 13px; color: var(--text-muted); margin-top: 4px; font-weight: 600; }
.section-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; color: var(--text-main); }
.table-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 24px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.data-table{width:100%;border-collapse:collapse;font-size:13px;}
.data-table th { text-align: left; padding: 12px 16px; color: var(--text-muted); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); background: #f9fafb; }
.data-table td{padding:12px 16px;border-bottom:1px solid #f3f4f6;}
.data-table tr:last-child td{border-bottom:none;}
.data-table tr:hover td{background:#f9fafb;}
.badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
.badge-admin { background: #fee2e2; color: var(--error); }
.badge-user { background: #eff6ff; color: var(--primary); }
.badge-active { background: #d1fae5; color: var(--success); }
.badge-inactive { background: #f3f4f6; color: #6b7280; }
.action-btn { padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--border); background: #f9fafb; color: var(--text-muted); transition: all 0.2s; text-decoration: none; display: inline-block;}
.action-btn:hover { border-color: var(--primary); color: var(--primary); background: white; }
.action-btn.danger:hover { border-color: var(--error); color: var(--error); }
.search-bar{display:flex;gap:12px;margin-bottom:20px;align-items:center;}
.search-input { padding: 10px 14px; background: white; border: 1px solid var(--border); border-radius: 8px; color: var(--text-main); font-family: 'Inter', sans-serif; font-size: 14px; outline: none; width: 320px; transition: all 0.2s; }
.search-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(37,99,235,0.05); }
.alert{padding:12px 16px;border-radius:8px;font-size:13px;margin-bottom:20px;font-weight:600;}
.alert-success{background:#d1fae5;color:var(--success);border:1px solid rgba(52,211,153,0.2);}
.alert-error{background:#fee2e2;color:var(--error);border:1px solid rgba(248,113,113,0.2);}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);z-index:100;display:none;align-items:center;justify-content:center;}
.modal-overlay.open{display:flex;}
.modal { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 32px; width: 100%; max-width: 480px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
.modal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;}
.modal-title{font-size:18px;font-weight:700;color:var(--text-main);}
.modal-close{cursor:pointer;color:var(--text-muted);font-size:20px;font-weight:600;}
.form-group{margin-bottom:16px;}
label { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
input[type=text],input[type=email],input[type=password],select{width:100%;padding:10px 14px;background:#f9fafb;border:1px solid var(--border);border-radius:8px;color:var(--text-main);font-family:'Inter',sans-serif;font-size:14px;outline:none;transition:all 0.2s;}
input:focus,select:focus{border-color:var(--primary);background:white;}
.submit-btn { width: 100%; padding: 12px; background: var(--primary); border: none; border-radius: 8px; color: white; font-size: 15px; font-weight: 700; cursor: pointer; margin-top: 12px; transition: all 0.2s; }
.submit-btn:hover { background: #1d4ed8; transform: translateY(-1px); }
.input-wrap{position:relative;}
.toggle-pw { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); cursor: pointer; color: var(--text-muted); font-size: 11px; font-weight: 700; background: #eaebed; padding: 2px 6px; border-radius: 4px; }
@media(max-width:1100px){.stats-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:768px){.sidebar{display:none;}.content{padding:20px;}}
</style>
</head>
<body>
<?php
require_once '../includes/config.php';
requireAdmin();
$user = currentUser();
$db = getDB();

$msg = ''; $msgType = '';

// Handle actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verifyCSRF($_POST['csrf_token'] ?? '')) { $msg = 'Invalid request.'; $msgType = 'error'; }
    else {
        $action = $_POST['action'] ?? '';
        
        if ($action === 'add_user') {
            $fn = sanitize($_POST['full_name'] ?? '');
            $un = sanitize($_POST['username'] ?? '');
            $em = sanitize($_POST['email'] ?? '');
            $pw = $_POST['password'] ?? '';
            $role = in_array($_POST['role']??'',['user','admin']) ? $_POST['role'] : 'user';
            
            $errors = [];
            if (strlen($fn)<2) $errors[]='Full name too short.';
            if (!preg_match('/^[a-zA-Z0-9_]{3,20}$/', $un)) $errors[]='Invalid username.';
            if (!filter_var($em, FILTER_VALIDATE_EMAIL)) $errors[]='Invalid email.';
            $pwErr = validatePassword($pw);
            if (!empty($pwErr)) $errors[] = 'Password too short (min 6).';
            
            if (empty($errors)) {
                $chk = $db->prepare("SELECT id FROM users WHERE email=? OR username=?");
                $chk->execute([$em,$un]);
                if ($chk->fetch()) { $msg='Email or username already exists.'; $msgType='error'; }
                else {
                    $hp = password_hash($pw, PASSWORD_BCRYPT, ['cost'=>12]);
                    $db->prepare("INSERT INTO users (username,email,password,full_name,role) VALUES (?,?,?,?,?)")->execute([$un,$em,$hp,$fn,$role]);
                    $msg = 'User created successfully!'; $msgType = 'success';
                }
            } else { $msg = implode(' ', $errors); $msgType = 'error'; }
        }
        
        if ($action === 'toggle_user') {
            $uid = (int)$_POST['user_id'];
            if ($uid !== $user['id']) {
                $db->prepare("UPDATE users SET is_active = NOT is_active WHERE id=?")->execute([$uid]);
                $msg = 'User status updated.'; $msgType = 'success';
            }
        }
        
        if ($action === 'delete_user') {
            $uid = (int)$_POST['user_id'];
            if ($uid !== $user['id']) {
                $db->prepare("DELETE FROM users WHERE id=?")->execute([$uid]);
                $msg = 'User deleted.'; $msgType = 'success';
            } else { $msg = 'Cannot delete your own account.'; $msgType = 'error'; }
        }
        
        if ($action === 'change_role') {
            $uid = (int)$_POST['user_id'];
            $role = in_array($_POST['role']??'',['user','admin']) ? $_POST['role'] : 'user';
            if ($uid !== $user['id']) {
                $db->prepare("UPDATE users SET role=? WHERE id=?")->execute([$role,$uid]);
                $msg = 'Role updated.'; $msgType = 'success';
            }
        }
    }
}

// Stats
$totalUsers = $db->query("SELECT COUNT(*) FROM users")->fetchColumn();
$activeUsers = $db->query("SELECT COUNT(*) FROM users WHERE is_active=1")->fetchColumn();
$totalHabits = $db->query("SELECT COUNT(*) FROM habits WHERE is_active=1")->fetchColumn();
$totalCheckins = $db->query("SELECT COUNT(*) FROM habit_logs WHERE completed_count>0")->fetchColumn();

// Users list
$search = sanitize($_GET['search'] ?? '');
if ($search) {
    $stmt = $db->prepare("SELECT u.*, COUNT(DISTINCT h.id) as habit_count, COUNT(DISTINCT hl.id) as checkin_count FROM users u LEFT JOIN habits h ON u.id=h.user_id AND h.is_active=1 LEFT JOIN habit_logs hl ON u.id=hl.user_id WHERE (u.username LIKE ? OR u.email LIKE ? OR u.full_name LIKE ?) GROUP BY u.id ORDER BY u.created_at DESC");
    $s = "%$search%";
    $stmt->execute([$s,$s,$s]);
} else {
    $stmt = $db->prepare("SELECT u.*, COUNT(DISTINCT h.id) as habit_count, COUNT(DISTINCT hl.id) as checkin_count FROM users u LEFT JOIN habits h ON u.id=h.user_id AND h.is_active=1 LEFT JOIN habit_logs hl ON u.id=hl.user_id GROUP BY u.id ORDER BY u.created_at DESC");
    $stmt->execute();
}
$users = $stmt->fetchAll();
$csrf = generateCSRF();
?>

<div class="sidebar">
  <div class="sidebar-logo">
    <div class="logo-icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
    </div>
    <div class="logo-text">Admin <span class="admin-badge">ADMIN</span></div>
  </div>
  <div class="nav-section">
    <div class="nav-label">Management</div>
    <a href="index.php" class="nav-item active">Users</a>
    <div class="nav-label" style="margin-top:12px;">App</div>
    <a href="../dashboard.php" class="nav-item">Dashboard</a>
    <a href="../analytics.php" class="nav-item">Analytics</a>
  </div>
  <div class="sidebar-footer">
    <div class="user-card">
      <div class="avatar" style="background:<?=htmlspecialchars($user['avatar_color'])?>;color:white"><?=strtoupper(substr($user['full_name'],0,1))?></div>
      <div class="user-info"><div class="user-name"><?=htmlspecialchars($user['full_name'])?></div><div class="user-role">Administrator</div></div>
      <a href="../logout.php" class="logout-btn" title="Logout" onclick="return confirm('Are you sure you want to logout?');">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      </a>
    </div>
  </div>
</div>

<div class="main">
  <div class="topbar">
    <div class="page-title">Management Console</div>
    <button class="action-btn" onclick="document.getElementById('addUserModal').classList.add('open')" style="background:var(--primary);color:white;border:none;padding:10px 20px;">+ Add User</button>
  </div>
  <div class="content">
    <?php if($msg):?><div class="alert alert-<?=$msgType?>"><?=htmlspecialchars($msg)?></div><?php endif;?>
    
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value"><?=$totalUsers?></div><div class="stat-label">Total Users</div></div>
      <div class="stat-card"><div class="stat-value"><?=$activeUsers?></div><div class="stat-label">Active Now</div></div>
      <div class="stat-card"><div class="stat-value"><?=$totalHabits?></div><div class="stat-label">Total Habits</div></div>
      <div class="stat-card"><div class="stat-value"><?=$totalCheckins?></div><div class="stat-label">Total Check-ins</div></div>
    </div>

    <div class="section-title">User Directory</div>
    <form method="GET" class="search-bar">
      <input type="text" class="search-input" name="search" placeholder="Search users..." value="<?=htmlspecialchars($search)?>">
      <button type="submit" class="action-btn">Search</button>
      <?php if($search):?><a href="index.php" class="action-btn">Clear</a><?php endif;?>
    </form>

    <div class="table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>User</th><th>Email</th><th>Role</th><th>Status</th>
            <th>Habits</th><th>Check-ins</th><th>Joined</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <?php if(empty($users)):?>
          <tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted)">No users found.</td></tr>
          <?php else: foreach($users as $u): ?>
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:12px;">
                <div class="avatar" style="background:<?=htmlspecialchars($u['avatar_color']??'#2563eb')?>;color:white;width:30px;height:30px;font-size:12px;">
                  <?=strtoupper(substr($u['full_name'],0,1))?>
                </div>
                <div>
                  <div style="font-size:13px;font-weight:700"><?=htmlspecialchars($u['full_name'])?></div>
                  <div style="font-size:11px;color:var(--text-muted)">@<?=htmlspecialchars($u['username'])?></div>
                </div>
              </div>
            </td>
            <td style="color:var(--text-muted);font-weight:500;"><?=htmlspecialchars($u['email'])?></td>
            <td><span class="badge badge-<?=$u['role']?>"><?=ucfirst($u['role'])?></span></td>
            <td><span class="badge badge-<?=$u['is_active']?'active':'inactive'?>"><?=$u['is_active']?'Active':'Inactive'?></span></td>
            <td style="text-align:center;font-weight:700;"><?=$u['habit_count']?></td>
            <td style="text-align:center;font-weight:700;"><?=$u['checkin_count']?></td>
            <td style="color:var(--text-muted);font-size:12px;font-weight:500;"><?=date('M j, Y',strtotime($u['created_at']))?></td>
            <td>
              <?php if($u['id']!==$user['id']):?>
              <form method="POST" style="display:inline">
                <input type="hidden" name="csrf_token" value="<?=$csrf?>">
                <input type="hidden" name="user_id" value="<?=$u['id']?>">
                <input type="hidden" name="action" value="toggle_user">
                <button type="submit" class="action-btn"><?=$u['is_active']?'Disable':'Enable'?></button>
              </form>
              <form method="POST" style="display:inline" onsubmit="return confirm('Delete this user and ALL their data permanently?')">
                <input type="hidden" name="csrf_token" value="<?=$csrf?>">
                <input type="hidden" name="user_id" value="<?=$u['id']?>">
                <input type="hidden" name="action" value="delete_user">
                <button type="submit" class="action-btn danger">Delete</button>
              </form>
              <?php else: ?>
              <span style="color:var(--text-muted);font-size:12px;font-weight:600;">You</span>
              <?php endif; ?>
            </td>
          </tr>
          <?php endforeach; endif; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- Add User Modal -->
<div class="modal-overlay" id="addUserModal">
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title">New User Account</div>
      <span class="modal-close" onclick="document.getElementById('addUserModal').classList.remove('open')">×</span>
    </div>
    <form method="POST">
      <input type="hidden" name="csrf_token" value="<?=$csrf?>">
      <input type="hidden" name="action" value="add_user">
      <div class="form-group"><label>Full Name</label><input type="text" name="full_name" placeholder="Enter full name" required></div>
      <div class="form-group"><label>Username</label><input type="text" name="username" placeholder="Choose a username" required></div>
      <div class="form-group"><label>Email Address</label><input type="email" name="email" placeholder="user@example.com" required></div>
      <div class="form-group">
        <label>Initial Password</label>
        <div class="input-wrap">
          <input type="password" name="password" id="admin_pw" placeholder="Minimum 6 characters" required>
          <span class="toggle-pw" onclick="const i=document.getElementById('admin_pw');i.textContent=i.textContent==='SHOW'?'HIDE':'SHOW';i.type=i.type==='password'?'text':'password'">SHOW</span>
        </div>
      </div>
      <div class="form-group">
        <label>Account Role</label>
        <select name="role">
          <option value="user">Standard User</option>
          <option value="admin">Administrator</option>
        </select>
        <button type="submit" class="submit-btn" style="width:100%; padding:12px; background:var(--primary); color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer;">Create Account</button>
    </form>
  </div>
</div>

<script>
document.getElementById('addUserModal')?.addEventListener('click', e => { if(e.target===e.currentTarget) e.currentTarget.classList.remove('open'); });
</script>
</body>
</html>
