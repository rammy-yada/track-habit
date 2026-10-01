<?php 
require_once 'includes/config.php'; 
requireLogin();
$user = currentUser();
$db = getDB();
$today = getUserDate($user['timezone'] ?? 'UTC');
$todayFormatted = date('D, M j', strtotime($today));

// Handle AJAX requests - MUST BE AT THE VERY TOP
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['ajax'])) {
    header('Content-Type: application/json');
    if (!verifyCSRF($_POST['csrf_token'] ?? '')) {
        echo json_encode(['success' => false, 'error' => 'Invalid request']);
        exit();
    }
    $action = $_POST['action'] ?? '';
    
    if ($action === 'toggle') {
        $habitId = (int)$_POST['habit_id'];
        $stmt = $db->prepare("SELECT id FROM habits WHERE id=? AND user_id=?");
        $stmt->execute([$habitId, $user['id']]);
        if (!$stmt->fetch()) { echo json_encode(['success'=>false,'error'=>'Not found']); exit(); }
        $stmt = $db->prepare("SELECT id, completed_count FROM habit_logs WHERE habit_id=? AND user_id=? AND log_date=?");
        $stmt->execute([$habitId, $user['id'], $today]);
        $log = $stmt->fetch();
        if ($log) {
            $db->prepare("DELETE FROM habit_logs WHERE id=?")->execute([$log['id']]);
            $status = 'unchecked';
        } else {
            $stmt = $db->prepare("INSERT INTO habit_logs (habit_id,user_id,log_date,completed_count) VALUES (?,?,?,1) ON DUPLICATE KEY UPDATE completed_count=1");
            $stmt->execute([$habitId, $user['id'], $today]);
            $status = 'checked';
        }
        $stmt = $db->prepare("SELECT COUNT(*) FROM habit_logs WHERE user_id=? AND log_date=? AND completed_count>0");
        $stmt->execute([$user['id'], $today]);
        $doneToday = $stmt->fetchColumn();
        $stmt = $db->prepare("SELECT COUNT(*) FROM habits WHERE user_id=? AND is_active=1");
        $stmt->execute([$user['id']]);
        $totalHabits = $stmt->fetchColumn();
        $stmt = $db->prepare("SELECT COUNT(*) FROM habit_logs WHERE user_id=? AND completed_count>0");
        $stmt->execute([$user['id']]);
        $totalEntries = $stmt->fetchColumn();
        echo json_encode(['success' => true, 'status' => $status, 'stats' => ['doneToday' => $doneToday, 'totalHabits' => $totalHabits, 'completionRate' => $totalHabits > 0 ? round(($doneToday / $totalHabits) * 100) : 0, 'totalEntries' => $totalEntries ]]);
        exit();
    }
    
    if ($action === 'add_habit') {
        $name = sanitize($_POST['name'] ?? '');
        $desc = sanitize($_POST['description'] ?? '');
        $category = sanitize($_POST['category'] ?? 'General');
        $icon = sanitize($_POST['icon'] ?? '✅');
        $color = sanitize($_POST['color'] ?? '#6366f1');
        $freq = sanitize($_POST['frequency'] ?? 'daily');
        $target = max(1, (int)($_POST['target_count'] ?? 1));
        $reminder = sanitize($_POST['reminder_time'] ?? '');
        if (empty($name)) { echo json_encode(['success'=>false,'error'=>'Habit name is required.']); exit(); }
        if (strlen($name) > 100) { echo json_encode(['success'=>false,'error'=>'Name too long (max 100 chars).']); exit(); }
        $cnt = $db->prepare("SELECT COUNT(*) FROM habits WHERE user_id=? AND is_active=1");
        $cnt->execute([$user['id']]);
        if ($cnt->fetchColumn() >= 50) { echo json_encode(['success'=>false,'error'=>'Maximum 50 habits allowed.']); exit(); }
        $stmt = $db->prepare("INSERT INTO habits (user_id,name,description,category,icon,color,frequency,target_count,reminder_time) VALUES (?,?,?,?,?,?,?,?,?)");
        $stmt->execute([$user['id'],$name,$desc,$category,$icon,$color,$freq,$target, $reminder?:null]);
        $newId = $db->lastInsertId();
        $stmt = $db->prepare("SELECT COUNT(*) FROM habit_logs WHERE user_id=? AND log_date=? AND completed_count>0");
        $stmt->execute([$user['id'], $today]);
        $doneToday = $stmt->fetchColumn();
        $stmt = $db->prepare("SELECT COUNT(*) FROM habits WHERE user_id=? AND is_active=1");
        $stmt->execute([$user['id']]);
        $totalHabits = $stmt->fetchColumn();
        echo json_encode(['success' => true, 'id' => $newId, 'habit' => ['id' => $newId, 'name' => $name, 'icon' => $icon, 'category' => $category, 'frequency' => $freq, 'reminder_time' => $reminder ? date('g:i A', strtotime($reminder)) : null, 'color' => $color ], 'stats' => ['doneToday' => $doneToday, 'totalHabits' => $totalHabits, 'completionRate' => $totalHabits > 0 ? round(($doneToday / $totalHabits) * 100) : 0 ]]);
        exit();
    }
    
    if ($action === 'delete_habit') {
        $habitId = (int)$_POST['habit_id'];
        $db->prepare("UPDATE habits SET is_active=0 WHERE id=? AND user_id=?")->execute([$habitId,$user['id']]);
        $stmt = $db->prepare("SELECT COUNT(*) FROM habit_logs WHERE user_id=? AND log_date=? AND completed_count>0");
        $stmt->execute([$user['id'], $today]);
        $doneToday = $stmt->fetchColumn();
        $stmt = $db->prepare("SELECT COUNT(*) FROM habits WHERE user_id=? AND is_active=1");
        $stmt->execute([$user['id']]);
        $totalHabits = $stmt->fetchColumn();
        $stmt = $db->prepare("SELECT COUNT(*) FROM habit_logs WHERE user_id=? AND completed_count>0");
        $stmt->execute([$user['id']]);
        $totalEntries = $stmt->fetchColumn();
        echo json_encode(['success' => true, 'stats' => ['doneToday' => $doneToday, 'totalHabits' => $totalHabits, 'completionRate' => $totalHabits > 0 ? round(($doneToday / $totalHabits) * 100) : 0, 'totalEntries' => $totalEntries ]]);
        exit();
    }
    
    if ($action === 'chart_data') {
        $days = 30;
        $startDate = date('Y-m-d', strtotime("-$days days", strtotime($today)));
        $stmt = $db->prepare("SELECT log_date, COUNT(DISTINCT habit_id) as done, (SELECT COUNT(*) FROM habits WHERE user_id=? AND is_active=1 AND frequency='daily') as total FROM habit_logs WHERE user_id=? AND log_date >= ? AND log_date <= ? GROUP BY log_date ORDER BY log_date ASC");
        $stmt->execute([$user['id'], $user['id'], $startDate, $today]);
        $rows = $stmt->fetchAll();
        $data = []; $labels = [];
        for ($i=$days; $i>=0; $i--) {
            $d = date('Y-m-d', strtotime("-$i days", strtotime($today)));
            $labels[] = date('M j', strtotime($d));
            $found = array_filter($rows, fn($r) => $r['log_date']===$d);
            $found = array_values($found);
            $data[] = $found ? (int)$found[0]['done'] : 0;
        }
        echo json_encode(['success'=>true,'labels'=>$labels,'data'=>$data]);
        exit();
    }
}

