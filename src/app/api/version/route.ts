import { after, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { SITE_URL } from "@/lib/site";
import { getSession, RENEW_AFTER_MS } from "@/lib/session";
import { maybeRunReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Which build is the server running? The app polls this to detect an update.
 * Because every open app calls it every few minutes, it doubles as the
 * back-up trigger for reminders (after the answer has gone out).
 */
export async function GET() {
  // Keeps a member signed in: once a day, while the app is in use, their
  // sign-in is renewed for another 90 days. (This is a route handler, one of
  // the few places a cookie can be re-issued.) Never for an administrator.
  try {
    const session = await getSession();
    if (session.userId && Date.now() - (session.at ?? 0) > RENEW_AFTER_MS) {
      const user = await currentUser();
      if (user && user.role !== "admin") {
        session.at = Date.now();
        await session.save();
      }
    }
  } catch {}
  // the site's fixed address, never the request's: anyone can call this, and the links in reminder emails are built from it
  after(() => maybeRunReminders(SITE_URL).catch(() => {}));
  return NextResponse.json({ build: process.env.NEXT_PUBLIC_BUILD_ID }, { headers: { "Cache-Control": "no-store" } });
}
