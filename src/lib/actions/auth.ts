"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { execute, isDuplicateError, queryOne } from "../db";
import { getSession } from "../session";
import { generateOTP, verifyOTP } from "../otp";
import { clean } from "../text";
import { isValidTimezone } from "../validation";

export type FormState = { error?: string; message?: string; fields?: Record<string, string> } | null;

// Compared against when the account doesn't exist, so "no such user" takes as
// long as "wrong password" and can't be told apart by timing.
const DUMMY_HASH = "$2b$12$CwTycUXWue0Thq9StjUM0uJ8rXW6bq0m3j8bYhGFFLb8Z4VZ5sP7e";

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const identifier = clean(formData.get("identifier"), 100);
  const password = String(formData.get("password") ?? "");
  if (!identifier || !password) return { error: "Please enter your email/username and password.", fields: { identifier } };

  const user = await queryOne<{ id: number; password: string }>(
    "SELECT id, password FROM users WHERE (LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)) AND is_active = 1 LIMIT 1",
    [identifier, identifier],
  );
  const valid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
  if (!user || !valid) return { error: "Invalid credentials.", fields: { identifier } };

  const session = await getSession();
  session.userId = user.id;
  session.pendingReg = undefined;
  session.devOtp = undefined;
  await session.save();
  await execute("UPDATE users SET last_login = NOW() WHERE id = ?", [user.id]);
  redirect("/dashboard");
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const fullName = clean(formData.get("full_name"), 100);
  const username = clean(formData.get("username"), 50);
  const email = clean(formData.get("email"), 100).toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");
  const timezone = clean(formData.get("timezone"), 50) || "UTC";
  const fields = { full_name: fullName, username, email, timezone };

  const errors: string[] = [];
  if (fullName.length < 2) errors.push("Full name must be at least 2 characters.");
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) errors.push("Username: 3-20 chars, letters/numbers/underscore only.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Please enter a valid email address.");
  if (password.length < 6) errors.push("Password must be at least 6 characters.");
  if (password.length > 72) errors.push("Password must be 72 characters or fewer.");
  if (password !== confirm) errors.push("Passwords do not match.");
  if (!isValidTimezone(timezone)) errors.push("Unknown timezone.");
  if (errors.length) return { error: errors.join(" "), fields };

  const taken = await queryOne("SELECT id FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)", [email, username]);
  if (taken) return { error: "Email or username already in use.", fields };

  const colors = ["#3b82f6", "#2563eb", "#1d4ed8", "#1e40af", "#1e3a8a"];
  const session = await getSession();
  session.pendingReg = {
    username,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    fullName,
    timezone,
    color: colors[Math.floor(Math.random() * colors.length)],
  };
  session.devOtp = await generateOTP(email, "register");
  await session.save();
  redirect("/verify");
}

export async function verifyOtpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  const reg = session.pendingReg;
  if (!reg) redirect("/register");

  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (code.length !== 6) return { error: "Please enter the full 6-digit code." };
  if (!(await verifyOTP(reg.email, code, "register"))) return { error: "Invalid or expired code." };

  let userId: number;
  try {
    const result = await execute<{ id: number }>(
      "INSERT INTO users (username, email, password, full_name, avatar_color, timezone, email_verified, last_login) VALUES (?, ?, ?, ?, ?, ?, 1, NOW()) RETURNING id",
      [reg.username, reg.email, reg.passwordHash, reg.fullName, reg.color, reg.timezone],
    );
    userId = result.rows[0].id;
  } catch (err) {
    if (isDuplicateError(err)) return { error: "User already exists." };
    throw err;
  }

  session.userId = userId;
  session.pendingReg = undefined;
  session.devOtp = undefined;
  await session.save();
  redirect("/dashboard?welcome=1");
}

export async function resendOtpAction(): Promise<FormState> {
  const session = await getSession();
  if (!session.pendingReg) redirect("/register");
  session.devOtp = await generateOTP(session.pendingReg.email, "register");
  await session.save();
  revalidatePath("/verify");
  return { message: "A new verification code has been generated." };
}

export async function logoutAction(): Promise<void> {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
