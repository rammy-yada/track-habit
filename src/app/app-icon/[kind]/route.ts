import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

// the built-in pictures, used until an admin uploads their own
const BUILT_IN: Record<string, (size: number, maskable: boolean) => string> = {
  arc: (size, maskable) => (maskable ? "/icons/arc-maskable-512.png" : size <= 180 ? "/icons/arc-apple.png" : size <= 192 ? "/icons/arc-192.png" : "/icons/arc-512.png"),
  away: () => "/icons/away-192.png",
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
    if (request.cookies.get("hf_icon")?.value !== "arc") return new NextResponse(null, { status: 307, headers: { Location: size <= 180 ? "/apple-icon.png" : size <= 192 ? "/icons/icon-192.png" : "/icons/icon-512.png", "Cache-Control": "no-cache" } });
    kind = "arc";
  }
  if (!(kind in BUILT_IN)) return new NextResponse(null, { status: 404 });
  const row = await queryOne<{ image: Buffer }>("SELECT image FROM site_images WHERE slot = ?", [`icon-${kind}`]);
  // a relative address: the built-in file on this same site, whatever name the site is reached by
  if (!row) return new NextResponse(null, { status: 307, headers: { Location: BUILT_IN[kind](size, maskable), "Cache-Control": "no-cache" } }); // not remembered: an icon uploaded a minute from now must show up

  const inner = maskable ? Math.round(size * 0.78) : size;
  let image = sharp(row.image).resize(inner, inner, { fit: "cover" });
  if (maskable) {
    const pad = Math.floor((size - inner) / 2);
    image = image.extend({ top: pad, bottom: size - inner - pad, left: pad, right: size - inner - pad, background: "#050505" });
  }
  return new NextResponse(new Uint8Array(await image.png().toBuffer()), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
