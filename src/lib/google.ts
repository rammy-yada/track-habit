import "server-only";
import type { NextRequest } from "next/server";

// "Sign in with Google" — the standard OAuth 2.0 / OpenID Connect code flow,
// done by hand so every step is visible:
//
//   1. /auth/google           → send the browser to Google with a random `state`
//   2. Google                 → the person approves, Google sends them back with a `code`
//   3. /auth/google/callback  → check `state`, swap the `code` for their profile
//                               (server-to-server), sign them in
//
// Turned on by setting GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
// (overridable only so the flow can be tested against a stand-in server)
const TOKEN_URL = process.env.GOOGLE_TOKEN_URL ?? "https://oauth2.googleapis.com/token";

export const googleEnabled = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

/** The public address of this site, as the visitor sees it. */
export function siteOrigin(request: NextRequest): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export const googleRedirectUri = (request: NextRequest) => `${siteOrigin(request)}/auth/google/callback`;

export function googleAuthUrl(state: string, redirectUri: string): string {
  return `${AUTH_URL}?${new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile", // name and email only — nothing else is requested
    state,
    prompt: "select_account",
  })}`;
}

export type GoogleProfile = { id: string; email: string; emailVerified: boolean; name: string };

/** Swap the one-time code for the person's profile. Returns null on any failure. */
export async function googleProfile(code: string, redirectUri: string): Promise<GoogleProfile | null> {
  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const { id_token } = (await response.json()) as { id_token?: string };
    if (!id_token) return null;

    // The token came straight from Google over TLS in exchange for our client
    // secret, so its contents can be trusted; we still check it is meant for us.
    const claims = JSON.parse(Buffer.from(id_token.split(".")[1], "base64url").toString("utf8"));
    const issuerOk = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
    if (!issuerOk || claims.aud !== process.env.GOOGLE_CLIENT_ID || claims.exp * 1000 < Date.now()) return null;
    if (typeof claims.sub !== "string" || typeof claims.email !== "string") return null;

    return { id: claims.sub, email: claims.email.toLowerCase(), emailVerified: claims.email_verified === true, name: typeof claims.name === "string" ? claims.name : "" };
  } catch {
    return null;
  }
}
