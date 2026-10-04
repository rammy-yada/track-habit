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

// Values pasted into a hosting dashboard often arrive with quotes, spaces or
// a trailing "# comment" still attached; those are stripped here.
const tidy = (value: string | undefined) => (value ?? "").replace(/\s+#.*$/, "").trim().replace(/^(["'])(.*)\1$/, "$2").trim();
const publicKey = () => tidy(process.env.VAPID_PUBLIC_KEY);
const privateKey = () => tidy(process.env.VAPID_PRIVATE_KEY);
/** The contact address push services ask for. Anything that isn't a mailto:/https: address is turned into one, or replaced. */
function subject(): string {
  const value = tidy(process.env.VAPID_SUBJECT);
  if (/^(mailto:\S+@\S+|https:\/\/\S+)$/.test(value)) return value;
  if (/^\S+@\S+\.\S+$/.test(value)) return `mailto:${value}`;
  return "mailto:admin@habitflow.app";
}

export const pushPublicKey = (): string | null => (publicKey() && privateKey() ? publicKey() : null);

let configured = false;
let problem: string | null = null;
/**
 * Hands the keys to the push library, once. If they are not a valid pair it
 * says why (shown in Admin → Notifications and in the scheduler's answer)
 * instead of throwing, so a bad setting can never take the reminders down.
 */
export function pushProblem(): string | null {
  if (configured || problem) return problem;
  if (!pushPublicKey()) return (problem = "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set.");
  try {
    webpush.setVapidDetails(subject(), publicKey(), privateKey());
    configured = true;
  } catch (err) {
    problem = `The VAPID keys aren't valid: ${(err as Error).message}. Run "npm run push:keys" and paste the two keys again, without quotes.`;
  }
  return problem;
}

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

/** Why the most recent delivery failed, if one did (for diagnosis). */
export let lastPushError: string | null = null;

/** Sends to every device the user has turned notifications on for. Returns how many accepted it. */
export async function sendPush(userId: number, message: PushMessage): Promise<number> {
  if (pushProblem()) return 0;
  const devices = await query<{ id: number; endpoint: string; p256dh: string; auth: string }>("SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?", [userId]);
  let delivered = 0;
  for (const device of devices) {
    try {
      await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, JSON.stringify(message), { TTL: 6 * 3600, timeout: 8000 });
      delivered++;
    } catch (err) {
      // 404 / 410: the app was uninstalled or notifications were switched off on that device
      const status = (err as { statusCode?: number }).statusCode;
      lastPushError = `${status ?? ""} ${(err as { body?: string; message?: string }).body ?? (err as Error).message ?? ""}`.trim().slice(0, 200);
      if (status === 404 || status === 410) await execute("DELETE FROM push_subscriptions WHERE id = ?", [device.id]);
    }
  }
  return delivered;
}
