import "server-only";
import { cookies, headers } from "next/headers";
import { getIronSession, type IronSession } from "iron-session";

// What PHP kept in $_SESSION now lives in one encrypted, tamper-proof cookie.
export type SessionData = {
  userId?: number;
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
};

export const SESSION_LIFETIME = 60 * 60 * 24; // 24 hours

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
