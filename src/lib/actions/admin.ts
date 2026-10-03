"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "../auth";
import { arcSeason } from "../arc";
import { execute, isDuplicateError, queryOne } from "../db";
import { todayIn } from "../dates";
import { clean } from "../text";
import { passwordProblem, toId } from "../validation";

// Every action here starts with requireAdmin(): the buttons being hidden from
// normal users is not what protects these — this check is.

type Result = { ok: true } | { ok: false; error: string };
export type AdminFormState = { error?: string; ok?: boolean } | null;

const SELF = { ok: false, error: "You can't do that to your own account." } as const;
const INVALID = { ok: false, error: "Invalid request." } as const;
const refresh = () => revalidatePath("/sigmadev", "layout");

export async function addUserAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const fullName = clean(formData.get("full_name"), 100);
  const username = clean(formData.get("username"), 50);
  const email = clean(formData.get("email"), 100).toLowerCase();
  const password = String(formData.get("password") ?? "");
  // Accounts made here are always ordinary members. An administrator can only
  // be created on the server itself (`npm run admin`), never from a screen:
  // one wrong tap must not be able to hand someone the whole site.
  const role = "user";

  const errors: string[] = [];
  if (fullName.length < 2) errors.push("Full name too short.");
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) errors.push("Invalid username.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Invalid email.");
  const weak = passwordProblem(password);
  if (weak) errors.push(weak);
  if (errors.length) return { error: errors.join(" ") };

  if (await queryOne("SELECT id FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)", [email, username])) {
    return { error: "Email or username already exists." };
  }
  await execute("INSERT INTO users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?)", [username, email, await bcrypt.hash(password, 12), fullName, role]);
  refresh();
  return { ok: true };
}

export async function toggleUser(userIdInput: number): Promise<Result> {
  const admin = await requireAdmin();
  const userId = toId(userIdInput);
  if (!userId) return INVALID;
  if (userId === admin.id) return SELF;
  await execute("UPDATE users SET is_active = 1 - is_active WHERE id = ?", [userId]);
  refresh();
  return { ok: true };
}

export async function deleteUser(userIdInput: number): Promise<Result> {
  const admin = await requireAdmin();
  const userId = toId(userIdInput);
  if (!userId) return INVALID;
  if (userId === admin.id) return SELF;
  // Foreign keys cascade: the user's habits, check-ins, photo and arc entry go with them.
  await execute("DELETE FROM users WHERE id = ?", [userId]);
  refresh();
  return { ok: true };
}

/**
 * For someone who has forgotten their password (there is no email in this
 * app to send a reset link to). Sets a new random password and returns it
 * once, for the admin to pass on; only its hash is stored.
 */
export async function resetUserPassword(userIdInput: number): Promise<{ ok: true; password: string } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  const userId = toId(userIdInput);
  if (!userId) return INVALID;
  if (userId === admin.id) return { ok: false, error: "Change your own password from Account." };
  const target = await queryOne<{ google_id: string | null; email: string; username: string }>("SELECT google_id, email, username FROM users WHERE id = ?", [userId]);
  if (!target) return { ok: false, error: "User not found." };
  // a Google account has no password to reset, and must not be given one
  if (target.google_id) return { ok: false, error: "This account signs in with Google — it has no password." };
  const password = randomBytes(9).toString("base64url");
  // the new hash also signs that person out everywhere (see passwordStamp)
  await execute("UPDATE users SET password = ? WHERE id = ?", [await bcrypt.hash(password, 12), userId]);
  await execute("UPDATE password_resets SET used = 1 WHERE user_id = ?", [userId]); // emailed links for the old password die too
  await execute("DELETE FROM rate_limits WHERE key IN (?, ?)", [`login:${target.email.toLowerCase()}`, `login:${target.username.toLowerCase()}`]); // lift any sign-in pause
  return { ok: true, password };
}

export async function removeUserPhoto(userIdInput: number): Promise<Result> {
  await requireAdmin();
  const userId = toId(userIdInput);
  if (!userId) return INVALID;
  await execute("DELETE FROM avatars WHERE user_id = ?", [userId]);
  await execute("UPDATE users SET avatar_version = 0 WHERE id = ?", [userId]);
  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Categories ───────────────────────────────────────────────────────────────

export async function addCategoryAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const name = clean(formData.get("cat_name"), 50);
  const icon = clean(formData.get("cat_icon"), 10) || "📋";
  if (name.length < 2) return { error: "Name must be at least 2 characters." };
  try {
    await execute("INSERT INTO categories (name, icon) VALUES (?, ?)", [name, icon]);
  } catch (err) {
    if (isDuplicateError(err)) return { error: "Name already exists." };
    throw err;
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateCategory(idInput: number, nameInput: string, iconInput: string): Promise<Result> {
  await requireAdmin();
  const id = toId(idInput);
  const name = clean(nameInput, 50);
  const icon = clean(iconInput, 10) || "📋";
  if (!id) return INVALID;
  if (name.length < 2) return { ok: false, error: "Name must be at least 2 characters." };
  const current = await queryOne<{ name: string }>("SELECT name FROM categories WHERE id = ?", [id]);
  if (!current) return { ok: false, error: "Category not found." };
  try {
    await execute("UPDATE categories SET name = ?, icon = ? WHERE id = ?", [name, icon, id]);
  } catch (err) {
    if (isDuplicateError(err)) return { ok: false, error: "Another category already has that name." };
    throw err;
  }
  // habits store the category's name, so a rename has to follow through to them
  if (current.name !== name) await execute("UPDATE habits SET category = ? WHERE category = ?", [name, current.name]);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCategory(idInput: number): Promise<Result> {
  await requireAdmin();
  const id = toId(idInput);
  if (!id) return INVALID;
  const current = await queryOne<{ name: string }>("SELECT name FROM categories WHERE id = ?", [id]);
  if (!current) return { ok: true };
  const left = await queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM categories");
  if (Number(left?.n ?? 0) <= 1) return { ok: false, error: "Keep at least one category." };
  await execute("DELETE FROM categories WHERE id = ?", [id]);
  // nobody's habits are deleted — they move to "General"
  await execute("UPDATE habits SET category = 'General' WHERE category = ?", [current.name]);
  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Winter Arc ───────────────────────────────────────────────────────────────

/** Take someone off this year's leaderboard (they can join again). */
export async function removeArcMember(userIdInput: number): Promise<Result> {
  await requireAdmin();
  const userId = toId(userIdInput);
  if (!userId) return INVALID;
  await execute("DELETE FROM winter_arc_members WHERE user_id = ? AND season = ?", [userId, arcSeason(todayIn("UTC")).year]);
  revalidatePath("/", "layout");
  return { ok: true };
}
