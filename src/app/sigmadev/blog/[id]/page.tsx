import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostEditor, type EditablePost } from "@/components/sigmadev/PostEditor";
import { adminMetadata, requireAdmin } from "@/lib/auth";
import { getPostById } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";
import { toId } from "@/lib/validation";

export const generateMetadata = (): Promise<Metadata> => adminMetadata({ title: "Edit post" });

const BLANK: EditablePost = { id: null, title: "", slug: "", excerpt: "", body: "", published: false, seoTitle: "", seoDescription: "", tags: "", cover: null };

// /sigmadev/blog/new starts an empty post; /sigmadev/blog/12 opens post 12.
export default async function AdminPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (id === "new") return <PostEditor post={BLANK} siteUrl={SITE_URL} />;
  const post = toId(id) ? await getPostById(toId(id)!) : null;
  if (!post) notFound();
  const { publishedAt: _publishedAt, updatedAt: _updatedAt, tags, cover, ...rest } = post;
  // a draft's cover isn't served publicly; the editor shows it through the same address once published
  return <PostEditor key={post.id} post={{ ...rest, tags: tags.join(", "), cover }} siteUrl={SITE_URL} />;
}
