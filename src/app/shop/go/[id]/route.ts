import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { execute } from "@/lib/db";
import { siteOrigin } from "@/lib/google";
import { toId } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * GET /shop/go/3 — what the Buy button opens: counts the tap (so the admin
 * can see which products people are interested in), then sends the person on
 * to where the product is sold. The address comes from the database, never
 * from the link, so this can't be used to redirect anyone anywhere else.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const home = new URL("/popular", siteOrigin(request));
  if (!(await currentUser())) return NextResponse.redirect(new URL("/login", siteOrigin(request)));
  const id = toId((await params).id);
  const hit = id ? await execute<{ url: string }>("UPDATE products SET clicks = clicks + 1 WHERE id = ? AND is_active = 1 RETURNING url", [id]) : null;
  const url = hit?.rows[0]?.url;
  return NextResponse.redirect(url && /^https:\/\//i.test(url) ? url : home, 302);
}
