"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../auth";
import { parseTags, slugify } from "../blog-format";
import { execute, isDuplicateError, queryOne } from "../db";
import { saveMessages } from "../messages";
import { setStorageLimit } from "../storage";
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

/** Admin → Notifications: the wording of the quotes, nudges and "come back" messages. */
export async function saveMessagesAction(input: unknown): Promise<Result> {
  await requireAdmin();
  await saveMessages(input); // normalised there: over-long or unexpected values never reach the database
  refresh();
  return { ok: true };
}

/** Admin → Overview: how much space the database plan allows, in GB. */
export async function setStorageLimitAction(gbInput: number): Promise<Result> {
  await requireAdmin();
  const gb = Number(gbInput);
  if (!(gb >= 0.01 && gb <= 1024)) return { ok: false, error: "Enter the size of your database plan in GB (for example 1 or 8)." };
  await setStorageLimit(Math.round(gb * 100) / 100);
  refresh();
  return { ok: true };
}

// ── Products (Admin → Sellers) ───────────────────────────────────────────────

type ProductInput = { name: string; price: string; description: string; url: string; category: string; active: boolean };

export async function saveProduct(idInput: number | null, input: ProductInput): Promise<Result> {
  await requireAdmin();
  const name = clean(input?.name, 80);
  const price = clean(input?.price, 40);
  const description = clean(input?.description, 600);
  const category = clean(input?.category, 40);
  let url = clean(input?.url, 300);
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  if (name.length < 2) return { ok: false, error: "Give the product a name." };
  // the Buy button sends people here: it must be a real web address, never javascript: or the like
  if (!/^https:\/\/[^\s/]+\.[^\s]+$/i.test(url)) return { ok: false, error: "Add the link where people buy it (an https:// address)." };
  const active = input?.active === false ? 0 : 1;
  let savedId: number;
  if (idInput === null) {
    const count = await queryOne<{ n: number | string }>("SELECT COUNT(*) AS n FROM products");
    if (Number(count?.n ?? 0) >= 200) return { ok: false, error: "200 products is the most there can be." };
    savedId = (await execute<{ id: number }>("INSERT INTO products (name, price, description, url, category, is_active) VALUES (?, ?, ?, ?, ?, ?) RETURNING id", [name, price, description, url, category, active])).rows[0].id;
  } else {
    const id = toId(idInput);
    if (!id) return INVALID;
    const changed = await execute("UPDATE products SET name = ?, price = ?, description = ?, url = ?, category = ?, is_active = ? WHERE id = ?", [name, price, description, url, category, active, id]);
    if (!changed.rowCount) return { ok: false, error: "Product not found." };
    savedId = id;
  }
  refresh();
  return { ok: true, id: savedId };
}

export async function deleteProduct(idInput: number): Promise<Result> {
  await requireAdmin();
  const id = toId(idInput);
  if (!id) return INVALID;
  await execute("DELETE FROM products WHERE id = ?", [id]);
  await execute("DELETE FROM site_images WHERE slot = ?", [`product-${id}`]);
  refresh();
  return { ok: true };
}
