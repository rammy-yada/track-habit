import { getPosts, isoDate, postDescription } from "@/lib/blog";
import { APP_NAME } from "@/lib/constants";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const xml = (text: string) => text.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

/** GET /blog/feed.xml — the blog as an RSS feed, for feed readers and for search engines to find new posts quickly. */
export async function GET() {
  const posts = await getPosts();
  const items = posts
    .slice(0, 30)
    .map((post) => `<item><title>${xml(post.title)}</title><link>${SITE_URL}/blog/${post.slug}</link><guid isPermaLink="true">${SITE_URL}/blog/${post.slug}</guid><description>${xml(postDescription(post))}</description>${post.publishedAt ? `<pubDate>${new Date(isoDate(post.publishedAt)!).toUTCString()}</pubDate>` : ""}</item>`)
    .join("");
  const feed = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${xml(APP_NAME)} Blog</title><link>${SITE_URL}/blog</link><description>Habits, discipline and the Winter Arc.</description><language>en</language><atom:link href="${SITE_URL}/blog/feed.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
  return new Response(feed, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=600" } });
}
