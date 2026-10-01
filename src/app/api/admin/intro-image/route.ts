import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { currentUser } from "@/lib/auth";
import { execute } from "@/lib/db";
import { sameOrigin } from "@/lib/http";

export const dynamic = "force-dynamic";

const SLOTS = new Set(["before", "after"]);
const MAX_UPLOAD = 4 * 1024 * 1024;

async function adminOnly(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const slot = request.nextUrl.searchParams.get("slot") ?? "";
  if (!SLOTS.has(slot)) return NextResponse.json({ error: "Unknown image slot." }, { status: 400 });
  return slot;
}

/**
 * POST /api/admin/intro-image?slot=before|after — a picture for the Winter Arc
 * intro. It is re-encoded here (at most 900px, WebP, transparency kept,
 * metadata dropped), so only a clean image is ever stored or shown.
 */
export async function POST(request: NextRequest) {
  const slot = await adminOnly(request);
  if (typeof slot !== "string") return slot;

  const upload = Buffer.from(await request.arrayBuffer());
  if (upload.length === 0 || upload.length > MAX_UPLOAD) return NextResponse.json({ error: "That image is too large (4 MB at most)." }, { status: 413 });
  let webp: Buffer;
  try {
    webp = await sharp(upload, { limitInputPixels: 50_000_000, failOn: "error" }).rotate().resize(900, 900, { fit: "inside", withoutEnlargement: true }).webp({ quality: 86, alphaQuality: 90 }).toBuffer();
  } catch {
    return NextResponse.json({ error: "That file isn't an image we can read. Use a PNG, JPG or WebP." }, { status: 400 });
  }
  await execute("INSERT INTO site_images (slot, image) VALUES (?, ?) ON CONFLICT (slot) DO UPDATE SET image = EXCLUDED.image, version = site_images.version + 1, updated_at = NOW()", [slot, webp]);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, bytes: webp.length });
}

export async function DELETE(request: NextRequest) {
  const slot = await adminOnly(request);
  if (typeof slot !== "string") return slot;
  await execute("DELETE FROM site_images WHERE slot = ?", [slot]);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
