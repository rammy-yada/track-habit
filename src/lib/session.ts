import "server-only";
import { cookies, headers } from "next/headers";
import { getIronSession, type IronSession } from "iron-session";

// What PHP kept in $_SESSION now lives in one encrypted, tamper-proof cookie.
export type SessionData = {
  userId?: number;
  /** When this sign-in happened or was last renewed (milliseconds). */
  at?: number;
  /** Fingerprint of the password this sign-in was made with (see passwordStamp in auth.ts). */
  pw?: string;
  /** A registration waiting on its verification code. */
  pendingReg?: {
    username: string;
    email: string;
    passwordHash: string;
    fullName: string;
    timezone: string;
    color: string;
  };
  /** No mail server in this project, so the code is shown on screen instead. */
  devOtp?: string;
  /** "Sign in with Google" in progress: the value Google must echo back. */
  oauthState?: string;
  oauthTimezone?: string;
  /** Came from the Winter Arc page: after signing in or up, continue to the join steps. */
  joinArc?: boolean;
};

// How long a sign-in lasts.
//
// A member stays signed in for 90 days, and every day the app is used that
// period starts again (see /api/version) — so someone who uses the app is
// never signed out, the way a phone app behaves.
//
// An administrator is signed out 8 hours after signing in, with no renewal:
// an admin session left open on a shared or lost device must not stay usable.
export const SESSION_LIFETIME = 60 * 60 * 24 * 90;
export const MEMBER_SESSION_MS = SESSION_LIFETIME * 1000;
export const ADMIN_SESSION_MS = 8 * 60 * 60 * 1000;
export const RENEW_AFTER_MS = 24 * 60 * 60 * 1000;

function sessionPassword(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET is missing or shorter than 32 characters — copy .env.example to .env.local and set it.");
  }
  return secret;
}

export async function getSession(): Promise<IronSession<SessionData>> {
  // Mark the cookie Secure whenever the request really arrived over HTTPS.
  // (Hard-coding it on would break sign-in on plain http://localhost in Safari.)
  const overHttps = ((await headers()).get("x-forwarded-proto") ?? "").split(",")[0].trim() === "https";
  return getIronSession<SessionData>(await cookies(), {
    password: sessionPassword(),
    cookieName: "habitflow_session",
    ttl: SESSION_LIFETIME,
    cookieOptions: {
      httpOnly: true,
      // Lax: sent on normal link navigation into the app, withheld from
      // cross-site POSTs and embeds.
      sameSite: "lax",
      secure: overHttps,
      path: "/",
    },
  });
}
