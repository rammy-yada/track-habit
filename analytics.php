<?php require_once 'includes/config.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Analytics — HabitFlow</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
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
.charts-2col{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;}
.chart-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 22px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.chart-title { font-size: 14px; font-weight: 700; margin-bottom: 20px; color: var(--text-main); }
.chart-sub{font-size:12px;color:var(--text-muted);margin-bottom:16px;margin-top:-10px;}
.stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;}
.mini-stat { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 18px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.mini-val { font-size: 24px; font-weight: 700; color: var(--text-main); }
.mini-label { font-size: 12px; color: var(--text-muted); margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.habit-analytics-list{display:flex;flex-direction:column;gap:12px;}
.ha-row { background: #fafafa; border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; display: flex; align-items: center; gap: 14px; }
.ha-icon{font-size:20px;width:36px;text-align:center;}
.ha-info{flex:1;}
.ha-name{font-size:14px;font-weight:600;}
.ha-bar-wrap { background: #f3f4f6; border-radius: 4px; height: 6px; margin-top: 8px; overflow: hidden; }
.ha-bar-fill{height:100%;border-radius:4px;background: var(--primary);}
.ha-pct{font-size:13px;font-weight:700;width:42px;text-align:right;}
.ha-streak{font-size:12px;color:var(--text-muted);text-align:center;min-width:100px;font-weight:500;}
@media(max-width:1100px){.charts-2col{grid-template-columns:1fr;} .stats-row{grid-template-columns:repeat(2,1fr);}}
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

// Gather analytics data
$stmt = $db->prepare("SELECT COUNT(*) FROM habits WHERE user_id=? AND is_active=1");
$stmt->execute([$user['id']]); $totalHabits = $stmt->fetchColumn();

$stmt = $db->prepare("SELECT COUNT(*) FROM habit_logs WHERE user_id=? AND log_date=? AND completed_count>0");
$stmt->execute([$user['id'], $today]); $todayDone = $stmt->fetchColumn();

$stmt = $db->prepare("SELECT COUNT(DISTINCT log_date) FROM habit_logs WHERE user_id=? AND completed_count>0");
$stmt->execute([$user['id']]); $activeDays = $stmt->fetchColumn();

$stmt = $db->prepare("SELECT COUNT(*) FROM habit_logs WHERE user_id=? AND completed_count>0");
$stmt->execute([$user['id']]); $totalCheckins = $stmt->fetchColumn();

// Weekly completion for bar chart (last 4 weeks)
$weeklyData = [];
$weekLabels = [];
for ($w=3; $w>=0; $w--) {
    $wStart = date('Y-m-d', strtotime("-".($w*7+6)." days", strtotime($today)));
    $wEnd = date('Y-m-d', strtotime("-".($w*7)." days", strtotime($today)));
    $stmt = $db->prepare("SELECT COUNT(*) FROM habit_logs WHERE user_id=? AND log_date BETWEEN ? AND ? AND completed_count>0");
    $stmt->execute([$user['id'], $wStart, $wEnd]);
    $weeklyData[] = (int)$stmt->fetchColumn();
    $weekLabels[] = 'Week '.($w===0?'(Current)':($w+1).' Ago');
}

// Category breakdown
$stmt = $db->prepare("
    SELECT h.category, COUNT(hl.id) as cnt
    FROM habits h LEFT JOIN habit_logs hl ON h.id=hl.habit_id AND hl.completed_count>0
    WHERE h.user_id=? AND h.is_active=1
    GROUP BY h.category
");
$stmt->execute([$user['id']]); $catData = $stmt->fetchAll();

// Per-habit stats
$stmt = $db->prepare("
    SELECT h.id, h.name, h.icon, h.color, h.category,
    COUNT(hl.id) as total_done,
    (SELECT COUNT(*) FROM habit_logs WHERE habit_id=h.id AND user_id=h.user_id AND log_date>=DATE_SUB(?,INTERVAL 30 DAY)) as month_done
    FROM habits h
    LEFT JOIN habit_logs hl ON h.id=hl.habit_id AND hl.completed_count>0
    WHERE h.user_id=? AND h.is_active=1
    GROUP BY h.id ORDER BY total_done DESC
");
$stmt->execute([$today, $user['id']]); $habitStats = $stmt->fetchAll();

// Day-of-week heatmap
$dowLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
$dowData = array_fill(0,7,0);
$stmt = $db->prepare("SELECT DAYOFWEEK(log_date)-1 as dow, COUNT(*) as cnt FROM habit_logs WHERE user_id=? AND completed_count>0 GROUP BY dow");
$stmt->execute([$user['id']]); 
foreach ($stmt->fetchAll() as $row) $dowData[$row['dow']] = (int)$row['cnt'];

// Mood distribution
$moodData = ['great'=>0,'good'=>0,'okay'=>0,'bad'=>0];
$stmt = $db->prepare("SELECT mood, COUNT(*) as cnt FROM habit_logs WHERE user_id=? AND mood IS NOT NULL GROUP BY mood");
$stmt->execute([$user['id']]);
foreach ($stmt->fetchAll() as $row) if (isset($moodData[$row['mood']])) $moodData[$row['mood']] = (int)$row['cnt'];
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
    <a href="analytics.php" class="nav-item active">Analytics</a>
    <a href="monthly.php" class="nav-item">Monthly View</a>
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
    <div class="page-title">Analytics</div>
    <div style="font-size:13px;color:var(--text-muted);font-weight:500;">Data up to <?=date('M j, Y',strtotime($today))?></div>
  </div>
  <div class="content">
    <!-- Mini stats -->
    <div class="stats-row">
      <div class="mini-stat"><div class="mini-val"><?=$totalCheckins?></div><div class="mini-label">Total Check-ins</div></div>
      <div class="mini-stat"><div class="mini-val"><?=$activeDays?></div><div class="mini-label">Days Active</div></div>
      <div class="mini-stat"><div class="mini-val"><?=$totalHabits?></div><div class="mini-label">Active Habits</div></div>
      <div class="mini-stat"><div class="mini-val"><?=$todayDone?>/<?=$totalHabits?></div><div class="mini-label">Today Done</div></div>
    </div>

    <!-- Charts row 1 -->
    <div class="charts-2col">
      <div class="chart-card">
        <div class="chart-title">Weekly Completion</div>
        <canvas id="weeklyChart" height="130"></canvas>
      </div>
      <div class="chart-card">
        <div class="chart-title">Day-of-Week Pattern</div>
        <div class="chart-sub">Completions by day of week</div>
        <canvas id="dowChart" height="130"></canvas>
      </div>
    </div>

    <!-- Charts row 2 -->
    <div class="charts-2col">
      <div class="chart-card">
        <div class="chart-title">Habits by Category</div>
        <canvas id="catChart" height="160"></canvas>
      </div>
      <div class="chart-card">
        <div class="chart-title">Mood Distribution</div>
        <canvas id="moodChart" height="160"></canvas>
      </div>
    </div>

    <!-- Per habit breakdown -->
    <div class="chart-card" style="margin-bottom:24px;">
      <div class="chart-title">Per-Habit Performance (Monthly)</div>
      <div class="habit-analytics-list" id="habitAnalytics">
        <?php if(empty($habitStats)):?>
        <div style="text-align:center;padding:40px;color:var(--text-muted);font-weight:500;">No habits tracked yet.</div>
        <?php else: foreach($habitStats as $h):
          $pct = min(100, $h['month_done'] > 0 ? round(($h['month_done']/30)*100) : 0);
        ?>
        <div class="ha-row">
          <div class="ha-icon"><?=htmlspecialchars($h['icon'])?></div>
          <div class="ha-info">
            <div class="ha-name"><?=htmlspecialchars($h['name'])?></div>
            <div class="ha-bar-wrap">
              <div class="ha-bar-fill" style="width:<?=$pct?>%;"></div>
            </div>
          </div>
          <div class="ha-pct" style="color:var(--primary)"><?=$pct?>%</div>
          <div class="ha-streak"><?=$h['total_done']?> total check-ins</div>
        </div>
        <?php endforeach; endif; ?>
      </div>
    </div>
  </div>
</div>

<script>
Chart.defaults.color = '#6b7280';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.weight = '500';

// Weekly bar chart
new Chart(document.getElementById('weeklyChart'), {
  type:'bar',
  data:{
    labels:<?=json_encode($weekLabels)?>,
    datasets:[{
      label:'Check-ins',
      data:<?=json_encode($weeklyData)?>,
      backgroundColor:'#2563eb',
      borderWidth:0,borderRadius:4,
    }]
  },
  options:{responsive:true,plugins:{legend:{display:false}},scales:{
    x:{ticks:{color:'#6b7280'},grid:{display:false}},
    y:{ticks:{color:'#6b7280',stepSize:1},grid:{color:'#f3f4f6'},beginAtZero:true}
  }}
});

// Day of week
new Chart(document.getElementById('dowChart'), {
  type:'radar',
  data:{
    labels:<?=json_encode($dowLabels)?>,
    datasets:[{
      label:'Completions',
      data:<?=json_encode(array_values($dowData))?>,
      backgroundColor:'rgba(37,99,235,0.05)',
      borderColor:'#2563eb',pointBackgroundColor:'#2563eb',
    }]
  },
  options:{responsive:true,plugins:{legend:{display:false}},scales:{
    r:{ticks:{display:false},grid:{color:'#f3f4f6'},angleLines:{color:'#f3f4f6'},pointLabels:{color:'#6b7280',font:{size:11, weight:'600'}}}
  }}
});

// Category pie
const catLabels=<?=json_encode(array_column($catData,'category'))?>;
const catVals=<?=json_encode(array_column($catData,'cnt'))?>;
const catColors=['#2563eb','#3b82f6','#60a5fa','#93c5fd','#1e40af','#1e3a8a','#312e81','#4338ca','#4f46e5'];
new Chart(document.getElementById('catChart'), {
  type:'doughnut',
  data:{labels:catLabels,datasets:[{data:catVals,backgroundColor:catColors.slice(0,catLabels.length),borderWidth:0}]},
  options:{responsive:true,cutout:'70%',plugins:{legend:{position:'right',labels:{color:'#374151',padding:12,font:{size:11, weight:'600'}, usePointStyle: true}}}}
});

// Mood chart
new Chart(document.getElementById('moodChart'), {
  type:'bar',
  data:{
    labels:['😄 Great','😊 Good','😐 Okay','😟 Bad'],
    datasets:[{
      data:[<?=implode(',',$moodData)?>],
      backgroundColor:['#10b981','#3b82f6','#fbbf24','#ef4444'],
      borderWidth:0,borderRadius:4,
    }]
  },
  options:{responsive:true,plugins:{legend:{display:false}},scales:{
    x:{ticks:{color:'#6b7280'},grid:{display:false}},
    y:{ticks:{color:'#6b7280',stepSize:1},grid:{color:'#f3f4f6'},beginAtZero:true}
  }}
});
</script>
</body>
</html>
