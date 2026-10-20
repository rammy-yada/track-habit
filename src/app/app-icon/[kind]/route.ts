import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { queryOne } from "@/lib/db";
import { badgePng } from "@/lib/logo-image";

export const dynamic = "force-dynamic";

// the built-in pictures, used until an admin uploads their own
const BUILT_IN: Record<string, (size: number, maskable: boolean) => string> = {
  arc: (size, maskable) => (maskable ? "/icons/arc-maskable-512.png" : size <= 180 ? "/icons/arc-apple.png" : size <= 192 ? "/icons/arc-192.png" : "/icons/arc-512.png"),
  away: () => "/icons/away-192.png",
  // the one-colour mark in Android's status bar
  badge: () => "/icons/badge-96.png",
  // the site's own logo (Admin → Design → Logo)
  logo: (size, maskable) => (maskable ? "/icons/maskable-512.png" : size <= 180 ? "/apple-icon.png" : size <= 192 ? "/icons/icon-192.png" : "/icons/icon-512.png"),
};

/**
 * GET /app-icon/arc?s=192 — the Winter Arc app icon; /app-icon/away — the icon
 * on "come back" notifications. An admin can replace either (Admin →
 * Notifications); otherwise the request is passed on to the built-in file.
 * Public: an install manifest is fetched without a sign-in, and an icon is
 * nothing secret. `m=1` asks for the "maskable" kind, with room around the
 * drawing for the phone to cut it into its own shape.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  let { kind } = await params;
  const size = Math.min(512, Math.max(48, Number(request.nextUrl.searchParams.get("s")) || 192));
  const maskable = request.nextUrl.searchParams.get("m") === "1";
  // "current": whichever icon this device's account uses (remembered in a cookie by the app)
  if (kind === "current") {
    kind = request.cookies.get("hf_icon")?.value === "arc" ? "arc" : "logo";
  }
  if (!(kind in BUILT_IN)) return new NextResponse(null, { status: 404 });
  if (kind === "badge") {
    const png = await badgePng(96);
    if (!png) return new NextResponse(null, { status: 307, headers: { Location: BUILT_IN.badge(96, false), "Cache-Control": "no-cache" } });
    return new NextResponse(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  }
  let row = await queryOne<{ image: Buffer }>("SELECT image FROM site_images WHERE slot = ?", [`icon-${kind}`]);
  // An uploaded logo is the app's icon for everyone: with no Winter Arc (or
  // "come back") icon of its own uploaded, that icon is the logo too, not the built-in one.
  if (!row && (kind === "arc" || kind === "away")) {
    row = await queryOne<{ image: Buffer }>("SELECT image FROM site_images WHERE slot = 'icon-logo'");
    if (row) kind = "logo";
  }
  // a relative address: the built-in file on this same site, whatever name the site is reached by
  if (!row) return new NextResponse(null, { status: 307, headers: { Location: BUILT_IN[kind](size, maskable), "Cache-Control": "no-cache" } }); // not remembered: an icon uploaded a minute from now must show up

  const logo = kind === "logo";
  // What goes around and behind a logo: its own background colour when it has
  // one (read from its corner), white when the corner is see-through.
  let backdrop = "#050505";
  let seeThrough = false;
  if (logo) {
    const corner = await sharp(row.image).extract({ left: 0, top: 0, width: 2, height: 2 }).ensureAlpha().raw().toBuffer();
    seeThrough = corner[3] < 128;
    backdrop = seeThrough ? "#ffffff" : `#${[corner[0], corner[1], corner[2]].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  }
  // "maskable": the phone cuts the icon into its own shape, so the drawing is made smaller with room around it
  const inner = maskable ? Math.round(size * (seeThrough ? 0.66 : 0.78)) : size;
  let image = sharp(row.image).resize(inner, inner, logo ? { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } } : { fit: "cover" });
  if (maskable) {
    const pad = Math.floor((size - inner) / 2);
    image = image.extend({ top: pad, bottom: size - inner - pad, left: pad, right: size - inner - pad, background: backdrop });
  }
  // an iPhone paints see-through parts of a home-screen icon black, so that size gets a solid backdrop as well
  if (logo && (maskable || size <= 180)) image = image.flatten({ background: backdrop });
  return new NextResponse(new Uint8Array(await image.png().toBuffer()), {
    // an address that names the upload ("v=") never changes what it shows
    headers: { "Content-Type": "image/png", "Cache-Control": request.nextUrl.searchParams.has("v") ? "public, max-age=31536000, immutable" : "public, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
