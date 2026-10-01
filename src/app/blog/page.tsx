import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage } from "@/components/PublicPage";
import { getPosts, isoDate } from "@/lib/blog";
import { readingMinutes } from "@/lib/blog-format";
import { APP_NAME } from "@/lib/constants";
import { formatTimestamp } from "@/lib/dates";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const description = "Practical writing on building habits, staying disciplined and finishing the Winter Arc. Short reads you can use today.";
export const metadata: Metadata = {
  title: "Blog — Habits, Discipline & the Winter Arc",
  description,
  alternates: { canonical: "/blog", types: { "application/rss+xml": "/blog/feed.xml" } },
  openGraph: { type: "website", siteName: APP_NAME, title: `${APP_NAME} Blog`, description, url: "/blog", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${APP_NAME} blog` }] },
};

export default async function BlogPage() {
  const posts = await getPosts();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${APP_NAME} Blog`,
    url: `${SITE_URL}/blog`,
    description,
    blogPost: posts.slice(0, 20).map((post) => ({ "@type": "BlogPosting", headline: post.title, url: `${SITE_URL}/blog/${post.slug}`, datePublished: isoDate(post.publishedAt) })),
  };

  return (
    <PublicPage width="max-w-5xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <header className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">Blog</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Small steps, written down</h1>
        <p className="mt-3 text-base leading-relaxed text-muted">{description}</p>
      </header>

      {posts.length === 0 ? (
        <p className="mt-12 rounded-2xl border border-dashed border-line px-4 py-14 text-center text-sm text-muted">The first post is on its way.</p>
      ) : (
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <li key={post.id}>
              <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-card transition-[border-color,transform] hover:-translate-y-0.5 hover:border-brand">
                <Link href={`/blog/${post.slug}`} className="flex h-full flex-col">
                  {post.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element -- a small WebP served (and cached for a year) by our own route
                    <img src={post.cover} alt="" width={1200} height={630} loading={i < 3 ? "eager" : "lazy"} decoding="async" className="aspect-[1200/630] w-full object-cover" />
                  ) : (
                    <div aria-hidden className="grid aspect-[1200/630] w-full place-items-center bg-[linear-gradient(135deg,var(--brand-soft),transparent)] font-display text-5xl font-extrabold text-brand/30">
                      {post.title[0]}
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-xs font-medium text-muted">
                      {post.publishedAt && <time dateTime={isoDate(post.publishedAt)}>{formatTimestamp(post.publishedAt)}</time>} · {readingMinutes(post.body)} min read
                    </p>
                    <h2 className="mt-2 font-display text-xl font-bold leading-snug tracking-tight group-hover:text-brand">{post.title}</h2>
                    {post.excerpt && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{post.excerpt}</p>}
                    <span className="mt-auto pt-4 text-sm font-semibold text-brand">Read →</span>
                  </div>
                </Link>
              </article>
            </li>
          ))}
        </ul>
      )}
    </PublicPage>
  );
}
