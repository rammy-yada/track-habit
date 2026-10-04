import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { execute } from "@/lib/db";
import { sameOrigin } from "@/lib/http";
import { overLimit } from "@/lib/throttle";
import { pushPublicKey, validPushEndpoint } from "@/lib/push";

export const dynamic = "force-dynamic";

async function who(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  const user = await currentUser();
  return user ?? NextResponse.json({ error: "Not signed in." }, { status: 401 });
}

/** POST /api/push — remember this device so it can be sent notifications. */
export async function POST(request: NextRequest) {
  const user = await who(request);
  if (user instanceof NextResponse) return user;
  if (!pushPublicKey()) return NextResponse.json({ error: "Notifications aren't set up on this site." }, { status: 503 });

  if (await overLimit(`push:${user.id}`, 20, 60)) return NextResponse.json({ error: "Too many requests. Please wait a while and try again." }, { status: 429 });
  const body = await request.json().catch(() => null);
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (!validPushEndpoint(body?.endpoint) || typeof p256dh !== "string" || typeof auth !== "string" || p256dh.length > 200 || auth.length > 100) {
    return NextResponse.json({ error: "That isn't a notification address we recognise." }, { status: 400 });
  }
  // a device belongs to whoever signed in on it last
  await execute("INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?) ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth", [user.id, body.endpoint, p256dh, auth]);
  return NextResponse.json({ ok: true });
}

/** DELETE /api/push — stop notifying this device. */
export async function DELETE(request: NextRequest) {
  const user = await who(request);
  if (user instanceof NextResponse) return user;
  const body = await request.json().catch(() => null);
  if (typeof body?.endpoint === "string") await execute("DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?", [body.endpoint, user.id]);
  return NextResponse.json({ ok: true });
}
