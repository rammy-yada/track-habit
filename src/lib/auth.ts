import "server-only";
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
};

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
  if (!user) return null;
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
