import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { currentUser } from "@/lib/auth";
import { execute, queryOne } from "@/lib/db";
import { sameOrigin } from "@/lib/http";
import { STORAGE_FULL_MESSAGE, storageFull } from "@/lib/storage";
import { toId } from "@/lib/validation";

export const dynamic = "force-dynamic";

const MAX_UPLOAD = 6 * 1024 * 1024;

async function adminPost(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  const user = await currentUser();
  // same answer as an address that doesn't exist
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Not found." }, { status: 404 });
  const id = toId(request.nextUrl.searchParams.get("id"));
  if (!id || !(await queryOne("SELECT id FROM blog_posts WHERE id = ?", [id]))) return NextResponse.json({ error: "Save the post first, then add its picture." }, { status: 400 });
  return id;
}

/**
 * POST /api/sigmadev/post-cover?id=12 — a blog post's cover picture. It is
 * re-encoded here: cropped to 1200×630 (the shape link previews use), WebP,
 * metadata dropped — so only a clean, light image is ever stored or served.
 */
export async function POST(request: NextRequest) {
  const id = await adminPost(request);
  if (typeof id !== "number") return id;
  if (await storageFull()) return NextResponse.json({ error: STORAGE_FULL_MESSAGE }, { status: 507 });
  const upload = Buffer.from(await request.arrayBuffer());
  if (upload.length === 0 || upload.length > MAX_UPLOAD) return NextResponse.json({ error: "That image is too large (6 MB at most)." }, { status: 413 });
  let webp: Buffer;
  try {
    webp = await sharp(upload, { limitInputPixels: 50_000_000, failOn: "error" }).rotate().resize(1200, 630, { fit: "cover", position: "attention" }).webp({ quality: 80 }).toBuffer();
  } catch {
    return NextResponse.json({ error: "That file isn't an image we can read. Use a JPG, PNG or WebP." }, { status: 400 });
  }
  await execute("INSERT INTO site_images (slot, image, mime) VALUES (?, ?, 'image/webp') ON CONFLICT (slot) DO UPDATE SET image = EXCLUDED.image, mime = EXCLUDED.mime, updated_at = NOW()", [`post-${id}`, webp]);
  const updated = await execute<{ cover_version: number }>("UPDATE blog_posts SET cover_version = cover_version + 1 WHERE id = ? RETURNING cover_version", [id]);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, url: `/blog/cover/${id}?v=${updated.rows[0].cover_version}`, bytes: webp.length });
}

export async function DELETE(request: NextRequest) {
  const id = await adminPost(request);
  if (typeof id !== "number") return id;
  await execute("DELETE FROM site_images WHERE slot = ?", [`post-${id}`]);
  await execute("UPDATE blog_posts SET cover_version = 0 WHERE id = ?", [id]);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
