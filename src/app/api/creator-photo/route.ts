import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/creator-photo — the profile photo of the person who runs the site
 * (the longest-standing administrator who has one), shown on the Support
 * page. Signed-in people only. 404 when there is none: the page then shows a
 * heart instead.
 */
export async function GET() {
  if (!(await currentUser())) return new NextResponse(null, { status: 401 });
  const row = await queryOne<{ image: Buffer }>("SELECT a.image FROM avatars a JOIN users u ON u.id = a.user_id WHERE u.role = 'admin' AND u.is_active = 1 ORDER BY u.id LIMIT 1");
  if (!row) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(row.image), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" } });
}
