"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "../auth";
import { execute, isDuplicateError, queryOne } from "../db";
import { clean } from "../text";
import { toId } from "../validation";

type Result = { ok: true } | { ok: false; error: string };
export type AdminFormState = { error?: string; ok?: boolean } | null;

const SELF = { ok: false, error: "You can't do that to your own account." } as const;

export async function addUserAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const fullName = clean(formData.get("full_name"), 100);
  const username = clean(formData.get("username"), 50);
  const email = clean(formData.get("email"), 100).toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role") === "admin" ? "admin" : "user";

  const errors: string[] = [];
  if (fullName.length < 2) errors.push("Full name too short.");
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) errors.push("Invalid username.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Invalid email.");
  if (password.length < 6 || password.length > 72) errors.push("Password must be 6-72 characters.");
  if (errors.length) return { error: errors.join(" ") };

  if (await queryOne("SELECT id FROM users WHERE email = ? OR username = ?", [email, username])) {
    return { error: "Email or username already exists." };
  }
  await execute("INSERT INTO users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?)", [
    username,
    email,
    await bcrypt.hash(password, 12),
    fullName,
    role,
  ]);
  revalidatePath("/admin");
  return { ok: true };
}

export async function toggleUser(userIdInput: number): Promise<Result> {
  const admin = await requireAdmin();
  const userId = toId(userIdInput);
  if (!userId) return { ok: false, error: "Invalid request." };
  if (userId === admin.id) return SELF;
  await execute("UPDATE users SET is_active = 1 - is_active WHERE id = ?", [userId]);
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteUser(userIdInput: number): Promise<Result> {
  const admin = await requireAdmin();
  const userId = toId(userIdInput);
  if (!userId) return { ok: false, error: "Invalid request." };
  if (userId === admin.id) return SELF;
  // Foreign keys cascade: the user's habits and logs go with them.
  await execute("DELETE FROM users WHERE id = ?", [userId]);
  revalidatePath("/admin");
  return { ok: true };
}

export async function changeRole(userIdInput: number, roleInput: string): Promise<Result> {
  const admin = await requireAdmin();
  const userId = toId(userIdInput);
  const role = roleInput === "admin" ? "admin" : "user";
  if (!userId) return { ok: false, error: "Invalid request." };
  if (userId === admin.id) return SELF;
  await execute("UPDATE users SET role = ? WHERE id = ?", [role, userId]);
  revalidatePath("/admin");
  return { ok: true };
}

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
