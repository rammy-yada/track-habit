import { buildManifest } from "@/lib/manifest";

// The install manifest with the Winter Arc icon (see src/lib/manifest.ts).
export const dynamic = "force-static";

export function GET() {
  return new Response(JSON.stringify(buildManifest("arc")), { headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
