import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { googleAuthUrl, googleEnabled, googleRedirectUri } from "@/lib/google";
import { getSession } from "@/lib/session";
import { isValidTimezone } from "@/lib/validation";

export const dynamic = "force-dynamic";

// Step 1: remember a random `state` in the session, then hand the browser to
// Google. Google echoes `state` back; the callback refuses any reply that
// doesn't carry it, which stops a forged "you're signed in" link.
export async function GET(request: NextRequest) {
  if (!googleEnabled()) return NextResponse.redirect(new URL("/login?error=google_off", request.url));

  const timezone = request.nextUrl.searchParams.get("tz") ?? "";
  const session = await getSession();
  session.oauthState = randomBytes(24).toString("base64url");
  session.oauthTimezone = isValidTimezone(timezone) ? timezone : "UTC";
  session.joinArc = request.nextUrl.searchParams.get("join") === "arc" || undefined;
  await session.save();
  return NextResponse.redirect(googleAuthUrl(session.oauthState, googleRedirectUri(request)));
}