// Load habits
$stmt = $db->prepare("
    SELECT h.*, 
    (SELECT completed_count FROM habit_logs WHERE habit_id=h.id AND user_id=h.user_id AND log_date=?) as today_done,
    (SELECT COUNT(*) FROM habit_logs WHERE habit_id=h.id AND user_id=h.user_id) as total_done,
    (SELECT log_date FROM habit_logs WHERE habit_id=h.id AND user_id=h.user_id ORDER BY log_date DESC LIMIT 1) as last_done
    FROM habits h WHERE h.user_id=? AND h.is_active=1 ORDER BY h.created_at ASC
");
$stmt->execute([$today, $user['id']]);
$habits = $stmt->fetchAll();

// Calculate streaks
foreach ($habits as &$habit) {
    $streak = 0; $checkDate = $today;
    for ($i=0; $i<365; $i++) {
        $s = $db->prepare("SELECT id FROM habit_logs WHERE habit_id=? AND user_id=? AND log_date=? AND completed_count>0");
        $s->execute([$habit['id'], $user['id'], $checkDate]);
        if ($s->fetch()) { $streak++; $checkDate = date('Y-m-d', strtotime('-1 day', strtotime($checkDate))); }
        else break;
    }
    $habit['streak'] = $streak;
    $dots = [];
    for ($i=6; $i>=0; $i--) {
        $d = date('Y-m-d', strtotime("-$i days", strtotime($today)));
        $s = $db->prepare("SELECT id FROM habit_logs WHERE habit_id=? AND user_id=? AND log_date=?");
        $s->execute([$habit['id'], $user['id'], $d]);
        $dots[] = $s->fetch() ? 1 : 0;
    }
    $habit['dots'] = $dots;
}
unset($habit);

$totalHabits = count($habits);
$doneToday = count(array_filter($habits, fn($h) => $h['today_done']));
$completionRate = $totalHabits > 0 ? round(($doneToday / $totalHabits) * 100) : 0;
$maxStreak = $habits ? max(array_column($habits, 'streak')) : 0;
$totalEntries = $habits ? array_sum(array_column($habits, 'total_done')) : 0;

$month = date('Y-m', strtotime($today));
$daysInMonth = date('t', strtotime($today));
$currentDay = (int)date('j', strtotime($today));

$categories = $db->query("SELECT * FROM categories ORDER BY name ASC")->fetchAll();
$csrf = generateCSRF();
$flash = getFlash();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dashboard — <?= APP_NAME ?></title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
<?= getGlobalThemeStyles() ?>
:root {
  --sidebar-w: 240px;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', system-ui, sans-serif; background: var(--bg-main); color: var(--text-main); min-height: 100vh; display: flex; }

/* Sidebar */
.sidebar {
  width: var(--sidebar-w);
  min-width: var(--sidebar-w);
  background: var(--bg-card);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  top: 0;
}
.sidebar-logo {
  padding: 24px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--border);
}
.logo-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: #eff6ff; border-radius: 8px; flex-shrink: 0; color: var(--primary); }
.logo-text { font-size: 18px; font-weight: 700; color: var(--text-main); }

.nav-section { padding: 16px 12px 8px; }
.nav-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; padding: 0 8px; margin-bottom: 8px; }
.nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 8px;
  color: var(--text-muted); font-size: 14px; font-weight: 600;
  text-decoration: none; cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 2px;
}
.nav-item:hover { background: #f3f4f6; color: var(--text-main); }
.nav-item.active { background: #eff6ff; color: var(--primary); }

.sidebar-footer {
  margin-top: auto;
  padding: 16px 12px;
  border-top: 1px solid var(--border);
}
.user-card {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 10px;
  background: #f9fafb;
}
.avatar {
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 13px; flex-shrink: 0;
}
.user-info { flex: 1; min-width: 0; }
.user-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-role { font-size: 11px; color: var(--text-muted); }
.logout-btn { color: var(--text-muted); font-size: 18px; cursor: pointer; text-decoration: none; padding: 4px; }
.logout-btn:hover { color: var(--error); }

/* Main content */
.main { flex: 1; overflow-y: auto; background: var(--bg-main); }

.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 32px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-main);
  position: sticky; top: 0; z-index: 10;
}
.page-title { font-size: 20px; font-weight: 700; }
.topbar-right { display: flex; align-items: center; gap: 12px; }
.date-badge {
  background: #f3f4f6;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 13px;
  color: var(--text-muted);
}
.add-habit-btn {
  background: var(--primary);
  border: none; color: white;
  padding: 10px 18px; border-radius: 8px;
  font-size: 13px; font-weight: 600;
  cursor: pointer; transition: background 0.2s;
}
.add-habit-btn:hover { background: var(--primary-hover); }

