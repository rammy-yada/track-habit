"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser, passwordStamp, profileComplete, requireUser } from "../auth";
import { isDateString, todayIn } from "../dates";
import { ageOn, isCountry, isGender, MIN_AGE } from "../people";
import { execute, isDuplicateError, queryOne } from "../db";
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

/** Profile → App: how often motivation arrives, the "come back" nudges, and which app icon to use. */
export async function updateAppPrefs(input: { motivation: number; comeback: boolean; appIcon: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const motivation = Number.isInteger(input?.motivation) && input.motivation >= 0 && input.motivation <= 3 ? input.motivation : null;
  const appIcon = ["auto", "classic", "arc"].includes(input?.appIcon) ? input.appIcon : null;
  if (motivation === null || appIcon === null || typeof input?.comeback !== "boolean") return { ok: false, error: "Invalid request." };
  await execute("UPDATE users SET notify_motivation = ?, notify_comeback = ?, app_icon = ? WHERE id = ?", [motivation, input.comeback ? 1 : 0, appIcon, user.id]);
  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Completing the profile ───────────────────────────────────────────────────

export type WelcomeState = { error?: string; fields?: Record<string, string> } | null;

/** Checks gender, date of birth and country as typed into a form. */
function readDetails(formData: FormData, today: string) {
  const gender = clean(formData.get("gender"), 12);
  const birthDate = clean(formData.get("birth_date"), 10);
  const country = clean(formData.get("country"), 2).toUpperCase();
  const errors: string[] = [];
  if (!isGender(gender)) errors.push("Choose a gender (or \"Rather not say\").");
  if (!isDateString(birthDate) || birthDate > today) errors.push("Enter your date of birth.");
  else {
    const age = ageOn(birthDate, today);
    if (age < MIN_AGE) errors.push(`You need to be at least ${MIN_AGE} to use HabitFlow.`);
    if (age > 120) errors.push("That date of birth doesn't look right.");
  }
  if (!isCountry(country)) errors.push("Choose your country.");
  return { gender, birthDate, country, errors };
}

/**
 * The questions asked once, before the app can be used: username, gender,
 * date of birth and country. Reads currentUser() rather than requireUser():
 * this is the one place a not-yet-complete account is allowed to act.
 */
export async function completeProfileAction(_prev: WelcomeState, formData: FormData): Promise<WelcomeState> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (profileComplete(user)) redirect("/dashboard");

  const username = clean(formData.get("username"), 50);
  const details = readDetails(formData, todayIn(user.timezone));
  const fields = { username, gender: details.gender, birth_date: details.birthDate, country: details.country };
  const errors = [...(/^[a-zA-Z0-9_]{3,20}$/.test(username) ? [] : ["Username: 3-20 characters, letters, numbers and underscore only."]), ...details.errors];
  if (errors.length) return { error: errors.join(" "), fields };

  if (username.toLowerCase() !== user.username.toLowerCase() && (await queryOne("SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id <> ?", [username, user.id]))) {
    return { error: "That username is taken. Try another.", fields };
  }
  const show = (name: string) => (formData.get(name) === "on" ? 1 : 0);
  try {
    await execute("UPDATE users SET username = ?, gender = ?, birth_date = ?, country = ?, show_age = ?, show_gender = ?, show_country = ? WHERE id = ?", [username, details.gender, details.birthDate, details.country, show("show_age"), show("show_gender"), show("show_country"), user.id]);
  } catch (err) {
    if (isDuplicateError(err)) return { error: "That username is taken. Try another.", fields };
    throw err;
  }
  revalidatePath("/", "layout");
  redirect("/dashboard?welcome=1");
}

/** Profile → About you: the same details, changed later, and who may see them. */
export async function updateDetailsAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const details = readDetails(formData, todayIn(user.timezone));
  if (details.errors.length) return { error: details.errors.join(" ") };
  const show = (name: string) => (formData.get(name) === "on" ? 1 : 0);
  await execute("UPDATE users SET gender = ?, birth_date = ?, country = ?, show_age = ?, show_gender = ?, show_country = ? WHERE id = ?", [details.gender, details.birthDate, details.country, show("show_age"), show("show_gender"), show("show_country"), user.id]);
  revalidatePath("/", "layout");
  return { message: "Saved." };
}
