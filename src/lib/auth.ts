import "server-only";
import { createHash } from "node:crypto";
import { cache } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { queryOne } from "./db";
import { ADMIN_SESSION_MS, getSession, MEMBER_SESSION_MS } from "./session";
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
  /** Motivation notifications a day: 0 (none) to 3. */
  notify_motivation: number;
  /** 1: nudge me when I've been away a few days. */
  notify_comeback: number;
  app_icon: "auto" | "classic" | "arc";
  gender: string | null;
  /** YYYY-MM-DD */
  birth_date: string | null;
  /** Two-letter country code. */
  country: string | null;
  show_age: number;
  show_gender: number;
  show_country: number;
};

/**
 * Has this account filled in the details asked for before the app can be
 * used? (Administrators manage the site and aren't asked.)
 */
export const profileComplete = (user: Pick<User, "role" | "gender" | "birth_date" | "country">) => user.role === "admin" || Boolean(user.gender && user.birth_date && user.country);

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
  // Too old? The limit is checked here, against the time sealed inside the
  // cookie, so it can't be stretched from the browser. An administrator's
  // sign-in without a time on it (made before this rule) doesn't count.
  const age = Date.now() - (session.at ?? (user.role === "admin" ? 0 : Date.now()));
  if (age > (user.role === "admin" ? ADMIN_SESSION_MS : MEMBER_SESSION_MS)) return null;
  return { ...user, full_name: decodeEntities(user.full_name), timezone: user.timezone || "UTC" };
});

/**
 * Authentication: are you signed in — and have you finished setting up?
 * Someone who hasn't given their details yet is sent to do that first, from
 * every page and every action that uses this, so the app can't be used
 * around the question. (/welcome itself reads currentUser() directly.)
 */
export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!profileComplete(user)) redirect("/welcome");
  return user;
}

/**
 * Authorization: signed in *and* allowed to manage the system. Everyone else
 * gets the ordinary "page not found" — the same answer as for an address that
 * doesn't exist, so the admin area can't be told apart from nothing at all.
 */
export async function requireAdmin(): Promise<User> {
  const user = await currentUser();
  if (!user || user.role !== "admin") notFound();
  return user;
}

/**
 * The tab title of an admin page — handed out only to an administrator.
 * Anyone else is about to get "page not found", and that page must look
 * exactly like any other missing page, title included.
 */
export async function adminMetadata(metadata: Metadata): Promise<Metadata> {
  return (await currentUser())?.role === "admin" ? metadata : {};
}
