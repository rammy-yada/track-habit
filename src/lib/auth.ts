import "server-only";
import { createHash } from "node:crypto";
import { cache } from "react";
import { redirect } from "next/navigation";
import { queryOne } from "./db";
import { getSession } from "./session";
import { decodeEntities } from "./text";

export type User = {
  id: number;
  username: string;
  email: string;
  password: string;
  full_name: string;
  avatar_color: string;
  timezone: string;
  role: "user" | "admin";
  is_active: number;
  created_at: string;
  last_login: string | null;
  google_id: string | null;
  avatar_version: number;
  email_lang: string | null;
  email_reminders: number;
};

/**
 * A short fingerprint of the stored password hash, kept in the session cookie.
 * When the password changes (by the owner, a reset link, or an admin) the
 * fingerprint no longer matches, so every device signed in with the old
 * password is signed out — including one a stranger may be using.
 */
export const passwordStamp = (passwordHash: string) => createHash("sha256").update(passwordHash).digest("base64url").slice(0, 16);

/**
 * The signed-in user, re-read from the database on every request (cached for
 * the duration of that one request). Role and is_active therefore take effect
 * immediately — a disabled or demoted account doesn't keep its old access
 * until the cookie expires.
 */
export const currentUser = cache(async (): Promise<User | null> => {
  const session = await getSession();
  if (!session.userId) return null;
  const user = await queryOne<User>("SELECT * FROM users WHERE id = ? AND is_active = 1", [session.userId]);
  if (!user || session.pw !== passwordStamp(user.password)) return null;
  return { ...user, full_name: decodeEntities(user.full_name), timezone: user.timezone || "UTC" };
});

/** Authentication: are you signed in at all? */
export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

/** Authorization: signed in *and* allowed to manage the system. */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
