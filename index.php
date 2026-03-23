<?php
require_once 'includes/config.php';
if (isLoggedIn()) { header('Location: dashboard.php'); exit(); }
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HabitFlow — Build Better Habits</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  <?= getGlobalThemeStyles() ?>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', system-ui, sans-serif;
    background: var(--bg-main); color: var(--text-main);
    min-height: 100vh; display: flex; flex-direction: column;
  }

  header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 24px 48px; border-bottom: 1px solid var(--border);
  }
  .logo { display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--text-main); }
  .logo-mark { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: #eff6ff; border-radius: 8px; color: var(--primary); }
  .logo-name { font-size: 18px; font-weight: 700; }
  .nav { display: flex; gap: 12px; align-items: center; }
  .btn {
    font-size: 14px; font-weight: 600; padding: 10px 20px; border-radius: 8px;
    text-decoration: none; transition: all 0.2s;
  }
  .btn-ghost { color: var(--text-muted); }
  .btn-ghost:hover { color: var(--text-main); background: #f3f4f6; }
  .btn-primary { background: var(--primary); color: white; }
  .btn-primary:hover { background: var(--primary-hover); }

  .hero {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; text-align: center; padding: 80px 24px;
  }
  .hero-title {
    font-size: clamp(36px, 5vw, 64px); font-weight: 800; line-height: 1.1;
    letter-spacing: -2px; margin-bottom: 24px; max-width: 800px; color: var(--text-main);
  }
  .hero-title span { color: var(--primary); }
  .hero-sub { color: var(--text-muted); font-size: 18px; line-height: 1.6; max-width: 600px; margin-bottom: 40px; }
  .hero-actions { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
  .btn-lg { padding: 14px 32px; font-size: 16px; }
  .btn-outline {
    background: transparent; border: 1px solid var(--border);
    color: var(--text-main); text-decoration: none; font-size: 16px;
    font-weight: 600; padding: 14px 32px; border-radius: 8px; transition: all 0.2s;
  }
  .btn-outline:hover { border-color: var(--primary); color: var(--primary); }

  .features {
    display: flex; justify-content: center; gap: 60px; padding: 60px;
    border-top: 1px solid var(--border); flex-wrap: wrap; background: #fafafa;
  }
  .feature-item { text-align: center; }
  .feature-label { font-size: 14px; color: var(--text-muted); margin-top: 4px; }
  .feature-value { font-size: 24px; font-weight: 700; color: var(--text-main); }

  @media(max-width: 600px) {
    header { padding: 16px 24px; }
    .features { gap: 32px; padding: 40px 24px; }
    .hero-title { letter-spacing: -1px; }
  }
</style>
</head>
<body>

<header>
  <a href="/" class="logo">
    <div class="logo-mark">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
    </div>
    <span class="logo-name">HabitFlow</span>
  </a>
  <nav class="nav">
    <a href="login.php" class="btn btn-ghost">Sign in</a>
    <a href="register.php" class="btn btn-primary">Get Started</a>
  </nav>
</header>

<div class="hero">
  <h1 class="hero-title">Build habits that<br><span>actually stick</span></h1>
  <p class="hero-sub">Simple habit tracking designed for clarity and focus. No clutter, just your progress.</p>
  <div class="hero-actions">
    <a href="register.php" class="btn btn-primary btn-lg">Create Account</a>
    <a href="login.php" class="btn-outline">Sign In</a>
  </div>
</div>

<div class="features">
  <div class="feature-item">
    <div class="feature-value">Daily</div>
    <div class="feature-label">Automatic Reset</div>
  </div>
  <div class="feature-item">
    <div class="feature-value">Streaks</div>
    <div class="feature-label">Momentum Tracking</div>
  </div>
  <div class="feature-item">
    <div class="feature-value">Insights</div>
    <div class="feature-label">Clarity & Focus</div>
  </div>
</div>

</body>
</html>
