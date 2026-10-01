import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { setHabitDone } from "@/lib/habit-log";
import { sameOrigin } from "@/lib/http";

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
