import type { NextRequest } from "next/server";
import { buildManifest } from "@/lib/manifest";

export const dynamic = "force-dynamic";

// The install manifest. There is one address for everybody, and which icon it
// carries follows the account using this device (the app keeps that in the
// "hf_icon" cookie). A phone re-reads this address from time to time, which
// is how an installed app can pick up a changed icon.
export function GET(request: NextRequest) {
  const icon = request.cookies.get("hf_icon")?.value === "arc" ? "arc" : "classic";
  return new Response(JSON.stringify(buildManifest(icon)), { headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "private, no-cache", Vary: "Cookie" } });
}
