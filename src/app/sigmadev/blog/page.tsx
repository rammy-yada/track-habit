import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { btnPrimary, card } from "@/components/ui/styles";
import { adminMetadata, requireAdmin } from "@/lib/auth";
import { getPosts } from "@/lib/blog";
import { readingMinutes, wordCount } from "@/lib/blog-format";
import { formatTimestamp } from "@/lib/dates";

export const generateMetadata = (): Promise<Metadata> => adminMetadata({ title: "Blog" });

export default async function AdminBlogPage() {
  const admin = await requireAdmin();
  const posts = await getPosts({ drafts: true });
  return (
    <>
      <PageHeader title="Blog">
        <Link href="/sigmadev/blog/new" className={btnPrimary}>
          <span className="text-base leading-none">+</span> New post
        </Link>
      </PageHeader>
      <div className="space-y-4 px-4 py-6 md:px-8 md:py-7">
        <p className="max-w-2xl text-sm text-muted">
          Posts appear on the public{" "}
          <a href="/blog" target="_blank" rel="noopener" className="font-semibold text-brand hover:underline">
            blog ↗
          </a>{" "}
          once published, and are added to the sitemap and the RSS feed automatically. Drafts are only visible here.
        </p>
        {posts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-12 text-center text-sm text-muted">No posts yet. Write the first one.</p>
        ) : (
          <ul className="space-y-2.5">
            {posts.map((post) => (
              <li key={post.id}>
                <Link href={`/sigmadev/blog/${post.id}`} className={`${card} flex items-center gap-4 p-4 transition-colors hover:border-brand`} data-post={post.slug}>
                  <div className="hidden h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-raised sm:block">
                    {post.cover && (
                      // eslint-disable-next-line @next/next/no-img-element -- an uploaded WebP served by our own route
                      <img src={post.cover} alt="" className="h-full w-full object-cover" loading="lazy" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-bold">{post.title}</span>
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${post.published ? "bg-good-soft text-good" : "bg-raised text-muted"}`}>{post.published ? "Published" : "Draft"}</span>
                    </div>
                    <div className="truncate text-xs text-muted">
                      /blog/{post.slug} · {wordCount(post.body)} words · {readingMinutes(post.body)} min · updated {formatTimestamp(post.updatedAt, admin.timezone)}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-brand">Edit →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
