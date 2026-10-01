<?php
// logout.php
require_once 'includes/config.php';
$_SESSION = [];
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}
session_destroy();
// Redirect to login page using the same directory as this script
$dir = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
header('Location: ' . $dir . '/login.php');
exit();
