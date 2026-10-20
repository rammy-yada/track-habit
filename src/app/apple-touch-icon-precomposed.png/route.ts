import { NextResponse } from "next/server";
import { logoPng } from "@/lib/logo-image";

export const dynamic = "force-dynamic";

/** The address an iPhone asks for on its own when a page names no home-screen icon: the uploaded logo on white (an iPhone paints see-through parts black), or the built-in icon. */
export async function GET() {
  const png = await logoPng(180, { background: "#ffffff" });
  if (!png) return new NextResponse(null, { status: 307, headers: { Location: "/apple-icon.png", "Cache-Control": "no-cache" } });
  return new NextResponse(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
}
