import "server-only";
import type { NextRequest } from "next/server";

/**
 * API routes have no built-in protection against another website posting to
 * them with the visitor's cookie. Browsers send an Origin header on such
 * requests; this accepts only our own. (The session cookie is SameSite=Lax as
 * well, which already keeps it off cross-site POSTs.)
 */
export function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // not a cross-site browser request
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
