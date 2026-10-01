<?php
// esewa_success.php
// eSewa redirects the user's browser here after a completed payment, appending
// a base64-encoded JSON blob as ?data=. That blob is NOT proof of payment by
// itself — a user can hand-edit a query string — so we treat it only as a
// pointer to *which* transaction to check, then re-verify directly with
// eSewa's status API before ever marking a donation as completed.
require_once 'includes/config.php';
requireLogin();
$db   = getDB();
$user = currentUser();

$raw     = $_GET['data'] ?? '';
$decoded = $raw ? json_decode(base64_decode($raw), true) : null;

if (!$decoded || empty($decoded['transaction_uuid'])) {
    setFlash('error', 'We could not read the payment response from eSewa.');
    header('Location: donate.php'); exit();
}

$transactionUuid = $decoded['transaction_uuid'];
$stmt = $db->prepare("SELECT * FROM donations WHERE transaction_uuid=? AND user_id=? LIMIT 1");
$stmt->execute([$transactionUuid, $user['id']]);
$donation = $stmt->fetch();

if (!$donation) {
    setFlash('error', 'Payment record not found.');
    header('Location: donate.php'); exit();
}

if ($donation['status'] === 'completed') {
    setFlash('success', 'Payment already confirmed. Thank you!');
    header('Location: donate.php'); exit();
}

$statusData = esewaCheckStatus(ESEWA_PRODUCT_CODE, $donation['amount'], $transactionUuid);

if ($statusData && ($statusData['status'] ?? '') === 'COMPLETE') {
    $db->prepare("UPDATE donations SET status='completed', esewa_ref_id=? WHERE id=?")
       ->execute([$statusData['ref_id'] ?? null, $donation['id']]);
    setFlash('success', 'Thank you for supporting HabitFlow! Payment confirmed.');
} else {
    $db->prepare("UPDATE donations SET status='failed' WHERE id=?")->execute([$donation['id']]);
    setFlash('error', 'Payment could not be verified with eSewa. Please try again.');
}

header('Location: donate.php'); exit();
