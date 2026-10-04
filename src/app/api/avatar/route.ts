import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { currentUser } from "@/lib/auth";
import { execute } from "@/lib/db";
import { sameOrigin } from "@/lib/http";
import { STORAGE_FULL_MESSAGE, storageFull } from "@/lib/storage";
import { overLimit } from "@/lib/throttle";

export const dynamic = "force-dynamic";

const MAX_UPLOAD = 3 * 1024 * 1024; // the browser shrinks the photo first, so real uploads are far smaller
const SIZE = 256;

/**
 * POST /api/avatar — set the signed-in user's profile photo.
 *
 * Whatever is uploaded is decoded and re-encoded here: cropped to a square,
 * resized to 256px, converted to WebP, metadata (location, camera) dropped.
 * Only that clean copy is stored, so a file that isn't really an image, or
 * hides something in one, never reaches the database or another user.
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  // re-encoding a picture is real work for the server: 20 an hour is plenty for a person, and no use to a script
  if (await overLimit(`avatar:${user.id}`, 20, 60)) return NextResponse.json({ error: "Too many requests. Please wait a while and try again." }, { status: 429 });
  if (await storageFull()) return NextResponse.json({ error: STORAGE_FULL_MESSAGE }, { status: 507 });
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD) return NextResponse.json({ error: "That image is too large." }, { status: 413 });
  const upload = Buffer.from(await request.arrayBuffer());
  if (upload.length === 0 || upload.length > MAX_UPLOAD) return NextResponse.json({ error: "That image is too large." }, { status: 413 });

  let webp: Buffer;
  try {
    webp = await sharp(upload, { limitInputPixels: 50_000_000, failOn: "error" })
      .rotate() // honour the phone's orientation flag before it is dropped
      .resize(SIZE, SIZE, { fit: "cover", position: "attention" })
      // quality 76 at "effort 6" (the slowest, smallest setting): a face at this size comes out around 6–12 KB
      .webp({ quality: 76, effort: 6, smartSubsample: true })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "That file isn't an image we can read. Try a JPG or PNG." }, { status: 400 });
  }

  await execute("INSERT INTO avatars (user_id, image) VALUES (?, ?) ON CONFLICT (user_id) DO UPDATE SET image = EXCLUDED.image, updated_at = NOW()", [user.id, webp]);
  const updated = await execute<{ avatar_version: number }>("UPDATE users SET avatar_version = avatar_version + 1 WHERE id = ? RETURNING avatar_version", [user.id]);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, version: updated.rows[0].avatar_version, bytes: webp.length });
}

/** DELETE /api/avatar — go back to the coloured initial. */
export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  await execute("DELETE FROM avatars WHERE user_id = ?", [user.id]);
  await execute("UPDATE users SET avatar_version = 0 WHERE id = ?", [user.id]);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
