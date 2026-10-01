import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Which build is the server running? The app polls this to detect an update. */
export function GET() {
  return NextResponse.json({ build: process.env.NEXT_PUBLIC_BUILD_ID }, { headers: { "Cache-Control": "no-store" } });
}
