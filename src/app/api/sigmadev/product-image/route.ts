import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { currentUser } from "@/lib/auth";
import { execute, queryOne } from "@/lib/db";
import { sameOrigin } from "@/lib/http";
import { STORAGE_FULL_MESSAGE, storageFull } from "@/lib/storage";
import { toId } from "@/lib/validation";

export const dynamic = "force-dynamic";

async function adminProduct(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Not found." }, { status: 404 }); // same answer as an address that doesn't exist
  const id = toId(request.nextUrl.searchParams.get("id"));
  if (!id || !(await queryOne("SELECT id FROM products WHERE id = ?", [id]))) return NextResponse.json({ error: "Save the product first, then add its picture." }, { status: 400 });
  return id;
}

/** POST /api/sigmadev/product-image?id=3 — a product's picture: re-encoded to an 800px square WebP, metadata dropped. */
export async function POST(request: NextRequest) {
  const id = await adminProduct(request);
  if (typeof id !== "number") return id;
  if (await storageFull()) return NextResponse.json({ error: STORAGE_FULL_MESSAGE }, { status: 507 });
  const upload = Buffer.from(await request.arrayBuffer());
  if (upload.length === 0 || upload.length > 6 * 1024 * 1024) return NextResponse.json({ error: "That image is too large (6 MB at most)." }, { status: 413 });
  let webp: Buffer;
  try {
    webp = await sharp(upload, { limitInputPixels: 50_000_000, failOn: "error" }).rotate().resize(800, 800, { fit: "cover", position: "attention" }).webp({ quality: 80 }).toBuffer();
  } catch {
    return NextResponse.json({ error: "That file isn't an image we can read. Use a JPG, PNG or WebP." }, { status: 400 });
  }
  await execute("INSERT INTO site_images (slot, image, mime) VALUES (?, ?, 'image/webp') ON CONFLICT (slot) DO UPDATE SET image = EXCLUDED.image, mime = EXCLUDED.mime, updated_at = NOW()", [`product-${id}`, webp]);
  const updated = await execute<{ image_version: number }>("UPDATE products SET image_version = image_version + 1 WHERE id = ? RETURNING image_version", [id]);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, url: `/shop/image/${id}?v=${updated.rows[0].image_version}` });
}

export async function DELETE(request: NextRequest) {
  const id = await adminProduct(request);
  if (typeof id !== "number") return id;
  await execute("DELETE FROM site_images WHERE slot = ?", [`product-${id}`]);
  await execute("UPDATE products SET image_version = 0 WHERE id = ?", [id]);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
