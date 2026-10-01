import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/intro-image/after?v=3 — a Winter Arc intro picture. Signed-in users only. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slot: string }> }) {
  if (!(await currentUser())) return new NextResponse(null, { status: 401 });
  const row = await queryOne<{ image: Buffer }>("SELECT image FROM site_images WHERE slot = ?", [(await params).slot]);
  if (!row) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(row.image), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
