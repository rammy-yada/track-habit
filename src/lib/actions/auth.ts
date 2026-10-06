"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { execute, isDuplicateError, queryOne } from "../db";
import { getSession } from "../session";
import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { after } from "next/server";
import { passwordStamp } from "../auth";
import { clientIp, forget, limited, record } from "../throttle";
import { emailLang, googleAccountEmail, mailEnabled, resetEmail, sendMail, verificationEmail } from "../mail";
import { generateOTP, verifyOTP } from "../otp";
import { clean } from "../text";
import { isValidTimezone, passwordProblem } from "../validation";

export type FormState = { error?: string; message?: string; fields?: Record<string, string> } | null;

// Compared against when the account doesn't exist, so "no such user" takes as
// long as "wrong password" and can't be told apart by timing.
const DUMMY_HASH = "$2b$12$CwTycUXWue0Thq9StjUM0uJ8rXW6bq0m3j8bYhGFFLb8Z4VZ5sP7e";

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const identifier = clean(formData.get("identifier"), 100);
  const password = String(formData.get("password") ?? "");
  if (!identifier || !password) return { error: "Please enter your email/username and password.", fields: { identifier } };

  // Guess limiting: 8 wrong passwords for one account, or 40 from one address,
  // within 15 minutes, and sign-in is paused for that account / address.
  const accountKey = `login:${identifier.toLowerCase()}`;
  const ipKey = `login-ip:${await clientIp()}`;
  if ((await limited(accountKey, 8, 15)) || (await limited(ipKey, 40, 15))) {
    return { error: "Too many sign-in attempts. Please wait 15 minutes and try again.", fields: { identifier } };
  }

  const user = await queryOne<{ id: number; password: string; role: string }>(
    "SELECT id, password, role FROM users WHERE (LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)) AND is_active = 1 LIMIT 1",
    [identifier, identifier],
  );
  const valid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
  if (!user || !valid) {
    await record(accountKey, ipKey);
    return { error: "Invalid credentials.", fields: { identifier } };
  }
  await forget(accountKey);

  const session = await getSession();
  session.userId = user.id;
  session.pw = passwordStamp(user.password);
  session.at = Date.now();
  session.pendingReg = undefined;
  session.devOtp = undefined;
  session.joinArc = undefined;
  await session.save();
  await execute("UPDATE users SET last_login = NOW() WHERE id = ?", [user.id]);
  if (user.role === "admin") redirect("/sigmadev");
  redirect(formData.get("join") === "arc" ? "/arc/start" : "/dashboard");
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
  const weak = passwordProblem(password);
  if (weak) errors.push(weak);
  if (password !== confirm) errors.push("Passwords do not match.");
  if (!isValidTimezone(timezone)) errors.push("Unknown timezone.");
  if (errors.length) return { error: errors.join(" "), fields };
  if (await tooManyCodes(email)) return { error: "Too many verification codes requested. Please wait a while and try again.", fields };

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
  session.joinArc = formData.get("join") === "arc" || undefined;
  const code = await generateOTP(email, "register");
  await countCode(email);
  // With email set up, the code is sent to the address (which proves they own
  // it). Without it — local development — it is shown on screen instead.
  if (mailEnabled()) {
    if (!(await sendMail({ to: email, ...verificationEmail(emailLang({ timezone }), code) }))) return { error: "We couldn't send the verification email. Check the address for typos and try again.", fields };
    session.devOtp = undefined;
  } else {
    session.devOtp = code;
  }
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

  const joining = session.joinArc === true;
  session.userId = userId;
  session.pw = passwordStamp(reg.passwordHash);
  session.at = Date.now();
  session.pendingReg = undefined;
  session.devOtp = undefined;
  session.joinArc = undefined;
  await session.save();
  redirect(joining ? "/arc/start" : "/dashboard?welcome=1");
}

export async function resendOtpAction(): Promise<FormState> {
  const session = await getSession();
  if (!session.pendingReg) redirect("/register");
  if (await tooManyCodes(session.pendingReg.email)) return { error: "Too many codes requested. Please wait a while before asking for another." };
  const code = await generateOTP(session.pendingReg.email, "register");
  await countCode(session.pendingReg.email);
  if (mailEnabled()) {
    if (!(await sendMail({ to: session.pendingReg.email, ...verificationEmail(emailLang({ timezone: session.pendingReg.timezone }), code) }))) return { error: "We couldn't send the email. Please try again in a minute." };
    session.devOtp = undefined;
  } else {
    session.devOtp = code;
  }
  await session.save();
  revalidatePath("/verify");
  return { message: mailEnabled() ? "A new code is on its way to your email. If it isn't in your inbox, look in Spam or Junk." : "A new verification code has been generated." };
}

