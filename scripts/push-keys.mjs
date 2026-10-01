// Prints a fresh pair of keys for push notifications:
//
//   npm run push:keys
//
// Add the three lines it prints to your hosting provider's environment
// variables (and to .env.local to try it locally). Make them once and keep
// them: changing the keys disconnects every device that turned notifications on.

import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:you@example.com   # an address the push services can reach you at`);
