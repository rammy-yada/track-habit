import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Served at /robots.txt. The signed-in screens have nothing for a search
// engine (they only redirect to the sign-in page), so crawlers are told not
// to bother with them. Private pages are also marked noindex themselves.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/dashboard", "/analytics", "/monthly", "/profile", "/support", "/arc", "/verify", "/reset", "/forgot", "/unsubscribed"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
