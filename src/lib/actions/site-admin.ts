"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../auth";
import { parseTags, slugify } from "../blog-format";
import { execute, isDuplicateError } from "../db";
import { clean } from "../text";
import { toId } from "../validation";

// Admin → Blog and Admin → Inbox. As everywhere in the admin area, each
// action checks requireAdmin() itself.

type Result = { ok: true; id?: number } | { ok: false; error: string };
const INVALID = { ok: false, error: "Invalid request." } as const;
const refresh = () => revalidatePath("/", "layout");

type PostInput = { title: string; slug: string; excerpt: string; body: string; published: boolean; seoTitle: string; seoDescription: string; tags: string };

export async function savePost(idInput: number | null, input: PostInput): Promise<Result> {
  await requireAdmin();
  const title = clean(input?.title, 160);
  const excerpt = clean(input?.excerpt, 300);
  const body = String(input?.body ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/\r\n/g, "\n").trim().slice(0, 40_000);
  const slug = slugify(clean(input?.slug, 120) || title);
  const published = input?.published === true ? 1 : 0;
  const seoTitle = clean(input?.seoTitle, 70);
  const seoDescription = clean(input?.seoDescription, 170);
  const tags = parseTags(clean(input?.tags, 200)).join(", ");
  let savedId: number;
  if (title.length < 3) return { ok: false, error: "Give the post a title." };
  if (!slug) return { ok: false, error: "The address needs at least one letter or number." };
  if (body.length < 20) return { ok: false, error: "Write the post first (at least a sentence or two)." };

  try {
    if (idInput === null) {
      const created = await execute<{ id: number }>(
        "INSERT INTO blog_posts (slug, title, excerpt, body, seo_title, seo_description, tags, published, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 1 THEN NOW() END) RETURNING id",
        [slug, title, excerpt, body, seoTitle, seoDescription, tags, published, published],
      );
      savedId = created.rows[0].id;
    } else {
      const id = toId(idInput);
      if (!id) return INVALID;
      // published_at is set the first time a post goes live, and kept after that
      const changed = await execute(
        "UPDATE blog_posts SET slug = ?, title = ?, excerpt = ?, body = ?, seo_title = ?, seo_description = ?, tags = ?, published = ?, published_at = CASE WHEN ? = 1 THEN COALESCE(published_at, NOW()) ELSE published_at END, updated_at = NOW() WHERE id = ?",
        [slug, title, excerpt, body, seoTitle, seoDescription, tags, published, published, id],
      );
      if (!changed.rowCount) return { ok: false, error: "Post not found." };
      savedId = id;
    }
  } catch (err) {
    if (isDuplicateError(err)) return { ok: false, error: "Another post already uses that address. Change the address or the title." };
    throw err;
  }
  refresh();
  return { ok: true, id: savedId };
}

export async function deletePost(idInput: number): Promise<Result> {
  await requireAdmin();
  const id = toId(idInput);
  if (!id) return INVALID;
  await execute("DELETE FROM blog_posts WHERE id = ?", [id]);
  await execute("DELETE FROM site_images WHERE slot = ?", [`post-${id}`]); // its cover picture
  refresh();
  return { ok: true };
}

export async function setInquiryStatus(idInput: number, status: string): Promise<Result> {
  await requireAdmin();
  const id = toId(idInput);
  if (!id || (status !== "new" && status !== "read")) return INVALID;
  await execute("UPDATE inquiries SET status = ? WHERE id = ?", [status, id]);
  refresh();
  return { ok: true };
}

export async function deleteInquiry(idInput: number): Promise<Result> {
  await requireAdmin();
  const id = toId(idInput);
  if (!id) return INVALID;
  await execute("DELETE FROM inquiries WHERE id = ?", [id]);
  refresh();
  return { ok: true };
}
