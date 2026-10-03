import { NextResponse, type NextRequest } from "next/server";
import { siteOrigin } from "@/lib/google";
import { runReminders } from "@/lib/reminders";
import { safeEqual } from "@/lib/safe-equal";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  return secret.length >= 16 && safeEqual(given, secret);
}

/**
 * GET /api/cron/reminders — called by a scheduler (see
 * .github/workflows/reminders.yml) with `Authorization: Bearer CRON_SECRET`.
 * What is sent, and when, is in src/lib/reminders.ts.
 */
export async function GET(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  // `at` and `dry` exist for testing: pretend it is another time / only count, don't send
  const atParam = request.nextUrl.searchParams.get("at");
  const now = atParam && !Number.isNaN(Date.parse(atParam)) ? new Date(atParam) : new Date();
  return NextResponse.json(await runReminders({ origin: siteOrigin(request), now, dry: request.nextUrl.searchParams.get("dry") === "1" }));
}
