import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { toId } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** GET /shop/image/3?v=2 — a product's picture. Signed-in people only, like the section it is shown in. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentUser())) return new NextResponse(null, { status: 401 });
  const id = toId((await params).id);
  const row = id ? await queryOne<{ image: Buffer }>("SELECT image FROM site_images WHERE slot = ?", [`product-${id}`]) : null;
  if (!row) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(row.image), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
}
