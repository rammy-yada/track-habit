import "server-only";
import { query, queryOne } from "./db";
import { parseTags, plainText } from "./blog-format";

export type Post = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  published: boolean;
  publishedAt: string | null;
  updatedAt: string;
  /** What search engines and link previews show; fall back to the title and excerpt. */
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  /** Address of the cover picture, or null. */
  cover: string | null;
};
type Row = { id: number; slug: string; title: string; excerpt: string; body: string; published: number; published_at: string | null; updated_at: string; seo_title: string; seo_description: string; tags: string; cover_version: number };

const toPost = (r: Row): Post => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  excerpt: r.excerpt,
  body: r.body,
  published: r.published === 1,
  publishedAt: r.published_at,
  updatedAt: r.updated_at,
  seoTitle: r.seo_title,
  seoDescription: r.seo_description,
  tags: parseTags(r.tags),
  cover: r.cover_version > 0 ? `/blog/cover/${r.id}?v=${r.cover_version}` : null,
});
const COLUMNS = "id, slug, title, excerpt, body, published, published_at, updated_at, seo_title, seo_description, tags, cover_version";

/** Posts, newest first. Visitors only ever get published ones. */
export async function getPosts(options: { drafts?: boolean } = {}): Promise<Post[]> {
  return (await query<Row>(`SELECT ${COLUMNS} FROM blog_posts ${options.drafts ? "" : "WHERE published = 1"} ORDER BY COALESCE(published_at, created_at) DESC, id DESC`)).map(toPost);
}

/** One published post, by its address. */
export async function getPost(slug: string): Promise<Post | null> {
  const row = await queryOne<Row>(`SELECT ${COLUMNS} FROM blog_posts WHERE slug = ? AND published = 1`, [slug.slice(0, 120)]);
  return row ? toPost(row) : null;
}

/** Any post, draft or not — for the admin's editor. */
export async function getPostById(id: number): Promise<Post | null> {
  const row = await queryOne<Row>(`SELECT ${COLUMNS} FROM blog_posts WHERE id = ?`, [id]);
  return row ? toPost(row) : null;
}

/** The line shown under a post's title in search results and link previews. */
export const postDescription = (post: Pick<Post, "seoDescription" | "excerpt" | "body">) => post.seoDescription || post.excerpt || plainText(post.body).slice(0, 155);

/** ISO form of a stored (UTC) timestamp. */
export const isoDate = (timestamp: string | null) => (timestamp ? new Date(`${timestamp.replace(" ", "T").replace(/([+-]\d\d(:?\d\d)?|Z)$/, "")}Z`).toISOString() : undefined);
