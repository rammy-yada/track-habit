import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { toId } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * GET /blog/cover/12?v=3 — a post's cover picture. Public once the post is
 * published, like the post itself; while it is a draft only an administrator
 * (who is editing it) can see it.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = toId((await params).id);
  const row = id ? await queryOne<{ image: Buffer; published: number }>("SELECT i.image, p.published FROM site_images i JOIN blog_posts p ON p.id = ? WHERE i.slot = ?", [id, `post-${id}`]) : null;
  if (!row || (row.published !== 1 && (await currentUser())?.role !== "admin")) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(row.image), {
    // the ?v= in the address changes whenever the picture does, so a published copy never goes stale
    headers: { "Content-Type": "image/webp", "Cache-Control": row.published === 1 ? "public, max-age=31536000, immutable" : "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
