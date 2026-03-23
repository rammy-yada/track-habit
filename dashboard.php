<?php require_once 'includes/config.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dashboard — HabitFlow</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
<?= getGlobalThemeStyles() ?>
:root { --sidebar-w: 240px; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', system-ui, sans-serif; background: var(--bg-main); color: var(--text-main); min-height: 100vh; display: flex; }

/* Toast */
#toast-container { position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 8px; pointer-events: none; }
.toast { background: #1f2937; color: white; padding: 11px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 9px; pointer-events: all; animation: toastIn 0.25s ease; max-width: 300px; }
.toast.success { background: #064e3b; border-left: 3px solid #10b981; }
.toast.error { background: #7f1d1d; border-left: 3px solid #ef4444; }
.toast.info { background: #1e3a8a; border-left: 3px solid #60a5fa; }
@keyframes toastIn { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:none; } }
@keyframes toastOut { from { opacity:1; } to { opacity:0; transform:translateX(16px); } }

/* Sidebar */
.sidebar { width: var(--sidebar-w); min-width: var(--sidebar-w); background: var(--bg-card); border-right: 1px solid var(--border); display: flex; flex-direction: column; height: 100vh; position: sticky; top: 0; }
.sidebar-logo { padding: 22px 20px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--border); }
.logo-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: #eff6ff; border-radius: 8px; flex-shrink: 0; color: var(--primary); }
.logo-text { font-size: 17px; font-weight: 700; color: var(--text-main); }
.nav-section { padding: 16px 12px 8px; }
.nav-label { font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; padding: 0 8px; margin-bottom: 6px; }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 7px; color: var(--text-muted); font-size: 13.5px; font-weight: 500; text-decoration: none; transition: all 0.15s; margin-bottom: 2px; }
.nav-item:hover { background: #f3f4f6; color: var(--text-main); }
.nav-item.active { background: #eff6ff; color: var(--primary); font-weight: 600; }
.sidebar-footer { margin-top: auto; padding: 16px 12px; border-top: 1px solid var(--border); }
.user-card { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 9px; background: #f9fafb; }
.avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
.user-info { flex: 1; min-width: 0; }
.user-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-role { font-size: 11px; color: var(--text-muted); }
.logout-btn { color: var(--text-muted); cursor: pointer; text-decoration: none; padding: 5px; display: flex; align-items: center; border-radius: 5px; transition: all 0.15s; }
.logout-btn:hover { color: var(--error); background: #fee2e2; }

/* Main */
.main { flex: 1; overflow-y: auto; background: var(--bg-main); }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 18px 28px; border-bottom: 1px solid var(--border); background: var(--bg-main); position: sticky; top: 0; z-index: 10; }
.page-title { font-size: 18px; font-weight: 700; }
.topbar-right { display: flex; align-items: center; gap: 10px; }
.date-badge { background: #f3f4f6; border: 1px solid var(--border); border-radius: 7px; padding: 5px 12px; font-size: 12.5px; color: var(--text-muted); font-weight: 500; }
.add-habit-btn { background: var(--primary); border: none; color: white; padding: 8px 16px; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s; display: flex; align-items: center; gap: 6px; font-family: 'Inter', sans-serif; }
.add-habit-btn:hover { background: var(--primary-hover); }

/* Content */
.content { padding: 24px 28px; }

/* Stats */
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
.stat-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.stat-icon { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
.stat-value { font-size: 22px; font-weight: 700; color: var(--text-main); line-height: 1; }
.stat-label { font-size: 11px; font-weight: 600; color: var(--text-muted); margin-top: 5px; text-transform: uppercase; letter-spacing: 0.4px; }
.stat-sub { font-size: 11.5px; margin-top: 6px; color: var(--primary); font-weight: 500; }

/* Habit list */
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.section-title { font-size: 15px; font-weight: 700; }
.filter-tabs { display: flex; gap: 4px; }
.ftab { padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #f3f4f6; border: 1px solid var(--border); color: var(--text-muted); cursor: pointer; transition: all 0.15s; }
.ftab.active { background: var(--primary); border-color: var(--primary); color: white; }

.habit-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
.habit-row { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 14px 18px; display: flex; align-items: center; gap: 14px; transition: all 0.2s; }
.habit-row:hover { border-color: #cbd5e1; box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
.habit-row.completed { background: #f0fdf9; border-color: #a7f3d0; }
.habit-row.completing { animation: completePulse 0.35s ease; }
@keyframes completePulse { 0%{transform:scale(1)} 45%{transform:scale(1.008)} 100%{transform:scale(1)} }

.habit-checkbox { width: 24px; height: 24px; border-radius: 6px; flex-shrink: 0; border: 2px solid #d1d5db; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; background: white; }
.habit-checkbox:hover { border-color: var(--primary); background: #eff6ff; }
.habit-checkbox.checked { border-color: var(--success); background: var(--success); }
.habit-checkbox svg { display: none; }
.habit-checkbox.checked svg { display: block; }

.habit-color-bar { width: 3px; height: 38px; border-radius: 2px; flex-shrink: 0; }
.habit-info { flex: 1; min-width: 0; }
.habit-name { font-size: 14px; font-weight: 600; transition: all 0.2s; }
.habit-name.done { text-decoration: line-through; color: var(--text-muted); }
.habit-meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.habit-dots { display: flex; gap: 3px; margin-top: 6px; }
.hdot { width: 6px; height: 6px; border-radius: 2px; }

.habit-right { display: flex; align-items: center; gap: 14px; }
.done-badge { display: none; align-items: center; gap: 5px; background: #d1fae5; color: #065f46; border-radius: 20px; padding: 3px 10px; font-size: 11.5px; font-weight: 600; }
.habit-row.completed .done-badge { display: flex; }
.streak-badge { font-size: 12px; font-weight: 600; color: var(--text-muted); display: flex; align-items: center; gap: 4px; white-space: nowrap; }
.streak-badge.active { color: #d97706; }
.habit-actions { display: flex; gap: 4px; }
.ha-btn { width: 30px; height: 30px; border-radius: 6px; background: transparent; border: 1px solid transparent; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
.ha-btn:hover { border-color: var(--border); background: #f3f4f6; color: var(--text-main); }
.ha-btn.del:hover { border-color: #fecaca; color: var(--error); background: #fee2e2; }

.empty-state { text-align: center; padding: 56px 20px; background: #fafafa; border: 1.5px dashed var(--border); border-radius: 10px; }
.empty-icon { width: 50px; height: 50px; background: #eff6ff; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: var(--primary); }
.empty-title { font-size: 17px; font-weight: 700; margin-bottom: 8px; }
.empty-sub { color: var(--text-muted); font-size: 13.5px; margin-bottom: 22px; max-width: 320px; margin-left: auto; margin-right: auto; line-height: 1.5; }
.empty-cta { background: var(--primary); border: none; color: white; padding: 10px 22px; border-radius: 7px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; }

/* Charts */
.charts-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 18px; margin-bottom: 24px; }
.chart-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.chart-title { font-size: 13.5px; font-weight: 700; margin-bottom: 18px; }

/* Monthly */
.monthly-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 20px; overflow-x: auto; margin-bottom: 24px; }
.monthly-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.monthly-table th { text-align: left; padding: 7px; color: var(--text-muted); font-weight: 600; border-bottom: 1px solid var(--border); text-transform: uppercase; letter-spacing: 0.4px; }
.monthly-table td { padding: 9px 7px; border-bottom: 1px solid #f3f4f6; }
.monthly-table tr:last-child td { border-bottom: none; }
.day-cell { width: 18px; height: 18px; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; font-size: 9px; }
.day-done { background: #d1fae5; color: #059669; font-weight: 700; }
.day-miss { background: #f3f4f6; color: #d1d5db; }
.day-skip { color: #e5e7eb; }
.progress-bar-wrap { background: #f3f4f6; border-radius: 4px; height: 5px; width: 56px; overflow: hidden; }
.progress-bar-fill { height: 100%; border-radius: 4px; background: var(--primary); }

/* Modals */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); backdrop-filter: blur(3px); z-index: 100; display: none; align-items: center; justify-content: center; padding: 20px; }
.modal-overlay.open { display: flex; }
.modal { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 26px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.15); animation: modalIn 0.2s ease; }
@keyframes modalIn { from { opacity:0; transform:translateY(10px) scale(0.98); } to { opacity:1; transform:none; } }
.modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
.modal-title { font-size: 17px; font-weight: 700; }
.modal-close { cursor: pointer; color: var(--text-muted); font-size: 22px; line-height: 1; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 5px; transition: all 0.15s; }
.modal-close:hover { background: #f3f4f6; color: var(--text-main); }

.form-group { margin-bottom: 15px; }
label { display: block; font-size: 12px; font-weight: 600; color: var(--text-main); margin-bottom: 5px; }
input[type="text"], input[type="number"], input[type="time"], select, textarea { width: 100%; padding: 9px 13px; background: var(--bg-input); border: 1.5px solid var(--border); border-radius: 7px; color: var(--text-main); font-family: 'Inter', system-ui, sans-serif; font-size: 13.5px; outline: none; transition: border-color 0.15s; }
input:focus, select:focus, textarea:focus { border-color: var(--primary); }
input.field-invalid { border-color: var(--error) !important; }
.field-err { color: var(--error); font-size: 11px; margin-top: 3px; display: none; }
textarea { resize: vertical; min-height: 70px; }
.form-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.color-row { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 4px; }
.color-swatch { width: 22px; height: 22px; border-radius: 50%; cursor: pointer; border: 2.5px solid transparent; transition: all 0.15s; }
.color-swatch.selected { border-color: #374151; transform: scale(1.2); }
.icon-row { display: flex; gap: 5px; flex-wrap: wrap; }
.icon-opt { width: 34px; height: 34px; border-radius: 7px; display: flex; align-items: center; justify-content: center; background: #f3f4f6; border: 1.5px solid var(--border); cursor: pointer; font-size: 17px; transition: all 0.15s; }
.icon-opt.selected { border-color: var(--primary); background: #eff6ff; }
.submit-btn { width: 100%; padding: 11px; background: var(--primary); border: none; border-radius: 8px; color: white; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 10px; transition: background 0.15s; font-family: 'Inter', sans-serif; }
.submit-btn:hover { background: var(--primary-hover); }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.alert { padding: 10px 14px; border-radius: 7px; font-size: 13px; margin-bottom: 16px; }
.alert-error { background: #fee2e2; border: 1px solid #fecaca; color: var(--error); }
.alert-success { background: #d1fae5; border: 1px solid #a7f3d0; color: var(--success); }

/* Confirm dialog */
.confirm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 200; display: none; align-items: center; justify-content: center; }
.confirm-overlay.open { display: flex; }
.confirm-box { background: var(--bg-card); border-radius: 12px; padding: 28px; max-width: 380px; width: 90%; box-shadow: 0 20px 40px rgba(0,0,0,0.15); text-align: center; animation: modalIn 0.2s ease; }
.confirm-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
.confirm-title { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
.confirm-msg { font-size: 13.5px; color: var(--text-muted); margin-bottom: 22px; line-height: 1.55; }
.confirm-btns { display: flex; gap: 10px; justify-content: center; }
.btn-cancel { padding: 9px 20px; border-radius: 7px; border: 1.5px solid var(--border); background: white; font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; }
.btn-cancel:hover { background: #f3f4f6; }
.btn-confirm { padding: 9px 20px; border-radius: 7px; border: none; font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: opacity 0.15s; }
.btn-confirm:hover { opacity: 0.9; }

.mood-row { display: flex; gap: 8px; }
.mood-opt { flex: 1; padding: 9px 5px; border-radius: 7px; text-align: center; background: #f3f4f6; border: 1.5px solid var(--border); cursor: pointer; transition: all 0.15s; }
.mood-opt:hover { border-color: #cbd5e1; }
.mood-opt.selected { border-color: var(--primary); background: #eff6ff; }
.mood-emoji { font-size: 20px; }
.mood-label { font-size: 10px; font-weight: 600; color: var(--text-muted); margin-top: 3px; text-transform: uppercase; }

@media (max-width: 1100px) { .stats-grid { grid-template-columns: repeat(2,1fr); } .charts-grid { grid-template-columns: 1fr; } }
@media (max-width: 768px) { .sidebar { display: none; } .content { padding: 16px; } .topbar { padding: 14px 16px; } }
</style>
</head>
<body>
<?php
require_once 'includes/config.php';
requireLogin();
$user = currentUser();
$db = getDB();
$today = getUserDate($user['timezone'] ?? 'UTC');
$todayFormatted = date('D, M j', strtotime($today));

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['ajax'])) {
    header('Content-Type: application/json');
    if (!verifyCSRF($_POST['csrf_token'] ?? '')) { echo json_encode(['success' => false, 'error' => 'Invalid request']); exit(); }
    $action = $_POST['action'] ?? '';

    if ($action === 'toggle') {
        $habitId = (int)$_POST['habit_id'];
        $stmt = $db->prepare("SELECT id FROM habits WHERE id=? AND user_id=?");
        $stmt->execute([$habitId, $user['id']]);
        if (!$stmt->fetch()) { echo json_encode(['success'=>false,'error'=>'Not found']); exit(); }
        $stmt = $db->prepare("SELECT id FROM habit_logs WHERE habit_id=? AND user_id=? AND log_date=?");
        $stmt->execute([$habitId, $user['id'], $today]);
        $log = $stmt->fetch();
        if ($log) { $db->prepare("DELETE FROM habit_logs WHERE id=?")->execute([$log['id']]); $status = 'unchecked'; }
        else { $stmt = $db->prepare("INSERT INTO habit_logs (habit_id,user_id,log_date,completed_count) VALUES (?,?,?,1) ON DUPLICATE KEY UPDATE completed_count=1"); $stmt->execute([$habitId, $user['id'], $today]); $status = 'checked'; }
        $stmt = $db->prepare("SELECT COUNT(*) FROM habit_logs WHERE user_id=? AND log_date=? AND completed_count>0"); $stmt->execute([$user['id'], $today]); $doneToday = $stmt->fetchColumn();
        $stmt = $db->prepare("SELECT COUNT(*) FROM habits WHERE user_id=? AND is_active=1"); $stmt->execute([$user['id']]); $totalHabits = $stmt->fetchColumn();
        $stmt = $db->prepare("SELECT COUNT(*) FROM habit_logs WHERE user_id=? AND completed_count>0"); $stmt->execute([$user['id']]); $totalEntries = $stmt->fetchColumn();
        echo json_encode(['success'=>true,'status'=>$status,'stats'=>['doneToday'=>$doneToday,'totalHabits'=>$totalHabits,'completionRate'=>$totalHabits>0?round(($doneToday/$totalHabits)*100):0,'totalEntries'=>$totalEntries]]); exit();
    }

    if ($action === 'add_habit') {
        $name = sanitize($_POST['name'] ?? ''); $desc = sanitize($_POST['description'] ?? ''); $category = sanitize($_POST['category'] ?? 'General'); $icon = sanitize($_POST['icon'] ?? ''); $color = sanitize($_POST['color'] ?? '#6366f1'); $freq = sanitize($_POST['frequency'] ?? 'daily'); $target = max(1,(int)($_POST['target_count'] ?? 1)); $reminder = sanitize($_POST['reminder_time'] ?? '');
        if (empty($name)) { echo json_encode(['success'=>false,'error'=>'Habit name is required.']); exit(); }
        if (strlen($name) > 100) { echo json_encode(['success'=>false,'error'=>'Name too long (max 100 chars).']); exit(); }
        $cnt = $db->prepare("SELECT COUNT(*) FROM habits WHERE user_id=? AND is_active=1"); $cnt->execute([$user['id']]);
        if ($cnt->fetchColumn() >= 50) { echo json_encode(['success'=>false,'error'=>'Maximum 50 habits allowed.']); exit(); }
        $stmt = $db->prepare("INSERT INTO habits (user_id,name,description,category,icon,color,frequency,target_count,reminder_time) VALUES (?,?,?,?,?,?,?,?,?)"); $stmt->execute([$user['id'],$name,$desc,$category,$icon,$color,$freq,$target,$reminder?:null]); $newId = $db->lastInsertId();
        $stmt = $db->prepare("SELECT COUNT(*) FROM habit_logs WHERE user_id=? AND log_date=? AND completed_count>0"); $stmt->execute([$user['id'], $today]); $doneToday = $stmt->fetchColumn();
        $stmt = $db->prepare("SELECT COUNT(*) FROM habits WHERE user_id=? AND is_active=1"); $stmt->execute([$user['id']]); $totalHabits = $stmt->fetchColumn();
        echo json_encode(['success'=>true,'id'=>$newId,'habit'=>['id'=>$newId,'name'=>$name,'icon'=>$icon,'category'=>$category,'frequency'=>$freq,'reminder_time'=>$reminder?date('g:i A',strtotime($reminder)):null,'color'=>$color],'stats'=>['doneToday'=>$doneToday,'totalHabits'=>$totalHabits,'completionRate'=>$totalHabits>0?round(($doneToday/$totalHabits)*100):0]]); exit();
    }

    if ($action === 'delete_habit') {
        $habitId = (int)$_POST['habit_id']; $db->prepare("UPDATE habits SET is_active=0 WHERE id=? AND user_id=?")->execute([$habitId,$user['id']]);
        $stmt = $db->prepare("SELECT COUNT(*) FROM habit_logs WHERE user_id=? AND log_date=? AND completed_count>0"); $stmt->execute([$user['id'], $today]); $doneToday = $stmt->fetchColumn();
        $stmt = $db->prepare("SELECT COUNT(*) FROM habits WHERE user_id=? AND is_active=1"); $stmt->execute([$user['id']]); $totalHabits = $stmt->fetchColumn();
        $stmt = $db->prepare("SELECT COUNT(*) FROM habit_logs WHERE user_id=? AND completed_count>0"); $stmt->execute([$user['id']]); $totalEntries = $stmt->fetchColumn();
        echo json_encode(['success'=>true,'stats'=>['doneToday'=>$doneToday,'totalHabits'=>$totalHabits,'completionRate'=>$totalHabits>0?round(($doneToday/$totalHabits)*100):0,'totalEntries'=>$totalEntries]]); exit();
    }

    if ($action === 'chart_data') {
        $days = 30; $startDate = date('Y-m-d', strtotime("-$days days", strtotime($today)));
        $stmt = $db->prepare("SELECT log_date, COUNT(DISTINCT habit_id) as done FROM habit_logs WHERE user_id=? AND log_date >= ? AND log_date <= ? GROUP BY log_date ORDER BY log_date ASC"); $stmt->execute([$user['id'], $startDate, $today]); $rows = $stmt->fetchAll();
        $data = []; $labels = [];
        for ($i=$days; $i>=0; $i--) { $d = date('Y-m-d', strtotime("-$i days", strtotime($today))); $labels[] = date('M j', strtotime($d)); $found = array_values(array_filter($rows, fn($r) => $r['log_date']===$d)); $data[] = $found ? (int)$found[0]['done'] : 0; }
        echo json_encode(['success'=>true,'labels'=>$labels,'data'=>$data]); exit();
    }

    if ($action === 'log_note') {
        $habitId = (int)$_POST['habit_id']; $mood = sanitize($_POST['mood'] ?? ''); $notes = sanitize($_POST['notes'] ?? '');
        $stmt = $db->prepare("INSERT INTO habit_logs (habit_id,user_id,log_date,completed_count,mood,notes) VALUES (?,?,?,1,?,?) ON DUPLICATE KEY UPDATE mood=VALUES(mood),notes=VALUES(notes)"); $stmt->execute([$habitId,$user['id'],$today,$mood?:null,$notes]);
        echo json_encode(['success'=>true]); exit();
    }

    echo json_encode(['success'=>false,'error'=>'Unknown action']); exit();
}

$stmt = $db->prepare("SELECT h.*, (SELECT completed_count FROM habit_logs WHERE habit_id=h.id AND user_id=h.user_id AND log_date=?) as today_done, (SELECT COUNT(*) FROM habit_logs WHERE habit_id=h.id AND user_id=h.user_id) as total_done FROM habits h WHERE h.user_id=? AND h.is_active=1 ORDER BY h.created_at ASC");
$stmt->execute([$today, $user['id']]); $habits = $stmt->fetchAll();

foreach ($habits as &$habit) {
    $streak = 0; $checkDate = $today;
    for ($i=0; $i<365; $i++) { $s = $db->prepare("SELECT id FROM habit_logs WHERE habit_id=? AND user_id=? AND log_date=? AND completed_count>0"); $s->execute([$habit['id'], $user['id'], $checkDate]); if ($s->fetch()) { $streak++; $checkDate = date('Y-m-d', strtotime('-1 day', strtotime($checkDate))); } else break; }
    $habit['streak'] = $streak;
    $dots = [];
    for ($i=6; $i>=0; $i--) { $d = date('Y-m-d', strtotime("-$i days", strtotime($today))); $s = $db->prepare("SELECT id FROM habit_logs WHERE habit_id=? AND user_id=? AND log_date=?"); $s->execute([$habit['id'], $user['id'], $d]); $dots[] = $s->fetch() ? 1 : 0; }
    $habit['dots'] = $dots;
}
unset($habit);

$totalHabits = count($habits);
$doneToday = count(array_filter($habits, fn($h) => $h['today_done']));
$completionRate = $totalHabits > 0 ? round(($doneToday / $totalHabits) * 100) : 0;
$maxStreak = $habits ? max(array_column($habits, 'streak')) : 0;
$totalEntries = $habits ? array_sum(array_column($habits, 'total_done')) : 0;
$daysInMonth = date('t', strtotime($today));
$currentDay = (int)date('j', strtotime($today));
$csrf = generateCSRF(); $flash = getFlash();
?>

<div id="toast-container"></div>

<div class="sidebar">
  <div class="sidebar-logo">
    <div class="logo-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg></div>
    <div class="logo-text">HabitFlow</div>
  </div>
  <div class="nav-section">
    <div class="nav-label">Navigation</div>
    <a href="dashboard.php" class="nav-item active"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg> Dashboard</a>
    <a href="analytics.php" class="nav-item"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg> Analytics</a>
    <a href="monthly.php" class="nav-item"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> Monthly View</a>
    <a href="profile.php" class="nav-item"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> Profile</a>
    <?php if (isAdmin()): ?>
    <div class="nav-label" style="margin-top:12px;">Admin</div>
    <a href="admin/index.php" class="nav-item"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Management</a>
    <?php endif; ?>
  </div>
  <div class="sidebar-footer">
    <div class="user-card">
      <div class="avatar" style="background:<?= htmlspecialchars($user['avatar_color']) ?>;color:white"><?= strtoupper(substr($user['full_name'],0,1)) ?></div>
      <div class="user-info">
        <div class="user-name"><?= htmlspecialchars($user['full_name']) ?></div>
        <div class="user-role"><?= ucfirst($user['role']) ?></div>
      </div>
      <a href="logout.php" class="logout-btn" title="Sign out" onclick="return confirm('Sign out of HabitFlow?');"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></a>
    </div>
  </div>
</div>

<div class="main">
  <div class="topbar">
    <div class="page-title">Today's Habits</div>
    <div class="topbar-right">
      <div class="date-badge"><?= $todayFormatted ?></div>
      <button class="add-habit-btn" onclick="openModal()"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Add Habit</button>
    </div>
  </div>

  <div class="content">
    <?php if ($flash): ?><div class="alert alert-<?= $flash['type'] ?>" style="margin-bottom:18px"><?= htmlspecialchars($flash['message']) ?></div><?php endif; ?>

    <div class="stats-grid">
      <div class="stat-card s1">
        <div class="stat-icon" style="background:#eff6ff;color:var(--primary)"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
        <div class="stat-value"><?= $doneToday ?>/<?= $totalHabits ?></div>
        <div class="stat-label">Done Today</div>
        <div class="stat-sub"><?= $completionRate ?>% completion rate</div>
      </div>
      <div class="stat-card s2">
        <div class="stat-icon" style="background:#fff7ed;color:#d97706"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg></div>
        <div class="stat-value"><?= $maxStreak ?></div>
        <div class="stat-label">Best Streak (days)</div>
        <div class="stat-sub">Keep it going</div>
      </div>
      <div class="stat-card s3">
        <div class="stat-icon" style="background:#f0fdf4;color:var(--success)"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div>
        <div class="stat-value"><?= $totalEntries ?></div>
        <div class="stat-label">Total Check-ins</div>
        <div class="stat-sub">All time</div>
      </div>
      <div class="stat-card s4">
        <div class="stat-icon" style="background:#fdf4ff;color:#9333ea"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>
        <div class="stat-value"><?= $totalHabits ?></div>
        <div class="stat-label">Active Habits</div>
        <div class="stat-sub">Tracking now</div>
      </div>
    </div>

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
      <div class="empty-state" id="emptyState">
        <div class="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg></div>
        <div class="empty-title">No habits yet</div>
        <div class="empty-sub">Start building better habits today. Add your first habit to begin tracking your progress.</div>
        <button class="empty-cta" onclick="openModal()">Add Your First Habit</button>
      </div>
      <?php else: ?>
        <?php foreach ($habits as $h): ?>
        <div class="habit-row <?= $h['today_done'] ? 'completed' : '' ?>" id="hr_<?= $h['id'] ?>" data-done="<?= $h['today_done']?1:0 ?>">
          <div class="habit-checkbox <?= $h['today_done']?'checked':'' ?>" onclick="handleToggle(<?= $h['id'] ?>)" title="<?= $h['today_done'] ? 'Unmark habit' : 'Mark as done' ?>">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <div class="habit-color-bar" style="background:<?= htmlspecialchars($h['color']) ?>"></div>
          <div class="habit-info">
            <div class="habit-name <?= $h['today_done']?'done':'' ?>"><?= htmlspecialchars($h['name']) ?></div>
            <div class="habit-meta"><?= htmlspecialchars($h['category']) ?> &middot; <?= ucfirst($h['frequency']) ?><?php if ($h['reminder_time']): ?> &middot; <?= date('g:i A', strtotime($h['reminder_time'])) ?><?php endif; ?></div>
            <div class="habit-dots"><?php foreach ($h['dots'] as $dot): ?><div class="hdot" style="background:<?= $dot ? htmlspecialchars($h['color']) : 'var(--border)' ?>"></div><?php endforeach; ?></div>
          </div>
          <div class="habit-right">
            <div class="done-badge"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Done</div>
            <div class="streak-badge <?= $h['streak']>0?'active':'' ?>"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg> <?= $h['streak'] ?> day<?= $h['streak']===1?'':'s' ?></div>
            <div class="habit-actions">
              <div class="ha-btn" onclick="openNoteModal(<?= $h['id'] ?>, '<?= htmlspecialchars($h['name'],ENT_QUOTES) ?>')" title="Add note"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></div>
              <div class="ha-btn del" onclick="confirmDelete(<?= $h['id'] ?>, '<?= htmlspecialchars($h['name'],ENT_QUOTES) ?>')" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></div>
            </div>
          </div>
        </div>
        <?php endforeach; ?>
      <?php endif; ?>
    </div>

    <?php if (!empty($habits)): ?>
    <div class="charts-grid">
      <div class="chart-card"><div class="chart-title">30-Day Completion</div><canvas id="lineChart" height="110"></canvas></div>
      <div class="chart-card"><div class="chart-title">Today's Progress</div><canvas id="donutChart" height="110"></canvas></div>
    </div>
    <div class="monthly-card">
      <div class="chart-title">Monthly Overview &mdash; <?= date('F Y', strtotime($today)) ?></div>
      <div style="overflow-x:auto;margin-top:8px;">
        <table class="monthly-table">
          <thead><tr><th>Habit</th><?php for($d=1;$d<=$daysInMonth;$d++): ?><th style="text-align:center;padding:5px 2px;font-size:10px;<?=$d==$currentDay?'color:var(--primary)':''?>"><?=$d?></th><?php endfor; ?><th>Rate</th></tr></thead>
          <tbody>
            <?php foreach($habits as $h): $monthlyDone=0; ?>
            <tr>
              <td style="white-space:nowrap;max-width:130px;overflow:hidden;text-overflow:ellipsis;font-size:12.5px;font-weight:500;"><?php if($h['icon']): ?><?=htmlspecialchars($h['icon'])?> <?php endif; ?><?=htmlspecialchars($h['name'])?></td>
              <?php for($d=1;$d<=$daysInMonth;$d++): $checkDate=date('Y-m').'-'.str_pad($d,2,'0',STR_PAD_LEFT); $isPast=$checkDate<=$today; $s=$db->prepare("SELECT id FROM habit_logs WHERE habit_id=? AND user_id=? AND log_date=? AND completed_count>0"); $s->execute([$h['id'],$user['id'],$checkDate]); $done=$s->fetch(); if($done) $monthlyDone++; ?>
              <td style="text-align:center;padding:4px 2px;"><?php if($isPast): ?><div class="day-cell <?=$done?'day-done':'day-miss'?>"><?=$done?'&#10003;':'&middot;'?></div><?php else: ?><div class="day-cell day-skip">-</div><?php endif; ?></td>
              <?php endfor; ?>
              <td><?php $rate=$currentDay>0?round(($monthlyDone/$currentDay)*100):0; ?><div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:<?=$rate?>%"></div></div><div style="font-size:10.5px;color:var(--text-muted);margin-top:3px;"><?=$rate?>%</div></td>
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
      <span class="modal-close" onclick="closeModal()" title="Close">&times;</span>
    </div>
    <div id="habitFormError" class="alert alert-error" style="display:none"></div>
    <div class="form-group">
      <label>Habit Name <span style="color:var(--error)">*</span></label>
      <input type="text" id="h_name" placeholder="e.g. Morning run, Read 30 mins" maxlength="100" oninput="clearFieldErr('h_name')">
      <div class="field-err" id="h_name_err">Please enter a habit name.</div>
    </div>
    <div class="form-group">
      <label>Description <span style="color:var(--text-muted);font-weight:400">(optional)</span></label>
      <textarea id="h_desc" placeholder="Brief description of this habit" rows="2"></textarea>
    </div>
    <div class="form-row2">
      <div class="form-group">
        <label>Category</label>
        <select id="h_cat"><option>Health</option><option>Fitness</option><option>Learning</option><option>Mindfulness</option><option>Work</option><option>Finance</option><option>Social</option><option>Creativity</option><option selected>General</option></select>
      </div>
      <div class="form-group">
        <label>Frequency</label>
        <select id="h_freq"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select>
      </div>
    </div>
    <div class="form-row2">
      <div class="form-group">
        <label>Reminder Time <span style="color:var(--text-muted);font-weight:400">(optional)</span></label>
        <input type="time" id="h_reminder">
      </div>
      <div class="form-group">
        <label>Daily Target</label>
        <input type="number" id="h_target" value="1" min="1" max="99">
      </div>
    </div>
    <div class="form-group">
      <label>Icon</label>
      <div class="icon-row" id="iconRow">
        <?php foreach(['🏃','📚','💧','🧘','💪','🥗','😴','✍️','🎯','💊','🧹','🎸','💻','☀️','🌿'] as $i=>$ic): ?>
        <div class="icon-opt <?=$i===0?'selected':''?>" onclick="selectIcon(this,'<?=$ic?>')"><?=$ic?></div>
        <?php endforeach; ?>
      </div>
      <input type="hidden" id="h_icon" value="🏃">
    </div>
    <div class="form-group">
      <label>Color</label>
      <div class="color-row" id="colorRow">
        <?php foreach(['#6366f1','#ec4899','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#14b8a6','#f97316','#84cc16'] as $i=>$c): ?>
        <div class="color-swatch <?=$i===0?'selected':''?>" style="background:<?=$c?>" onclick="selectColor(this,'<?=$c?>')"></div>
        <?php endforeach; ?>
      </div>
      <input type="hidden" id="h_color" value="#6366f1">
    </div>
    <button class="submit-btn" id="addHabitBtn" onclick="addHabit()">Add Habit</button>
  </div>
</div>

<!-- Note Modal -->
<div class="modal-overlay" id="noteModal">
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title">Log Note</div>
      <span class="modal-close" onclick="closeNoteModal()">&times;</span>
    </div>
    <div class="form-group">
      <label>How did it go?</label>
      <div class="mood-row">
        <?php foreach([['great','Great'],['good','Good'],['okay','Okay'],['bad','Tough']] as [$m,$lbl]): ?>
        <div class="mood-opt" onclick="selectMood(this,'<?=$m?>')" data-mood="<?=$m?>">
          <div class="mood-emoji"><?=$m==='great'?'&#128516;':($m==='good'?'&#128522;':($m==='okay'?'&#128528;':'&#128543;'))?></div>
          <div class="mood-label"><?=$lbl?></div>
        </div>
        <?php endforeach; ?>
      </div>
      <input type="hidden" id="n_mood">
    </div>
    <div class="form-group">
      <label>Notes <span style="color:var(--text-muted);font-weight:400">(optional)</span></label>
      <textarea id="n_notes" placeholder="Anything worth noting about today..."></textarea>
    </div>
    <input type="hidden" id="n_habit_id">
    <button class="submit-btn" onclick="saveNote()">Save Note</button>
  </div>
</div>

<!-- Confirm Dialog -->
<div class="confirm-overlay" id="confirmOverlay">
  <div class="confirm-box">
    <div class="confirm-icon" id="confirmIcon"></div>
    <div class="confirm-title" id="confirmTitle"></div>
    <div class="confirm-msg" id="confirmMsg"></div>
    <div class="confirm-btns">
      <button class="btn-cancel" onclick="closeConfirm()">Cancel</button>
      <button class="btn-confirm" id="confirmBtn" onclick="runConfirm()"></button>
    </div>
  </div>
</div>

<script>
const CSRF = '<?= $csrf ?>';
let confirmCallback = null;
let chartsInitialized = false;
let lineChart, donutChart;

function showToast(msg, type) {
  type = type || 'info';
  var c = document.getElementById('toast-container');
  var t = document.createElement('div');
  t.className = 'toast ' + type;
  var icon = type === 'success'
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
    : type === 'error'
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
  t.innerHTML = icon + msg;
  c.appendChild(t);
  setTimeout(function() { t.style.animation = 'toastOut 0.25s ease forwards'; setTimeout(function() { t.remove(); }, 250); }, 3000);
}

function showConfirm(opts) {
  document.getElementById('confirmTitle').textContent = opts.title;
  document.getElementById('confirmMsg').textContent = opts.msg;
  var btn = document.getElementById('confirmBtn');
  btn.textContent = opts.btnLabel;
  btn.style.background = opts.btnColor || '#ef4444';
  btn.style.color = 'white';
  var iconEl = document.getElementById('confirmIcon');
  iconEl.innerHTML = opts.icon || '';
  iconEl.style.background = opts.iconBg || '#fee2e2';
  iconEl.style.color = opts.btnColor || '#ef4444';
  confirmCallback = opts.onConfirm;
  document.getElementById('confirmOverlay').classList.add('open');
}
function closeConfirm() { document.getElementById('confirmOverlay').classList.remove('open'); confirmCallback = null; }
function runConfirm() { closeConfirm(); if (confirmCallback) confirmCallback(); }

function openModal() { document.getElementById('addModal').classList.add('open'); setTimeout(function(){ document.getElementById('h_name').focus(); }, 50); }
function closeModal() { document.getElementById('addModal').classList.remove('open'); resetHabitForm(); }
function openNoteModal(id, name) { document.getElementById('n_habit_id').value = id; document.querySelector('#noteModal .modal-title').textContent = 'Log Note'; document.getElementById('noteModal').classList.add('open'); }
function closeNoteModal() { document.getElementById('noteModal').classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(function(o) { o.addEventListener('click', function(e) { if (e.target === o) o.classList.remove('open'); }); });

function resetHabitForm() {
  document.getElementById('h_name').value = '';
  document.getElementById('h_desc').value = '';
  document.getElementById('h_cat').value = 'General';
  document.getElementById('h_freq').value = 'daily';
  document.getElementById('h_reminder').value = '';
  document.getElementById('h_target').value = '1';
  document.getElementById('h_icon').value = '🏃';
  document.getElementById('h_color').value = '#6366f1';
  document.getElementById('habitFormError').style.display = 'none';
  document.querySelectorAll('.icon-opt').forEach(function(e, i) { e.classList.toggle('selected', i === 0); });
  document.querySelectorAll('.color-swatch').forEach(function(e, i) { e.classList.toggle('selected', i === 0); });
  document.getElementById('h_name').classList.remove('field-invalid');
  document.getElementById('h_name_err').style.display = 'none';
}

function clearFieldErr(id) { document.getElementById(id).classList.remove('field-invalid'); document.getElementById(id + '_err').style.display = 'none'; }

function selectIcon(el, icon) { document.querySelectorAll('.icon-opt').forEach(function(e) { e.classList.remove('selected'); }); el.classList.add('selected'); document.getElementById('h_icon').value = icon; }
function selectColor(el, color) { document.querySelectorAll('.color-swatch').forEach(function(e) { e.classList.remove('selected'); }); el.classList.add('selected'); document.getElementById('h_color').value = color; }
function selectMood(el, mood) { document.querySelectorAll('.mood-opt').forEach(function(e) { e.classList.remove('selected'); }); el.classList.add('selected'); document.getElementById('n_mood').value = mood; }

async function apiCall(data) {
  var fd = new FormData(); fd.append('ajax','1'); fd.append('csrf_token',CSRF);
  Object.entries(data).forEach(function(kv) { fd.append(kv[0], kv[1]); });
  var r = await fetch('dashboard.php', { method: 'POST', body: fd });
  return r.json();
}

function updateStats(stats) {
  if (!stats) return;
  var s1 = document.querySelector('.s1');
  if (s1) { s1.querySelector('.stat-value').textContent = stats.doneToday + '/' + stats.totalHabits; s1.querySelector('.stat-sub').textContent = stats.completionRate + '% completion rate'; }
  var s3v = document.querySelector('.s3 .stat-value'); if (s3v && stats.totalEntries !== undefined) s3v.textContent = stats.totalEntries;
  var s4v = document.querySelector('.s4 .stat-value'); if (s4v) s4v.textContent = stats.totalHabits;
  updateDonut();
}

function handleToggle(id) {
  var row = document.getElementById('hr_' + id);
  var isDone = row.dataset.done === '1';
  if (isDone) {
    showConfirm({
      title: 'Unmark Habit?',
      msg: 'Are you sure you want to mark this habit as not completed? Your progress for today will be removed.',
      btnLabel: 'Yes, Unmark',
      btnColor: '#ef4444',
      iconBg: '#fee2e2',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
      onConfirm: function() { doToggle(id); }
    });
  } else {
    doToggle(id);
  }
}

async function doToggle(id) {
  var res = await apiCall({ action: 'toggle', habit_id: id });
  if (res.success) {
    var row = document.getElementById('hr_' + id);
    var cb = row.querySelector('.habit-checkbox');
    var nm = row.querySelector('.habit-name');
    if (res.status === 'checked') {
      cb.classList.add('checked'); nm.classList.add('done');
      row.classList.add('completed', 'completing'); row.dataset.done = '1';
      setTimeout(function() { row.classList.remove('completing'); }, 400);
      showToast('Habit marked as done!', 'success');
    } else {
      cb.classList.remove('checked'); nm.classList.remove('done');
      row.classList.remove('completed'); row.dataset.done = '0';
      showToast('Habit unmarked.', 'info');
    }
    updateStats(res.stats);
  } else { showToast(res.error || 'Something went wrong.', 'error'); }
}

async function addHabit() {
  var nameEl = document.getElementById('h_name');
  var name = nameEl.value.trim();
  var errDiv = document.getElementById('habitFormError');
  if (!name) { nameEl.classList.add('field-invalid'); document.getElementById('h_name_err').style.display = 'block'; nameEl.focus(); return; }
  errDiv.style.display = 'none';
  var btn = document.getElementById('addHabitBtn'); btn.disabled = true; btn.textContent = 'Adding...';
  var res = await apiCall({ action:'add_habit', name: name, description: document.getElementById('h_desc').value, category: document.getElementById('h_cat').value, frequency: document.getElementById('h_freq').value, icon: document.getElementById('h_icon').value, color: document.getElementById('h_color').value, target_count: document.getElementById('h_target').value || 1, reminder_time: document.getElementById('h_reminder').value });
  btn.disabled = false; btn.textContent = 'Add Habit';
  if (res.success) {
    closeModal(); appendHabitRow(res.habit); updateStats(res.stats);
    showToast('"' + res.habit.name + '" added!', 'success');
    if (!chartsInitialized) { initCharts(); } else { updateDonut(); }
  } else { errDiv.textContent = res.error || 'Failed to add habit.'; errDiv.style.display = 'block'; }
}

function appendHabitRow(h) {
  var list = document.getElementById('habitList');
  var emptyState = document.getElementById('emptyState'); if (emptyState) emptyState.remove();
  var row = document.createElement('div');
  row.className = 'habit-row'; row.id = 'hr_' + h.id; row.dataset.done = '0';
  var eName = h.name.replace(/'/g, "\\'").replace(/</g,'&lt;').replace(/>/g,'&gt;');
  row.innerHTML = '<div class="habit-checkbox" onclick="handleToggle(' + h.id + ')" title="Mark as done"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>'
    + '<div class="habit-color-bar" style="background:' + h.color + '"></div>'
    + '<div class="habit-info"><div class="habit-name">' + h.name + '</div><div class="habit-meta">' + h.category + ' &middot; ' + h.frequency.charAt(0).toUpperCase() + h.frequency.slice(1) + (h.reminder_time ? ' &middot; ' + h.reminder_time : '') + '</div><div class="habit-dots">' + [0,0,0,0,0,0,0].map(function(){return '<div class="hdot" style="background:var(--border)"></div>';}).join('') + '</div></div>'
    + '<div class="habit-right"><div class="done-badge"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Done</div>'
    + '<div class="streak-badge"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg> 0 days</div>'
    + '<div class="habit-actions"><div class="ha-btn" onclick="openNoteModal(' + h.id + ', \'' + eName + '\')" title="Add note"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></div>'
    + '<div class="ha-btn del" onclick="confirmDelete(' + h.id + ', \'' + eName + '\')" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></div></div></div>';
  list.appendChild(row);
}

function confirmDelete(id, name) {
  showConfirm({ title: 'Delete Habit', msg: 'Delete "' + name + '" and all its history? This cannot be undone.', btnLabel: 'Delete', btnColor: '#ef4444', iconBg: '#fee2e2', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>', onConfirm: function() { deleteHabit(id, name); } });
}

async function deleteHabit(id, name) {
  var res = await apiCall({ action: 'delete_habit', habit_id: id });
  if (res.success) {
    document.getElementById('hr_' + id).remove(); updateStats(res.stats);
    showToast('"' + name + '" deleted.', 'info');
    if (document.querySelectorAll('.habit-row').length === 0) {
      document.getElementById('habitList').innerHTML = '<div class="empty-state" id="emptyState"><div class="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg></div><div class="empty-title">No habits yet</div><div class="empty-sub">Add your first habit to start tracking your progress.</div><button class="empty-cta" onclick="openModal()">Add Your First Habit</button></div>';
    }
  }
}

async function saveNote() {
  var res = await apiCall({ action: 'log_note', habit_id: document.getElementById('n_habit_id').value, mood: document.getElementById('n_mood').value, notes: document.getElementById('n_notes').value });
  if (res.success) { closeNoteModal(); document.getElementById('n_notes').value = ''; document.getElementById('n_mood').value = ''; document.querySelectorAll('.mood-opt').forEach(function(e) { e.classList.remove('selected'); }); showToast('Note saved!', 'success'); }
  else { showToast('Failed to save note.', 'error'); }
}

function filterHabits(type, el) {
  document.querySelectorAll('.ftab').forEach(function(t) { t.classList.remove('active'); }); el.classList.add('active');
  document.querySelectorAll('.habit-row').forEach(function(row) { var done = row.dataset.done === '1'; row.style.display = type==='all'?'flex':type==='done'?(done?'flex':'none'):(!done?'flex':'none'); });
}

function updateDonut() {
  var rows = document.querySelectorAll('.habit-row'); var done = 0, total = 0;
  rows.forEach(function(r) { total++; if (r.dataset.done === '1') done++; });
  if (donutChart) { donutChart.data.datasets[0].data = [done, total - done]; donutChart.update('none'); }
}

async function initCharts() {
  chartsInitialized = true;
  var res = await apiCall({ action: 'chart_data' }); if (!res.success) return;
  var lc = document.getElementById('lineChart');
  if (lc) {
    lineChart = new Chart(lc, { type:'line', data:{ labels:res.labels, datasets:[{ label:'Habits Completed', data:res.data, borderColor:'#2563eb', backgroundColor:'rgba(37,99,235,0.06)', fill:true, tension:0.4, pointBackgroundColor:'#2563eb', pointRadius:3, pointHoverRadius:5, borderWidth:2 }] }, options:{ responsive:true, maintainAspectRatio:true, plugins:{legend:{display:false}}, scales:{ x:{ticks:{color:'#9ca3af',maxTicksLimit:8,font:{size:11}},grid:{display:false}}, y:{ticks:{color:'#9ca3af',stepSize:1,font:{size:11}},grid:{color:'#f9fafb'},beginAtZero:true} } } });
  }
  var rows = document.querySelectorAll('.habit-row'); var done=0,total=0; rows.forEach(function(r){total++;if(r.dataset.done==='1')done++;});
  var dc = document.getElementById('donutChart');
  if (dc) { donutChart = new Chart(dc, { type:'doughnut', data:{ labels:['Completed','Remaining'], datasets:[{data:[done,total-done],backgroundColor:['#10b981','#f3f4f6'],borderWidth:0}] }, options:{ responsive:true, maintainAspectRatio:true, cutout:'72%', plugins:{legend:{position:'bottom',labels:{color:'#374151',font:{size:12,weight:'600'},padding:14,usePointStyle:true}}} } }); }
}

<?php if (!empty($habits)): ?>initCharts();<?php endif; ?>
</script>
</body>
</html>
