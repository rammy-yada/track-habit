import type { MetadataRoute } from "next";
import { getPosts, isoDate } from "@/lib/blog";
import { PUBLIC_PAGES, SITE_URL } from "@/lib/site";

// Rebuilt at most once an hour and served from a ready copy in between, so a
// search engine always gets it instantly (a slow or failed fetch is what
// "sitemap could not be read" usually means).
export const revalidate = 3600;

// Served at /sitemap.xml: the public pages, plus every published blog post.
// Only posts carry a "last modified" date: for the fixed pages there is no
// honest one to give, and a date that changes on every fetch is worse than none.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // the sitemap must still be served if the database is briefly unreachable
  const posts = await getPosts().catch(() => []);
  return [
    ...PUBLIC_PAGES.map((page) => ({ url: `${SITE_URL}${page.path === "/" ? "/" : page.path}`, changeFrequency: page.changeFrequency, priority: page.priority })),
    ...posts.map((post) => ({ url: `${SITE_URL}/blog/${post.slug}`, lastModified: new Date(isoDate(post.updatedAt) ?? Date.now()), changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
