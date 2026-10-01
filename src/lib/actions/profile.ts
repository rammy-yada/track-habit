"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { passwordStamp, requireUser } from "../auth";
import { execute } from "../db";
import { getSession } from "../session";
import { clean } from "../text";
import { forget, limited, record } from "../throttle";
import { isHexColor, isValidTimezone, passwordProblem } from "../validation";

export type ProfileState = { error?: string; message?: string } | null;

export async function updateProfileAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const fullName = clean(formData.get("full_name"), 100);
  const timezone = clean(formData.get("timezone"), 50);
  const color = clean(formData.get("avatar_color"), 7);

  if (fullName.length < 2) return { error: "Name must be at least 2 characters." };
  if (!isValidTimezone(timezone)) return { error: "Unknown timezone." };
  if (!isHexColor(color)) return { error: "Pick an avatar color." };
  const language = clean(formData.get("email_lang"), 5);
  const emailLang = language === "ne" || language === "en" ? language : null; // null = decide from the timezone
  const reminders = formData.get("email_reminders") === "on" ? 1 : 0;

  await execute("UPDATE users SET full_name = ?, timezone = ?, avatar_color = ?, email_lang = ?, email_reminders = ? WHERE id = ?", [fullName, timezone, color, emailLang, reminders, user.id]);
  revalidatePath("/", "layout");
  return { message: "Profile updated successfully!" };
}

export async function changePasswordAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  // someone holding an unlocked phone shouldn't get unlimited guesses at the password
  const key = `password:${user.id}`;
  if (await limited(key, 5, 15)) return { error: "Too many wrong attempts. Please wait 15 minutes." };
  if (!(await bcrypt.compare(current, user.password))) {
    await record(key);
    return { error: "Current password is incorrect." };
  }
  if (next !== confirm) return { error: "New passwords do not match." };
  const weak = passwordProblem(next);
  if (weak) return { error: weak };
  if (next === current) return { error: "The new password must be different from the current one." };

  const hash = await bcrypt.hash(next, 12);
  await execute("UPDATE users SET password = ? WHERE id = ?", [hash, user.id]);
  await forget(key);
  // Every other device signed in with the old password is now signed out;
  // this one carries on with the new fingerprint.
  const session = await getSession();
  session.pw = passwordStamp(hash);
  await session.save();
  return { message: "Password changed. Other devices have been signed out." };
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
  } else {
    const key = `password:${user.id}`;
    if (await limited(key, 5, 15)) return { error: "Too many wrong attempts. Please wait 15 minutes." };
    if (!(await bcrypt.compare(confirm, user.password))) {
      await record(key);
      return { error: "That password is incorrect." };
    }
  }

  // foreign keys cascade: habits, check-ins, notes, photo and leaderboard entry go too
  await execute("DELETE FROM users WHERE id = ?", [user.id]);
  (await getSession()).destroy();
  redirect("/?account=deleted");
}
