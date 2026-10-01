"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "../auth";
import { execute } from "../db";
import { getSession } from "../session";
import { clean } from "../text";
import { isHexColor, isValidTimezone } from "../validation";

export type ProfileState = { error?: string; message?: string } | null;

export async function updateProfileAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const fullName = clean(formData.get("full_name"), 100);
  const timezone = clean(formData.get("timezone"), 50);
  const color = clean(formData.get("avatar_color"), 7);

  if (fullName.length < 2) return { error: "Name must be at least 2 characters." };
  if (!isValidTimezone(timezone)) return { error: "Unknown timezone." };
  if (!isHexColor(color)) return { error: "Pick an avatar color." };

  await execute("UPDATE users SET full_name = ?, timezone = ?, avatar_color = ? WHERE id = ?", [fullName, timezone, color, user.id]);
  revalidatePath("/", "layout");
  return { message: "Profile updated successfully!" };
}

export async function changePasswordAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (!(await bcrypt.compare(current, user.password))) return { error: "Current password is incorrect." };
  if (next !== confirm) return { error: "New passwords do not match." };
  if (next.length < 6) return { error: "Password must be at least 6 characters." };
  if (next.length > 72) return { error: "Password must be 72 characters or fewer." };

  await execute("UPDATE users SET password = ? WHERE id = ?", [await bcrypt.hash(next, 12), user.id]);
  return { message: "Password changed successfully!" };
}

/**
 * Permanently deletes the signed-in user's own account and everything attached
 * to it. Needs the password again (or, for a Google account, the username typed
 * out) so a phone left unlocked isn't enough to do it.
 */
export async function deleteAccountAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  if (user.role === "admin") return { error: "An administrator account can only be removed by another administrator." };

  const confirm = String(formData.get("confirm") ?? "");
  if (user.google_id) {
    if (confirm.trim().toLowerCase() !== user.username.toLowerCase()) return { error: "Type your username exactly to confirm." };
  } else if (!(await bcrypt.compare(confirm, user.password))) {
    return { error: "That password is incorrect." };
  }

  // foreign keys cascade: habits, check-ins, notes, photo and leaderboard entry go too
  await execute("DELETE FROM users WHERE id = ?", [user.id]);
  (await getSession()).destroy();
  redirect("/?account=deleted");
}
