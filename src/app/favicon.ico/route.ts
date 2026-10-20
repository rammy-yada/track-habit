import { NextResponse } from "next/server";
import { logoPng } from "@/lib/logo-image";

export const dynamic = "force-dynamic";

/** /favicon.ico — asked for by browsers and search engines on their own: the uploaded logo, or the built-in icon. */
export async function GET() {
  const png = await logoPng(48);
  if (!png) return new NextResponse(null, { status: 307, headers: { Location: "/icons/favicon.ico", "Cache-Control": "no-cache" } });
  return new NextResponse(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
}
