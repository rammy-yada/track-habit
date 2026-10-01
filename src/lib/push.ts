import "server-only";
import webpush from "web-push";
import { execute, query } from "./db";

// Push notifications: the same mechanism a native app uses to make a phone
// buzz while the app is closed. The browser gives each device an address at
// its push service (Google's, Apple's, Mozilla's…); we keep that address and
// post to it when there is something to say.
//
// Turned on by VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY (make a pair with
// `npm run push:keys`). VAPID is how the push service knows a message really
// comes from this site.

export const pushPublicKey = (): string | null => (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY ? process.env.VAPID_PUBLIC_KEY : null);

// Only real push services. A subscription is an address this server will send
// requests to, so it must never be an arbitrary URL someone typed in.
const PUSH_HOSTS = /(^|\.)(fcm\.googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)$/;

export function validPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || endpoint.length > 1000) return false;
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && PUSH_HOSTS.test(url.hostname);
  } catch {
    return false;
  }
}

export type PushMessage = {
  title: string;
  body: string;
  url: string;
  tag: string;
  /** A picture other than the app's usual icon (used by "come back" messages). */
  icon?: string;
  /** Habits still open today: shown as a number on the app's icon, where the device supports it. */
  badge?: number;
};

let configured = false;

/** Sends to every device the user has turned notifications on for. Returns how many accepted it. */
export async function sendPush(userId: number, message: PushMessage): Promise<number> {
  const publicKey = pushPublicKey();
  if (!publicKey) return 0;
  if (!configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@habitflow.app", publicKey, process.env.VAPID_PRIVATE_KEY!);
    configured = true;
  }
  const devices = await query<{ id: number; endpoint: string; p256dh: string; auth: string }>("SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?", [userId]);
  let delivered = 0;
  for (const device of devices) {
    try {
      await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, JSON.stringify(message), { TTL: 6 * 3600, timeout: 8000 });
      delivered++;
    } catch (err) {
      // 404 / 410: the app was uninstalled or notifications were switched off on that device
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await execute("DELETE FROM push_subscriptions WHERE id = ?", [device.id]);
    }
  }
  return delivered;
}
