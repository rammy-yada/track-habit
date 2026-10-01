import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/intro-image/after?v=3 — a Winter Arc intro picture (or, for slot "sound", its sound). Signed-in users only. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slot: string }> }) {
  if (!(await currentUser())) return new NextResponse(null, { status: 401 });
  const { slot } = await params;
  // only the opening scene's own files: blog covers and icons have their own, public, routes
  const row = ["before", "after", "sound"].includes(slot) ? await queryOne<{ image: Buffer; mime: string }>("SELECT image, mime FROM site_images WHERE slot = ?", [slot]) : null;
  if (!row) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(row.image), {
    headers: { "Content-Type": row.mime, "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
