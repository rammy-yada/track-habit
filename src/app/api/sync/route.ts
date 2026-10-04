import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { currentUser, profileComplete } from "@/lib/auth";
import { setHabitDone } from "@/lib/habit-log";
import { sameOrigin } from "@/lib/http";
import { overLimit } from "@/lib/throttle";

export const dynamic = "force-dynamic";

type Op = { habitId: unknown; date: unknown; done: unknown };

/**
 * POST /api/sync — applies habit ticks made on the device, including ones
 * made while offline and sent later.
 *
 * This is a plain, stable endpoint on purpose: a change queued by an older
 * version of the app must still be accepted after the site has been updated.
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });

  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!profileComplete(user)) return NextResponse.json({ error: "Finish setting up your profile first." }, { status: 403 });

  // generous (an app syncing normally sends a handful), but a loop hammering it is stopped
  if (await overLimit(`sync:${user.id}`, 300, 10)) return NextResponse.json({ error: "Too many requests. Please wait a while and try again." }, { status: 429 });
  let ops: Op[];
  try {
    ops = (await request.json()).ops;
    if (!Array.isArray(ops) || ops.length > 500) throw new Error("bad ops");
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const results = [];
  for (const op of ops) {
    const result = await setHabitDone(user, op?.habitId, op?.done === true, op?.date);
    results.push({ key: `${op?.habitId}:${op?.date}`, ...result });
  }
  if (results.some((r) => r.ok)) revalidatePath("/", "layout");
  return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
}
