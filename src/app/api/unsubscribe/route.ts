import { NextResponse, type NextRequest } from "next/server";
import { execute } from "@/lib/db";
import { siteOrigin } from "@/lib/google";
import { validUnsubscribe } from "@/lib/mail";
import { toId } from "@/lib/validation";

export const dynamic = "force-dynamic";

// The "Turn reminders off" link in an email. It works without signing in; the
// signature in the link is what proves it came from an email we sent that person.
async function handle(request: NextRequest) {
  const userId = toId(request.nextUrl.searchParams.get("u"));
  const key = request.nextUrl.searchParams.get("k") ?? "";
  const ok = userId !== null && validUnsubscribe(userId, key);
  if (ok) await execute("UPDATE users SET email_reminders = 0 WHERE id = ?", [userId]);
  return NextResponse.redirect(new URL(`/unsubscribed${ok ? "" : "?invalid=1"}`, siteOrigin(request)), 303);
}

export const GET = handle;
export const POST = handle; // mail apps' one-click "Unsubscribe" button posts