// Each code is an email sent from this site to an address somebody typed in.
// Without a limit the form could be used to flood a stranger's inbox (and to
// get five fresh guesses at a code as often as wanted).
const codeKeys = async (email: string) => [`otp:${email}`, `otp-ip:${await clientIp()}`] as const;

async function tooManyCodes(email: string): Promise<boolean> {
  const [emailKey, ipKey] = await codeKeys(email);
  return (await limited(emailKey, 4, 30)) || (await limited(ipKey, 12, 60));
}

async function countCode(email: string): Promise<void> {
  await record(...(await codeKeys(email)));
}

export async function logoutAction(): Promise<void> {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}

// ── Forgot password ──────────────────────────────────────────────────────────

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

async function siteUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  // On Vercel the production address is known without trusting the request.
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  // Otherwise it is taken from the request. Set APP_URL on a self-hosted
  // server: a forged Host header must never decide where a reset link points.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto")?.split(",")[0].trim() ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Emails a one-time link for choosing a new password. The answer on screen is
 * the same whether or not the address has an account, so this form can't be
 * used to find out who is registered.
 */
export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = clean(formData.get("email"), 100).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Please enter a valid email address." };
  if (!mailEnabled()) return { error: "Email isn't set up on this site yet. Ask an administrator to reset your password." };
  const sent = { message: "If that address has an account, a reset link is on its way. It works for 30 minutes. Can't see it after a minute or two? Look in your Spam or Junk folder." };

  const ipKey = `forgot-ip:${await clientIp()}`;
  if (await limited(ipKey, 6, 60)) return { error: "Too many requests. Please wait a while and try again." };
  await record(ipKey);
  const origin = await siteUrl();

  // The lookup and the email happen after the answer has gone out, so how long
  // the form takes doesn't reveal whether the address has an account either.
  after(async () => {
    const user = await queryOne<{ id: number; full_name: string; timezone: string; email_lang: string | null; google_id: string | null }>(
      "SELECT id, full_name, timezone, email_lang, google_id FROM users WHERE LOWER(email) = ? AND is_active = 1",
      [email],
    );
    if (!user) return;
    // at most one email every two minutes per account
    if (await queryOne("SELECT id FROM password_resets WHERE user_id = ? AND created_at > NOW() - INTERVAL '2 minutes'", [user.id])) return;

    const lang = emailLang(user);
    const name = user.full_name.split(" ")[0];
    const token = randomBytes(32).toString("base64url");
    // the row is written either way, so the two-minute limit also covers Google accounts
    await execute("INSERT INTO password_resets (user_id, token_hash, expires_at, used) VALUES (?, ?, NOW() + INTERVAL '30 minutes', ?)", [user.id, hashToken(token), user.google_id ? 1 : 0]);
    if (user.google_id) await sendMail({ to: email, ...googleAccountEmail(lang, name, `${origin}/login`) });
    else await sendMail({ to: email, ...resetEmail(lang, name, `${origin}/reset?token=${token}`) });
  });
  return sent;
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");
  const weak = passwordProblem(password);
  if (weak) return { error: weak };
  if (password !== confirm) return { error: "Passwords do not match." };

  // Marking the link used and reading who it belongs to happen in one
  // statement, so the same link can never be redeemed twice.
  const claimed = await execute<{ user_id: number }>("UPDATE password_resets SET used = 1 WHERE token_hash = ? AND used = 0 AND expires_at > NOW() RETURNING user_id", [hashToken(token)]);
  const userId = claimed.rows[0]?.user_id;
  if (!userId) return { error: "This reset link has expired or was already used. Request a new one." };

  await execute("UPDATE users SET password = ? WHERE id = ? AND is_active = 1", [await bcrypt.hash(password, 12), userId]);
  await execute("UPDATE password_resets SET used = 1 WHERE user_id = ?", [userId]); // any other outstanding links die too
  // (changing the password also signs out every device still using the old one — see passwordStamp)
  redirect("/login?notice=password_reset");
}
