import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { currentUser } from "@/lib/auth";
import { execute, queryOne } from "@/lib/db";
import { DECOR_MAX_ITEMS, DECOR_SCENES } from "@/lib/decor-shared";
import { sameOrigin } from "@/lib/http";
import { STORAGE_FULL_MESSAGE, storageFull } from "@/lib/storage";

export const dynamic = "force-dynamic";

const MAX_UPLOAD = 4 * 1024 * 1024;

/**
 * POST /api/sigmadev/decor-image — a picture for Admin → Design. It is
 * re-encoded here (at most 1200px, WebP, transparency kept, metadata
 * dropped) and stored under a new id, which is what the answer carries.
 * It only shows on a page once the layout that places it is saved.
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  const user = await currentUser();
  // same answer as an address that doesn't exist
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (await storageFull()) return NextResponse.json({ error: STORAGE_FULL_MESSAGE }, { status: 507 });

  // room for every placed picture plus a few not yet saved, and no more
  const held = await queryOne<{ n: number | string }>("SELECT COUNT(*) AS n FROM site_images WHERE slot LIKE 'd-%'");
  if (Number(held?.n ?? 0) >= DECOR_MAX_ITEMS * DECOR_SCENES.length + 12) return NextResponse.json({ error: "Too many pictures are stored. Save the design (this clears unused ones) and try again." }, { status: 409 });

  const upload = Buffer.from(await request.arrayBuffer());
  if (upload.length === 0 || upload.length > MAX_UPLOAD) return NextResponse.json({ error: "That image is too large (4 MB at most)." }, { status: 413 });
  let webp: Buffer;
  let size: { width: number; height: number };
  try {
    const result = await sharp(upload, { limitInputPixels: 50_000_000, failOn: "error" }).rotate().resize(1200, 1200, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82, alphaQuality: 85, effort: 6, smartSubsample: true }).toBuffer({ resolveWithObject: true });
    webp = result.data;
    size = { width: result.info.width, height: result.info.height };
  } catch {
    return NextResponse.json({ error: "That file isn't an image we can read. Use a PNG, JPG or WebP." }, { status: 400 });
  }
  const id = `d-${randomBytes(4).toString("hex")}`;
  await execute("INSERT INTO site_images (slot, image, mime) VALUES (?, ?, 'image/webp')", [id, webp]);
  return NextResponse.json({ ok: true, id, ...size, bytes: webp.length });
}
