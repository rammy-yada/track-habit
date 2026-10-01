import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { toId } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * GET /api/avatar/12?v=3 — a profile photo. Members can see their own and
 * those of people on the Winter Arc leaderboard (who chose to be listed);
 * only an administrator can see everyone's.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await currentUser();
  if (!viewer) return new NextResponse(null, { status: 401 });
  const id = toId((await params).id);
  if (id && id !== viewer.id && viewer.role !== "admin" && !(await queryOne("SELECT 1 AS ok FROM winter_arc_members WHERE user_id = ? LIMIT 1", [id]))) {
    return new NextResponse(null, { status: 404 }); // same answer as "no photo": doesn't confirm the account exists
  }
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
