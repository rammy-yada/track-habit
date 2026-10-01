import type { MetadataRoute } from "next";
import { getPosts, isoDate } from "@/lib/blog";
import { PUBLIC_PAGES, SITE_URL } from "@/lib/site";

// read on each request: a post published a minute ago is already listed
export const dynamic = "force-dynamic";

// Served at /sitemap.xml: the list of pages search engines should know about —
// the public pages, plus every published blog post.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  // the sitemap must still be served if the database is briefly unreachable
  const posts = await getPosts().catch(() => []);
  return [
    ...PUBLIC_PAGES.map((page) => ({ url: `${SITE_URL}${page.path === "/" ? "" : page.path}`, lastModified: now, changeFrequency: page.changeFrequency, priority: page.priority })),
    ...posts.map((post) => ({ url: `${SITE_URL}/blog/${post.slug}`, lastModified: new Date(isoDate(post.updatedAt) ?? now), changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
