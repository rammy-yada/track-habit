import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PostBody } from "@/components/blog/PostBody";
import { PublicPage } from "@/components/PublicPage";
import { btnPrimary } from "@/components/ui/styles";
import { getPost, getPosts, isoDate, postDescription } from "@/lib/blog";
import { readingMinutes, wordCount } from "@/lib/blog-format";
import { APP_NAME, CREATOR } from "@/lib/constants";
import { formatTimestamp } from "@/lib/dates";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

// the page and its metadata both need the post: read it once per request
const loadPost = cache(getPost);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await loadPost((await params).slug);
  if (!post) return {};
  const title = post.seoTitle || post.title;
  const description = postDescription(post);
  const image = post.cover ?? "/opengraph-image";
  return {
    title,
    description,
    keywords: post.tags,
    authors: [{ name: CREATOR.handle }],
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", siteName: APP_NAME, title, description, url: `/blog/${post.slug}`, publishedTime: isoDate(post.publishedAt), modifiedTime: isoDate(post.updatedAt), authors: [CREATOR.handle], tags: post.tags, images: [{ url: image, width: 1200, height: 630, alt: post.title }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await loadPost((await params).slug);
  if (!post) notFound();
  const others = (await getPosts()).filter((p) => p.id !== post.id).slice(0, 3);
  const url = `${SITE_URL}/blog/${post.slug}`;

  // Tells search engines this is an article (who wrote it, when), and where it sits in the site.
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: post.title,
        description: postDescription(post),
        url,
        mainEntityOfPage: url,
        datePublished: isoDate(post.publishedAt),
        dateModified: isoDate(post.updatedAt),
        wordCount: wordCount(post.body),
        keywords: post.tags.join(", "),
        image: `${SITE_URL}${post.cover ?? "/opengraph-image"}`,
        author: { "@type": "Person", name: CREATOR.handle },
        publisher: { "@type": "Organization", name: APP_NAME, url: SITE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
          { "@type": "ListItem", position: 3, name: post.title, item: url },
        ],
      },
    ],
  };

  return (
    <PublicPage>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <article>
        <nav aria-label="Breadcrumb" className="text-xs font-medium text-muted">
          <Link href="/" className="hover:text-ink">
            Home
          </Link>{" "}
          /{" "}
          <Link href="/blog" className="hover:text-ink">
            Blog
          </Link>
        </nav>
        <h1 className="mt-4 font-display text-[clamp(2rem,6vw,3rem)] font-extrabold leading-[1.1] tracking-tight">{post.title}</h1>
        <p className="mt-4 text-sm text-muted">
          By {CREATOR.handle}
          {post.publishedAt && (
            <>
              {" "}
              · <time dateTime={isoDate(post.publishedAt)}>{formatTimestamp(post.publishedAt)}</time>
            </>
          )}{" "}
          · {readingMinutes(post.body)} min read
        </p>
        {post.cover && (
          // eslint-disable-next-line @next/next/no-img-element -- a small WebP served (and cached for a year) by our own route
          <img src={post.cover} alt={post.title} width={1200} height={630} fetchPriority="high" decoding="async" className="mt-7 aspect-[1200/630] w-full rounded-2xl border border-line object-cover" />
        )}
        {post.excerpt && <p className="mt-7 text-xl leading-relaxed text-muted">{post.excerpt}</p>}
        <div className="mt-7">
          <PostBody body={post.body} />
        </div>
        {post.tags.length > 0 && (
          <ul className="mt-10 flex flex-wrap gap-2" aria-label="Topics">
            {post.tags.map((tag) => (
              <li key={tag} className="rounded-full bg-raised px-3 py-1 text-xs font-medium text-muted">
                {`#${tag}`}
              </li>
            ))}
          </ul>
        )}
      </article>

      <aside className="mt-12 rounded-2xl border border-line bg-card p-6 text-center sm:p-8">
        <h2 className="font-display text-2xl font-bold tracking-tight">Reading is the easy part</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">{APP_NAME} is a free habit tracker that works offline. Pick a few habits, tick them off each day, and watch the streak grow.</p>
        <Link href="/register" className={`${btnPrimary} mt-5`}>
          Start tracking — it&apos;s free
        </Link>
      </aside>

      {others.length > 0 && (
        <section className="mt-12" aria-label="More posts">
          <h2 className="font-display text-lg font-bold tracking-tight">Keep reading</h2>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {others.map((other) => (
              <li key={other.id}>
                <Link href={`/blog/${other.slug}`} className="flex items-baseline justify-between gap-4 py-3.5 text-[15px] font-semibold hover:text-brand">
                  <span>{other.title}</span>
                  <span className="shrink-0 text-xs font-medium text-muted">{readingMinutes(other.body)} min</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PublicPage>
  );
}
