import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { toId } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** GET /api/avatar/12?v=3 — a user's profile photo. Signed-in users only. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentUser())) return new NextResponse(null, { status: 401 });
  const id = toId((await params).id);
  const row = id ? await queryOne<{ image: Buffer }>("SELECT image FROM avatars WHERE user_id = ?", [id]) : null;
  if (!row) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(row.image), {
    headers: {
      "Content-Type": "image/webp",
      // the ?v= in the address changes whenever the photo does, so this copy never goes stale
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