/* Content */
.content { padding: 28px 32px; }

/* Stats row */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 28px;
}
.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.stat-value { font-size: 24px; font-weight: 700; color: var(--text-main); }
.stat-label { font-size: 12px; font-weight: 600; color: var(--text-muted); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
.stat-trend { font-size: 12px; margin-top: 8px; color: var(--primary); font-weight: 500; }

/* Habits section */
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.section-title { font-size: 16px; font-weight: 700; }
.filter-tabs { display: flex; gap: 4px; }
.ftab {
  padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600;
  background: #f3f4f6; border: 1px solid var(--border); color: var(--text-muted);
  cursor: pointer; transition: all 0.2s;
}
.ftab.active { background: var(--primary); border-color: var(--primary); color: white; }

/* Habit list */
.habit-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 28px; }
.habit-row {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s;
}
.habit-row:hover { border-color: var(--primary); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.habit-row.completed { background: #fafafa; border-color: var(--border); opacity: 0.8; }
.habit-checkbox {
  width: 26px; height: 26px; border-radius: 6px; flex-shrink: 0;
  border: 2px solid var(--border); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; font-size: 14px; font-weight: 700;
}
.habit-checkbox.checked { border-color: var(--success); background: var(--success); color: white; }
.habit-icon-wrap {
  width: 40px; height: 40px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; flex-shrink: 0; background: #f3f4f6;
}
.habit-info { flex: 1; min-width: 0; }
.habit-name { font-size: 15px; font-weight: 600; }
.habit-meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.habit-streak { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; }
.streak-dot { color: var(--primary); font-size: 12px; }
.habit-dots { display: flex; gap: 4px; margin-top: 6px; }
.hdot { width: 7px; height: 7px; border-radius: 2px; }
.habit-actions { display: flex; gap: 6px; }
.ha-btn {
  width: 32px; height: 32px; border-radius: 6px;
  background: #f3f4f6; border: 1px solid var(--border);
  color: var(--text-muted); cursor: pointer; font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.ha-btn:hover { border-color: var(--primary); color: var(--primary); background: #eff6ff; }
.ha-btn.del:hover { border-color: var(--error); color: var(--error); background: #fee2e2; }

.empty-state {
  text-align: center; padding: 60px 20px;
  background: #fafafa; border: 1px dashed var(--border); border-radius: 12px;
}
.empty-icon { font-size: 40px; margin-bottom: 16px; opacity: 0.5; }
.empty-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
.empty-sub { color: var(--text-muted); font-size: 14px; margin-bottom: 24px; }
.empty-cta {
  background: var(--primary);
  border: none; color: white;
  padding: 12px 24px; border-radius: 8px;
  font-size: 14px; font-weight: 600;
  cursor: pointer;
}

/* Charts area */
.charts-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 20px;
  margin-bottom: 28px;
}
.chart-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.chart-title { font-size: 14px; font-weight: 700; margin-bottom: 20px; color: var(--text-main); }

/* Monthly table */
.monthly-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  overflow-x: auto;
  margin-bottom: 28px;
}
.monthly-table {
  width: 100%; border-collapse: collapse; font-size: 12px;
}
.monthly-table th {
  text-align: left; padding: 10px;
  color: var(--text-muted); font-weight: 600;
  border-bottom: 1px solid var(--border);
  text-transform: uppercase; letter-spacing: 0.5px;
}
.monthly-table td {
  padding: 12px 10px;
  border-bottom: 1px solid #f3f4f6;
}
.monthly-table tr:last-child td { border-bottom: none; }
.day-cell {
  width: 20px; height: 20px; border-radius: 4px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 10px; cursor: default;
}
.day-done { background: #d1fae5; color: var(--success); font-weight: 700; }
.day-miss { background: #f3f4f6; color: #9ca3af; }
.day-skip { background: transparent; color: #e5e7eb; }
.progress-bar-wrap { background: #f3f4f6; border-radius: 4px; height: 6px; width: 60px; overflow: hidden; }
.progress-bar-fill { height: 100%; border-radius: 4px; background: var(--primary); }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5); backdrop-filter: blur(2px);
  z-index: 100; display: none;
  align-items: center; justify-content: center;
}
.modal-overlay.open { display: flex; }
.modal {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 28px;
  width: 100%; max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
}
.modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
.modal-title { font-size: 18px; font-weight: 700; }
.modal-close { cursor: pointer; color: var(--text-muted); font-size: 24px; line-height: 1; }
.modal-close:hover { color: var(--text-main); }

.form-group { margin-bottom: 16px; }
label { display: block; font-size: 12px; font-weight: 600; color: var(--text-main); margin-bottom: 6px; }
input[type="text"], input[type="time"], select, textarea {
  width: 100%; padding: 10px 14px;
  background: var(--bg-input); border: 1px solid var(--border);
  border-radius: 8px; color: var(--text-main);
  font-family: 'Inter', system-ui, sans-serif; font-size: 14px; outline: none;
  transition: border-color 0.2s;
}
input:focus, select:focus, textarea:focus { border-color: var(--primary); }
textarea { resize: vertical; min-height: 80px; }
.form-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.color-row { display: flex; gap: 8px; flex-wrap: wrap; }
.color-swatch {
  width: 24px; height: 24px; border-radius: 50%; cursor: pointer;
  border: 2px solid transparent; transition: all 0.2s;
}
.color-swatch.selected { border-color: var(--text-main); transform: scale(1.2); }
.icon-row { display: flex; gap: 6px; flex-wrap: wrap; }
.icon-opt {
  width: 36px; height: 36px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  background: #f3f4f6; border: 1px solid var(--border);
  cursor: pointer; font-size: 18px; transition: all 0.2s;
}
.icon-opt.selected { border-color: var(--primary); background: #eff6ff; }

.submit-btn {
  width: 100%; padding: 12px; background: var(--primary);
  border: none; border-radius: 8px;
  color: white; font-size: 14px; font-weight: 600; cursor: pointer;
  margin-top: 12px; transition: background 0.2s;
}
.submit-btn:hover { background: var(--primary-hover); }

.alert { padding: 10px 14px; border-radius: 6px; font-size: 13px; margin-bottom: 20px; }
.alert-error { background: #fee2e2; border: 1px solid #fecaca; color: var(--error); }
.alert-success { background: #d1fae5; border: 1px solid #a7f3d0; color: var(--success); }

.mood-row { display: flex; gap: 8px; }
.mood-opt {
  flex: 1; padding: 10px; border-radius: 8px; text-align: center;
  background: #f3f4f6; border: 1px solid var(--border);
  cursor: pointer; font-size: 18px; transition: all 0.2s;
}
.mood-opt.selected { border-color: var(--primary); background: #eff6ff; }
.mood-label { font-size: 10px; font-weight: 600; color: var(--text-muted); margin-top: 4px; text-transform: uppercase; }

@media (max-width: 1100px) { .stats-grid { grid-template-columns: repeat(2,1fr); } .charts-grid { grid-template-columns: 1fr; } }
@media (max-width: 768px) {
  .sidebar { display: none; }
  .content { padding: 20px; }
  .topbar { padding: 14px 20px; }
}
</style>
</head>
<body>

<!-- Sidebar -->
<div class="sidebar">
  <div class="sidebar-logo">
    <div class="logo-icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
    </div>
    <div class="logo-text"><?= APP_NAME ?></div>
  </div>
  <div class="nav-section">
    <div class="nav-label">Main</div>
    <a href="dashboard.php" class="nav-item active">
       Dashboard
    </a>
    <a href="analytics.php" class="nav-item">
       Analytics
    </a>
    <a href="monthly.php" class="nav-item">
       Monthly View
    </a>
    <a href="profile.php" class="nav-item">
       Profile
    </a>
    <?php if (!isAdmin()): ?>
    <a href="donate.php" class="nav-item">
       Support Us
    </a>
    <?php endif; ?>
    <?php if (isAdmin()): ?>
    <div class="nav-label" style="margin-top:12px;">Admin</div>
    <a href="admin/index.php" class="nav-item">
       Management
    </a>
    <?php endif; ?>
  </div>
  <div class="sidebar-footer">
    <div class="user-card">
      <div class="avatar" style="background:<?= htmlspecialchars($user['avatar_color']) ?>;color:white">
        <?= strtoupper(substr($user['full_name'],0,1)) ?>
      </div>
      <div class="user-info">
        <div class="user-name"><?= htmlspecialchars($user['full_name']) ?></div>
        <div class="user-role"><?= ucfirst($user['role']) ?></div>
      </div>
      <a href="logout.php" class="logout-btn" title="Logout" onclick="return confirm('Are you sure you want to logout?');">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        <span>Logout</span>
      </a>
      
    </div>
  </div>
</div>

<!-- Main -->
<div class="main">
  <div class="topbar">
    <div class="page-title">Today's Habits</div>
    <div class="topbar-right">
      <div class="date-badge"><?= $todayFormatted ?></div>
      <button class="add-habit-btn" onclick="openModal()">+ Add Habit</button>
    </div>
  </div>
  
  <div class="content">
    <?php if ($flash): ?>
    <div class="alert alert-<?= $flash['type'] ?>" style="margin-bottom:20px"><?= htmlspecialchars($flash['message']) ?></div>
    <?php endif; ?>
    
    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card s1">
        
        <div class="stat-value"><?= $doneToday ?>/<?= $totalHabits ?></div>
        <div class="stat-label">Done Today</div>
        <div class="stat-trend"><?= $completionRate ?>% completion rate</div>
      </div>
      <div class="stat-card s2">
        
        <div class="stat-value"><?= $maxStreak ?></div>
        <div class="stat-label">Best Streak (days)</div>
        <div class="stat-trend">Keep it going!</div>
      </div>
      <div class="stat-card s3">
        
        <div class="stat-value"><?= $totalEntries ?></div>
        <div class="stat-label">Total Check-ins</div>
        <div class="stat-trend">All time</div>
      </div>
      <div class="stat-card s4">
        
        <div class="stat-value"><?= $totalHabits ?></div>
        <div class="stat-label">Active Habits</div>
        <div class="stat-trend">Tracking now</div>
      </div>
    </div>

    <!-- Habit List -->
    <div class="section-header">
      <div class="section-title">Today's Checklist</div>
      <div class="filter-tabs">
        <div class="ftab active" onclick="filterHabits('all',this)">All</div>
        <div class="ftab" onclick="filterHabits('pending',this)">Pending</div>
        <div class="ftab" onclick="filterHabits('done',this)">Done</div>
      </div>
    </div>

    <div class="habit-list" id="habitList">
      <?php if (empty($habits)): ?>
      <div class="empty-state">
        <div class="empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        </div>
        <div class="empty-title">No habits yet</div>
        <div class="empty-sub">Start building better habits today. Add your first habit to begin tracking!</div>
        <button class="empty-cta" onclick="openModal()">Add Your First Habit</button>
      </div>
      <?php else: ?>
        <?php foreach ($habits as $h): ?>
        <div class="habit-row <?= $h['today_done'] ? 'completed' : '' ?>" id="hr_<?= $h['id'] ?>" data-done="<?= $h['today_done']?1:0 ?>">
          <div class="habit-checkbox <?= $h['today_done']?'checked':'' ?>" onclick="toggleHabit(<?= $h['id'] ?>)"  >
            <?= $h['today_done'] ? '✓' : '' ?>
          </div>
          <div class="habit-icon-wrap">
            <?= htmlspecialchars($h['icon']) ?>
          </div>
          <div class="habit-info">
            <div class="habit-name" style="text-decoration:<?= $h['today_done']?'line-through':'none' ?>">
              <?= htmlspecialchars($h['name']) ?>
            </div>
            <div class="habit-meta">
              <?= htmlspecialchars($h['category']) ?> · <?= ucfirst($h['frequency']) ?>
              <?php if ($h['reminder_time']): ?> · <?= date('g:i A', strtotime($h['reminder_time'])) ?><?php endif; ?>
            </div>
            <div class="habit-dots">
              <?php foreach ($h['dots'] as $dot): ?>
              <div class="hdot" style="background:<?= $dot ? 'var(--primary)' : 'var(--border)' ?>"></div>
              <?php endforeach; ?>
            </div>
          </div>
          <div class="habit-streak">
            <span class="streak-dot"><?= $h['streak']>0?'●':'○' ?></span>
            <span><?= $h['streak'] ?> day streak</span>
          </div>
          <div class="habit-actions">
            <div class="ha-btn" onclick="openNoteModal(<?= $h['id'] ?>, '<?= htmlspecialchars($h['name'],ENT_QUOTES) ?>')" title="Add note/mood">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </div>
            <div class="ha-btn del" onclick="if(confirm('Are you sure you want to delete this habit?')) deleteHabit(<?= $h['id'] ?>)" title="Delete">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </div>
          </div>
        </div>
        <?php endforeach; ?>
      <?php endif; ?>
    </div>
    
    <!-- Charts -->
    <?php if (!empty($habits)): ?>
    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-title">30-Day Completion</div>
        <canvas id="lineChart" height="120"></canvas>
      </div>
      <div class="chart-card">
        <div class="chart-title">Today's Progress</div>
        <canvas id="donutChart" height="120"></canvas>
      </div>
    </div>

    <!-- Monthly Grid -->
    <div class="monthly-card">
      <div class="chart-title">Monthly Overview — <?= date('F Y', strtotime($today)) ?></div>
      <div style="overflow-x:auto;margin-top:8px;">
        <table class="monthly-table">
          <thead>
            <tr>
              <th>Habit</th>
              <?php for ($d=1; $d<=$daysInMonth; $d++): ?>
              <th style="text-align:center;padding:6px 3px;font-size:11px;<?= $d==$currentDay?'color:var(--accent)':'' ?>"><?= $d ?></th>
              <?php endfor; ?>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($habits as $h):
              $monthlyDone = 0;
            ?>
            <tr>
              <td style="white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis">
                <?= htmlspecialchars($h['icon']) ?> <?= htmlspecialchars($h['name']) ?>
              </td>
              <?php for ($d=1; $d<=$daysInMonth; $d++):
                $checkDate = date('Y-m') . '-' . str_pad($d, 2, '0', STR_PAD_LEFT);
                $isPast = $checkDate <= $today;
                $s = $db->prepare("SELECT id FROM habit_logs WHERE habit_id=? AND user_id=? AND log_date=? AND completed_count>0");
                $s->execute([$h['id'], $user['id'], $checkDate]);
                $done = $s->fetch();
                if ($done) $monthlyDone++;
              ?>
              <td style="text-align:center;padding:6px 3px;">
                <?php if ($isPast): ?>
                <div class="day-cell <?= $done?'day-done':'day-miss' ?>"><?= $done?'✓':'·' ?></div>
                <?php else: ?>
                <div class="day-cell day-skip" style="color:var(--border);">-</div>
                <?php endif; ?>
              </td>
              <?php endfor; ?>
              <td>
                <?php $rate = $currentDay>0?round(($monthlyDone/$currentDay)*100):0; ?>
                <div class="progress-bar-wrap">
                  <div class="progress-bar-fill" style="width:<?= $rate ?>%"></div>
                </div>
                <div style="font-size:11px;color:var(--muted);margin-top:3px;"><?= $rate ?>%</div>
              </td>
            </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </div>
    <?php endif; ?>
  </div>
</div>

<!-- Add Habit Modal -->
<div class="modal-overlay" id="addModal">
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title">New Habit</div>
      <span class="modal-close" onclick="closeModal()">×</span>
    </div>
    <div id="habitFormError" class="alert alert-error" style="display:none"></div>
    
    <div class="form-group">
      <label>Habit Name *</label>
      <input type="text" id="h_name" placeholder="e.g. Morning Run, Read 30 mins..." maxlength="100">
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="h_desc" placeholder="What does this habit involve?" rows="2"></textarea>
    </div>
    <div class="form-row2">
      <div class="form-group">
      <label>Category</label>
      <select id="h_cat">
        <?php foreach ($categories as $cat): ?>
        <option value="<?= htmlspecialchars($cat['name']) ?>"><?= htmlspecialchars($cat['icon']) ?> <?= htmlspecialchars($cat['name']) ?></option>
        <?php endforeach; ?>
      </select>
    </div>
      <div class="form-group">
        <label>Frequency</label>
        <select id="h_freq">
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
    </div>
    <div class="form-row2">
      <div class="form-group">
        <label>Reminder Time (optional)</label>
        <input type="time" id="h_reminder">
      </div>
      <div class="form-group">
        <label>Daily Target</label>
        <input type="text" id="h_target" value="1" placeholder="1">
      </div>
    </div>
    <div class="form-group">
      <label>Icon</label>
      <div class="icon-row" id="iconRow">
        <?php foreach (['🏃','📚','💧','🧘','💪','🥗','😴','✍️','🎯','💊','🧹','🎸','💻','☀️','🌿'] as $ic): ?>
        <div class="icon-opt <?= $ic==='✅'?'selected':'' ?>" onclick="selectIcon(this,'<?= $ic ?>')"><?= $ic ?></div>
        <?php endforeach; ?>
      </div>
      <input type="hidden" id="h_icon" value="🏃">
    </div>
    <div class="form-group">
      <label>Color</label>
      <div class="color-row" id="colorRow">
        <?php foreach (['#6366f1','#ec4899','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#14b8a6','#f97316','#84cc16'] as $c): ?>
        <div class="color-swatch <?= $c==='#6366f1'?'selected':'' ?>" style="background:<?= $c ?>" onclick="selectColor(this,'<?= $c ?>')"></div>
        <?php endforeach; ?>
      </div>
      <input type="hidden" id="h_color" value="#6366f1">
    </div>
    <button class="submit-btn" onclick="addHabit()">Add Habit</button>
  </div>
</div>

<!-- Note Modal -->
<div class="modal-overlay" id="noteModal">
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title">Log Note</div>
      <span class="modal-close" onclick="closeNoteModal()">×</span>
    </div>
    <div class="form-group">
      <label>How are you feeling?</label>
      <div class="mood-row">
        <?php foreach([['great','😄'],['good','😊'],['okay','😐'],['bad','😟']] as [$m,$e]): ?>
        <div class="mood-opt" onclick="selectMood(this,'<?=$m?>')" data-mood="<?=$m?>">
          <?=$e?><div class="mood-label"><?=ucfirst($m)?></div>
        </div>
        <?php endforeach; ?>
      </div>
      <input type="hidden" id="n_mood">
    </div>
    <div class="form-group">
      <label>Notes</label>
      <textarea id="n_notes" placeholder="How did this habit go today?"></textarea>
    </div>
    <input type="hidden" id="n_habit_id">
    <button class="submit-btn" onclick="saveNote()">Save Note</button>
  </div>
</div>

<script>
const CSRF = '<?= $csrf ?>';

function openModal() { document.getElementById('addModal').classList.add('open'); }
function closeModal() { document.getElementById('addModal').classList.remove('open'); }
function openNoteModal(id, name) {
  document.getElementById('n_habit_id').value = id;
  document.querySelector('#noteModal .modal-title').textContent = name;
  document.getElementById('noteModal').classList.add('open');
}
function closeNoteModal() { document.getElementById('noteModal').classList.remove('open'); }

// Close modals on backdrop click
document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if(e.target===o) o.classList.remove('open'); });
});

function selectIcon(el, icon) {
  document.querySelectorAll('.icon-opt').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('h_icon').value = icon;
}
function selectColor(el, color) {
  document.querySelectorAll('.color-swatch').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('h_color').value = color;
}
function selectMood(el, mood) {
  document.querySelectorAll('.mood-opt').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('n_mood').value = mood;
}

async function apiCall(data) {
  try {
    const fd = new FormData();
    fd.append('ajax', '1');
    fd.append('csrf_token', CSRF);
    Object.entries(data).forEach(([k,v]) => fd.append(k,v));
    const r = await fetch(window.location.pathname, { method:'POST', body: fd });
    if (!r.ok) throw new Error('Network response was not ok');
    return await r.json();
  } catch (e) {
    console.error('API Error:', e);
    return { success: false, error: 'Connection lost or server error.' };
  }
}

function updateStats(stats) {
  if (!stats) return;
  const s1 = document.querySelector('.s1');
  if (s1) {
    s1.querySelector('.stat-value').textContent = `${stats.doneToday}/${stats.totalHabits}`;
    s1.querySelector('.stat-trend').textContent = `${stats.completionRate}% completion rate`;
  }
  const s3 = document.querySelector('.s3 .stat-value');
  if (s3 && stats.totalEntries !== undefined) s3.textContent = stats.totalEntries;
  
  const s4 = document.querySelector('.s4 .stat-value');
  if (s4) s4.textContent = stats.totalHabits;

  updateDonut();
}

async function toggleHabit(id) {
  const res = await apiCall({ action: 'toggle', habit_id: id });
  if (res.success) {
    location.reload();
  }
}

async function addHabit() {
  const name = document.getElementById('h_name').value.trim();
  const errDiv = document.getElementById('habitFormError');
  if (!name) { errDiv.textContent = 'Please enter a habit name.'; errDiv.style.display='block'; return; }
  errDiv.style.display = 'none';
  
  const res = await apiCall({
    action: 'add_habit',
    name, description: document.getElementById('h_desc').value,
    category: document.getElementById('h_cat').value,
    frequency: document.getElementById('h_freq').value,
    icon: document.getElementById('h_icon').value,
    color: document.getElementById('h_color').value,
    target_count: document.getElementById('h_target').value || 1,
    reminder_time: document.getElementById('h_reminder').value,
  });
  if (res.success) { 
    location.reload();
  }
  else { errDiv.textContent = res.error || 'Failed to add habit.'; errDiv.style.display='block'; }
}

async function deleteHabit(id) {
  const res = await apiCall({ action: 'delete_habit', habit_id: id });
  if (res.success) { 
    location.reload();
  }
}

async function saveNote() {
  const res = await apiCall({
    action: 'log_note',
    habit_id: document.getElementById('n_habit_id').value,
    mood: document.getElementById('n_mood').value,
    notes: document.getElementById('n_notes').value,
  });
  if (res.success) { closeNoteModal(); }
}

function filterHabits(type, el) {
  document.querySelectorAll('.ftab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.habit-row').forEach(row => {
    const done = row.dataset.done === '1';
    if (type==='all') row.style.display='flex';
    else if (type==='done') row.style.display = done?'flex':'none';
    else row.style.display = !done?'flex':'none';
  });
}

// Charts
function updateDonut() {
  const rows = document.querySelectorAll('.habit-row');
  let done=0, total=0;
  rows.forEach(r => { total++; if(r.dataset.done==='1') done++; });
  if (donutChart && donutChart.data && donutChart.data.datasets) {
    donutChart.data.datasets[0].data = [done, total-done];
    donutChart.update();
  }
}

let lineChart, donutChart;
async function initCharts() {
  const res = await apiCall({ action: 'chart_data' });
  if (!res.success) return;
  
  // Line chart
  const lc = document.getElementById('lineChart');
  if (lc) {
    if (lineChart) lineChart.destroy();
    lineChart = new Chart(lc, {
      type: 'line',
      data: {
        labels: res.labels,
        datasets: [{
          label: 'Habits Completed',
          data: res.data,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37,99,235,0.05)',
          fill: true, tension: 0.4,
          pointBackgroundColor: '#2563eb',
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#6b7280', maxTicksLimit: 8, font: {size:11, weight:'500'} }, grid: { display: false } },
          y: { ticks: { color: '#6b7280', stepSize: 1, font: {size:11, weight:'500'} }, grid: { color: '#f3f4f6' }, beginAtZero: true }
        }
      }
    });
  }
  
  // Donut chart
  const dc = document.getElementById('donutChart');
  if (dc) {
    if (donutChart) donutChart.destroy();
    const rows = document.querySelectorAll('.habit-row');
    let done=0, total=0;
    rows.forEach(r => { total++; if(r.dataset.done==='1') done++; });
    
    donutChart = new Chart(dc, {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'Remaining'],
        datasets: [{
          data: [done, total-done],
          backgroundColor: ['#10b981','#f3f4f6'],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        cutout: '75%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#374151', font: {size:12, weight:'600'}, padding:16, usePointStyle: true } }
        }
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
    <?php if (!empty($habits)): ?>
    initCharts();
    <?php endif; ?>
});
</script>
</body>
</html>
