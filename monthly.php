<?php require_once 'includes/config.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Monthly View — HabitFlow</title>
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
.topbar{display:flex;align-items:center;justify-content:space-between;padding:20px 32px;border-bottom:1px solid var(--border);background:var(--bg-main);position:sticky;top:0;z-index:10;}
.page-title{font-size:20px;font-weight:700;}
.content{padding:28px 32px;}
.month-nav{display:flex;align-items:center;gap:12px;}
.mnav-btn{padding:8px 16px;background:#f3f4f6;border:1px solid var(--border);border-radius:8px;color:var(--text-main);font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;transition:all 0.2s;}
.mnav-btn:hover{border-color:var(--primary);color:var(--primary);}
.month-label{font-size:16px;font-weight:700;min-width:140px;text-align:center;}
.table-wrap{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow:auto;margin-bottom:24px;box-shadow:0 1px 2px rgba(0,0,0,0.05);}
.excel-table{border-collapse:collapse;font-size:12px;min-width:100%;}
.excel-table th{background:#f9fafb;color:var(--text-muted);font-weight:600;font-size:11px;padding:12px 8px;border-bottom:1px solid var(--border);border-right:1px solid var(--border);white-space:nowrap;text-align:center;text-transform:uppercase;letter-spacing:0.5px;}
.excel-table th.habit-col{text-align:left;min-width:160px;padding-left:16px;position:sticky;left:0;background:#f9fafb;z-index:2;}
.excel-table td{padding:10px;border-bottom:1px solid #f3f4f6;border-right:1px solid #f3f4f6;text-align:center;vertical-align:middle;}
.excel-table td.habit-name-cell{text-align:left;padding-left:16px;white-space:nowrap;max-width:180px;overflow:hidden;text-overflow:ellipsis;position:sticky;left:0;background:var(--bg-card);z-index:1;font-weight:600;}
.excel-table tr:hover td{background:#f9fafb;}
.excel-table tr:hover td.habit-name-cell{background:#f9fafb;}
.excel-table tr:last-child td{border-bottom:none;}
.cell-done { width: 22px; height: 22px; border-radius: 4px; background: #d1fae5; color: var(--success); display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
.cell-done:hover{background:#a7f3d0;}
.cell-miss { width: 22px; height: 22px; border-radius: 4px; background: #f3f4f6; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; color: #9ca3af; cursor: pointer; transition: all 0.2s; }
.cell-miss:hover{background:#d1fae5;color:var(--success);}
.cell-future{width:22px;height:22px;border-radius:4px;background:transparent;display:inline-flex;align-items:center;justify-content:center;font-size:11px;color:#e5e7eb;}
.today-col{background:rgba(37,99,235,0.03)!important;}
.today-header{color:var(--primary)!important;font-weight:800!important;}
.summary-row td{background:#f9fafb!important;font-weight:700;border-top:1px solid var(--border);}
.pct-pill { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
.pct-high{background:#d1fae5;color:var(--success);}
.pct-mid{background:#fef3c7;color:#d97706;}
.pct-low{background:#fee2e2;color:var(--error);}
.legend { display: flex; gap: 20px; font-size: 12px; font-weight: 500; color: var(--text-muted); margin-bottom: 20px; align-items: center; }
.legend-item{display:flex;align-items:center;gap:8px;}
@media(max-width:768px){.sidebar{display:none;}.content{padding:16px;}}
</style>
</head>
<body>
<?php
require_once 'includes/config.php';
requireLogin();
$user = currentUser();
$db = getDB();
$today = getUserDate($user['timezone'] ?? 'UTC');

// Month navigation
$currentY = (int)date('Y', strtotime($today));
$currentM = (int)date('m', strtotime($today));
$reqYear = isset($_GET['y']) ? max(2020, min((int)$_GET['y'], $currentY)) : $currentY;
$reqMonth = isset($_GET['m']) ? max(1, min(12, (int)$_GET['m'])) : $currentM;
$isFuture = ($reqYear > $currentY) || ($reqYear === $currentY && $reqMonth > $currentM);

$prevY = $reqYear; $prevM = $reqMonth-1; if ($prevM < 1) { $prevM = 12; $prevY--; }
$nextY = $reqYear; $nextM = $reqMonth+1; if ($nextM > 12) { $nextM = 1; $nextY++; }
$canGoNext = !($nextY > $currentY || ($nextY === $currentY && $nextM > $currentM));

$daysInMonth = cal_days_in_month(CAL_GREGORIAN, $reqMonth, $reqYear);
$monthLabel = date('F Y', mktime(0,0,0,$reqMonth,1,$reqYear));

// Handle toggle
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['ajax'])) {
    header('Content-Type: application/json');
    if (!verifyCSRF($_POST['csrf_token'] ?? '')) { echo json_encode(['success'=>false]); exit(); }
    $habitId = (int)$_POST['habit_id'];
    $logDate = sanitize($_POST['log_date'] ?? '');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $logDate)) { echo json_encode(['success'=>false]); exit(); }
    if ($logDate > $today) { echo json_encode(['success'=>false,'error'=>'Cannot log future dates']); exit(); }
    
    $chk = $db->prepare("SELECT id FROM habits WHERE id=? AND user_id=?");
    $chk->execute([$habitId, $user['id']]);
    if (!$chk->fetch()) { echo json_encode(['success'=>false]); exit(); }
    
    $chk = $db->prepare("SELECT id FROM habit_logs WHERE habit_id=? AND user_id=? AND log_date=?");
    $chk->execute([$habitId, $user['id'], $logDate]);
    $existing = $chk->fetch();
    if ($existing) {
        $db->prepare("DELETE FROM habit_logs WHERE id=?")->execute([$existing['id']]);
        echo json_encode(['success'=>true,'status'=>'unchecked']);
    } else {
        $db->prepare("INSERT INTO habit_logs (habit_id,user_id,log_date,completed_count) VALUES (?,?,?,1) ON DUPLICATE KEY UPDATE completed_count=1")->execute([$habitId,$user['id'],$logDate]);
        echo json_encode(['success'=>true,'status'=>'checked']);
    }
    exit();
}

// Load habits
$stmt = $db->prepare("SELECT * FROM habits WHERE user_id=? AND is_active=1 ORDER BY created_at ASC");
$stmt->execute([$user['id']]); $habits = $stmt->fetchAll();

// Load all logs for this month
$monthStart = sprintf('%04d-%02d-01', $reqYear, $reqMonth);
$monthEnd = sprintf('%04d-%02d-%02d', $reqYear, $reqMonth, $daysInMonth);
$stmt = $db->prepare("SELECT habit_id, log_date FROM habit_logs WHERE user_id=? AND log_date BETWEEN ? AND ? AND completed_count>0");
$stmt->execute([$user['id'], $monthStart, $monthEnd]);
$logs = []; foreach ($stmt->fetchAll() as $r) $logs[$r['habit_id']][$r['log_date']] = true;

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
    <a href="monthly.php" class="nav-item active">Monthly View</a>
    <a href="profile.php" class="nav-item">Profile</a>
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
  <div class="topbar">
    <div class="page-title">Monthly View</div>
    <div class="month-nav">
      <a href="monthly.php?y=<?=$prevY?>&m=<?=$prevM?>" class="mnav-btn">←</a>
      <div class="month-label"><?=$monthLabel?></div>
      <?php if($canGoNext):?>
      <a href="monthly.php?y=<?=$nextY?>&m=<?=$nextM?>" class="mnav-btn">→</a>
      <?php else: ?>
      <div class="mnav-btn" style="opacity:.3;cursor:not-allowed">→</div>
      <?php endif;?>
    </div>
  </div>
  <div class="content">
    <div class="legend">
      <div class="legend-item"><div class="cell-done">✓</div> Completed</div>
      <div class="legend-item"><div class="cell-miss">·</div> Missed</div>
      <div class="legend-item"><div class="cell-future">-</div> Future</div>
      <div style="color:var(--text-muted);font-size:12px;margin-left:auto;font-weight:600;">Click cells (past only) to toggle</div>
    </div>
    
    <?php if(empty($habits)):?>
    <div style="text-align:center;padding:80px 20px;background:#fafafa;border:1px dashed var(--border);border-radius:12px;">
      <div style="font-size:18px;font-weight:700;margin-bottom:8px;color:var(--text-main)">No habits to show</div>
      <div style="color:var(--text-muted);font-size:14px;">Add habits from the <a href="dashboard.php" style="color:var(--primary);font-weight:600;text-decoration:none;">Dashboard</a> first.</div>
    </div>
    <?php else: ?>
    <div class="table-wrap">
      <table class="excel-table">
        <thead>
          <tr>
            <th class="habit-col">Habit</th>
            <?php for($d=1;$d<=$daysInMonth;$d++):
              $dateStr = sprintf('%04d-%02d-%02d',$reqYear,$reqMonth,$d);
              $isToday = $dateStr === $today;
              $dow = date('D',strtotime($dateStr));
            ?>
            <th class="<?=$isToday?'today-header':''?>" title="<?=$dateStr?>">
              <div><?=$d?></div>
              <div style="font-size:9px;opacity:.6"><?=$dow?></div>
            </th>
            <?php endfor;?>
            <th>Done</th>
            <th>Rate</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach($habits as $h):
            $doneCount = 0; $possibleCount = 0;
          ?>
          <tr>
            <td class="habit-name-cell">
              <span><?=htmlspecialchars($h['icon'])?></span>
              <span style="margin-left:8px"><?=htmlspecialchars($h['name'])?></span>
            </td>
            <?php for($d=1;$d<=$daysInMonth;$d++):
              $dateStr = sprintf('%04d-%02d-%02d',$reqYear,$reqMonth,$d);
              $isPast = $dateStr <= $today;
              $isToday = $dateStr === $today;
              $isDone = isset($logs[$h['id']][$dateStr]);
              if ($isPast) { $possibleCount++; if($isDone) $doneCount++; }
            ?>
            <td class="<?=$isToday?'today-col':''?>">
              <?php if($isPast):?>
              <div class="<?=$isDone?'cell-done':'cell-miss'?>" 
                   id="c_<?=$h['id']?>_<?=$d?>"
                   onclick="toggleCell(<?=$h['id']?>,'<?=$dateStr?>',this)"><?=$isDone?'✓':'·'?></div>
              <?php else:?>
              <div class="cell-future">-</div>
              <?php endif;?>
            </td>
            <?php endfor;?>
            <td style="font-weight:700;color:var(--primary)"><?=$doneCount?></td>
            <td>
              <?php $pct=$possibleCount>0?round(($doneCount/$possibleCount)*100):0;
              $cls=$pct>=80?'pct-high':($pct>=50?'pct-mid':'pct-low');?>
              <span class="pct-pill <?=$cls?>"><?=$pct?>%</span>
            </td>
          </tr>
          <?php endforeach;?>
          
          <!-- Daily summary row -->
          <tr class="summary-row">
            <td class="habit-name-cell" style="color:var(--text-muted)">Total Done</td>
            <?php for($d=1;$d<=$daysInMonth;$d++):
              $dateStr=sprintf('%04d-%02d-%02d',$reqYear,$reqMonth,$d);
              $isPast=$dateStr<=$today; $count=0;
              if($isPast) foreach($habits as $h) if(isset($logs[$h['id']][$dateStr])) $count++;
            ?>
            <td style="font-weight:700;color:<?=$count>0?'var(--primary)':'#9ca3af'?>;font-size:11px">
              <?=$isPast?$count:'-'?>
            </td>
            <?php endfor;?>
            <td></td><td></td>
          </tr>
        </tbody>
      </table>
    </div>
    <?php endif;?>
  </div>
</div>

<script>
const CSRF = '<?=$csrf?>';
async function toggleCell(habitId, date, el) {
  const fd = new FormData();
  fd.append('ajax','1'); fd.append('csrf_token',CSRF);
  fd.append('action','toggle'); fd.append('habit_id',habitId); fd.append('log_date',date);
  const r = await fetch('monthly.php', {method:'POST',body:fd});
  const data = await r.json();
  if (data.success) {
    if (data.status==='checked') {
      el.className='cell-done'; el.textContent='✓';
    } else {
      el.className='cell-miss'; el.textContent='·';
    }
    
    // Dynamically update row stats
    const row = el.closest('tr');
    const doneCell = row.querySelector('td:nth-last-child(2)');
    const ratePill = row.querySelector('.pct-pill');
    
    // Recalculate done count for the row
    let doneCount = 0;
    let possibleCount = 0;
    row.querySelectorAll('.cell-done, .cell-miss').forEach(cell => {
      possibleCount++;
      if (cell.classList.contains('cell-done')) doneCount++;
    });
    
    doneCell.textContent = doneCount;
    const pct = possibleCount > 0 ? Math.round((doneCount / possibleCount) * 100) : 0;
    ratePill.textContent = pct + '%';
    ratePill.className = 'pct-pill ' + (pct >= 80 ? 'pct-high' : (pct >= 50 ? 'pct-mid' : 'pct-low'));

    // Update daily summary row if it exists
    const dayMatch = el.id.match(/_(\d+)$/);
    if (dayMatch) {
      const dayIndex = parseInt(dayMatch[1]);
      const summaryCell = document.querySelector('.summary-row td:nth-child(' + (dayIndex + 1) + ')');
      if (summaryCell) {
        let dailyTotal = 0;
        document.querySelectorAll('[id^="c_"][id$="_' + dayIndex + '"]').forEach(c => {
          if (c.classList.contains('cell-done')) dailyTotal++;
        });
        summaryCell.textContent = dailyTotal;
        summaryCell.style.color = dailyTotal > 0 ? 'var(--primary)' : '#9ca3af';
      }
    }
  }
}
</script>
</body>
</html>
