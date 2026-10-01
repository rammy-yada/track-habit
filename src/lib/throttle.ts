import "server-only";
import { headers } from "next/headers";
import { execute, queryOne } from "./db";

// Slows down guessing. Every failed sign-in, and every email we are asked to
// send, leaves a row here; once a key has too many recent rows the action is
// refused until they age out. It lives in the database (not in memory) because
// on a serverless host each request may land on a different copy of the app.

/** Has this key been used `limit` times or more in the last `minutes`? */
export async function limited(key: string, limit: number, minutes: number): Promise<boolean> {
  const row = await queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM rate_limits WHERE key = ? AND created_at > NOW() - make_interval(mins => ?::int)", [key.slice(0, 160), minutes]);
  return Number(row?.n ?? 0) >= limit;
}

export async function record(...keys: string[]): Promise<void> {
  for (const key of keys) await execute("INSERT INTO rate_limits (key) VALUES (?)", [key.slice(0, 160)]);
  // now and then, sweep out rows too old to matter to any limit
  if (Math.random() < 0.05) await execute("DELETE FROM rate_limits WHERE created_at < NOW() - INTERVAL '1 day'");
}

export async function forget(key: string): Promise<void> {
  await execute("DELETE FROM rate_limits WHERE key = ?", [key.slice(0, 160)]);
}

/** The visitor's address as the hosting platform reports it (first hop of X-Forwarded-For). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown").slice(0, 60);
}
