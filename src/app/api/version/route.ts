import { after, NextResponse, type NextRequest } from "next/server";
import { siteOrigin } from "@/lib/google";
import { maybeRunReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Which build is the server running? The app polls this to detect an update.
 * Because every open app calls it every few minutes, it doubles as the
 * back-up trigger for reminders (after the answer has gone out).
 */
export function GET(request: NextRequest) {
  const origin = siteOrigin(request);
  after(() => maybeRunReminders(origin).catch(() => {}));
  return NextResponse.json({ build: process.env.NEXT_PUBLIC_BUILD_ID }, { headers: { "Cache-Control": "no-store" } });
}
