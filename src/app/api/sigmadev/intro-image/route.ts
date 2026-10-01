import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { currentUser } from "@/lib/auth";
import { execute } from "@/lib/db";
import { sameOrigin } from "@/lib/http";
import { STORAGE_FULL_MESSAGE, storageFull } from "@/lib/storage";

export const dynamic = "force-dynamic";

const SLOTS = new Set(["before", "after", "sound", "icon-arc", "icon-away"]);
const MAX_UPLOAD = 4 * 1024 * 1024;
const MAX_SOUND = 2 * 1024 * 1024;

/**
 * What kind of audio file is this, going by its first bytes (not by the name
 * or type the browser claimed)? null: not one we accept.
 */
function audioType(file: Buffer): string | null {
  const ascii = (from: number, to: number) => file.subarray(from, to).toString("latin1");
  if (ascii(0, 3) === "ID3" || (file[0] === 0xff && (file[1] & 0xe0) === 0xe0)) return "audio/mpeg";
  if (ascii(0, 4) === "OggS") return "audio/ogg";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE") return "audio/wav";
  if (ascii(4, 8) === "ftyp") return "audio/mp4";
  return null;
}

async function adminOnly(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  const user = await currentUser();
  // same answer as an address that doesn't exist
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Not found." }, { status: 404 });
  const slot = request.nextUrl.searchParams.get("slot") ?? "";
  if (!SLOTS.has(slot)) return NextResponse.json({ error: "Unknown image slot." }, { status: 400 });
  return slot;
}

/**
 * POST /api/sigmadev/intro-image?slot=before|after — a picture for the Winter Arc
 * intro. It is re-encoded here (at most 900px, WebP, transparency kept,
 * metadata dropped), so only a clean image is ever stored or shown.
 *
 * slot=sound — the intro's sound: an MP3, OGG, WAV or M4A of at most 2 MB.
 */
export async function POST(request: NextRequest) {
  const slot = await adminOnly(request);
  if (typeof slot !== "string") return slot;

  if (await storageFull()) return NextResponse.json({ error: STORAGE_FULL_MESSAGE }, { status: 507 });
  const upload = Buffer.from(await request.arrayBuffer());
  if (slot === "sound") {
    if (upload.length === 0 || upload.length > MAX_SOUND) return NextResponse.json({ error: "That sound is too large (2 MB at most). A few seconds is plenty." }, { status: 413 });
    const mime = audioType(upload);
    if (!mime) return NextResponse.json({ error: "That file isn't a sound we can play. Use an MP3, OGG, WAV or M4A." }, { status: 400 });
    await execute("INSERT INTO site_images (slot, image, mime) VALUES ('sound', ?, ?) ON CONFLICT (slot) DO UPDATE SET image = EXCLUDED.image, mime = EXCLUDED.mime, version = site_images.version + 1, updated_at = NOW()", [upload, mime]);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, bytes: upload.length });
  }
  if (upload.length === 0 || upload.length > MAX_UPLOAD) return NextResponse.json({ error: "That image is too large (4 MB at most)." }, { status: 413 });
  if (slot.startsWith("icon-")) {
    // an app or notification icon: a 512px square PNG (served in whatever size is asked for by /app-icon)
    let png: Buffer;
    try {
      png = await sharp(upload, { limitInputPixels: 50_000_000, failOn: "error" }).rotate().resize(512, 512, { fit: "cover" }).png({ compressionLevel: 9 }).toBuffer();
    } catch {
      return NextResponse.json({ error: "That file isn't an image we can read. Use a PNG or JPG." }, { status: 400 });
    }
    await execute("INSERT INTO site_images (slot, image, mime) VALUES (?, ?, 'image/png') ON CONFLICT (slot) DO UPDATE SET image = EXCLUDED.image, mime = EXCLUDED.mime, version = site_images.version + 1, updated_at = NOW()", [slot, png]);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, bytes: png.length });
  }
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
