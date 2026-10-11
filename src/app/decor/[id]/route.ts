import { NextResponse, type NextRequest } from "next/server";
import { queryOne } from "@/lib/db";
import { DECOR_ID } from "@/lib/decor-shared";

export const dynamic = "force-dynamic";

/** GET /decor/d-1a2b3c4d — a picture placed on a public page from Admin → Design. Each id is one picture for ever, so it can be cached for good. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = DECOR_ID.test(id) ? await queryOne<{ image: Buffer; mime: string }>("SELECT image, mime FROM site_images WHERE slot = ?", [id]) : null;
  if (!row) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(row.image), {
    headers: { "Content-Type": row.mime, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
