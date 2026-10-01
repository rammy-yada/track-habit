<?php
// esewa_failure.php
// eSewa sends the browser here when the user cancels or the payment fails.
// We embedded our own transaction_uuid in this URL when we built the payment
// form (see donate.php), since eSewa doesn't reliably echo one back on failure.
require_once 'includes/config.php';
requireLogin();
$db   = getDB();
$user = currentUser();

$tx = $_GET['tx'] ?? '';
if ($tx) {
    $db->prepare("UPDATE donations SET status='failed' WHERE transaction_uuid=? AND user_id=? AND status='pending'")
       ->execute([$tx, $user['id']]);
}

setFlash('error', 'Payment was cancelled or could not be completed.');
header('Location: donate.php'); exit();
