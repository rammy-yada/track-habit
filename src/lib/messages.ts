import "server-only";
import { execute, query } from "./db";
import { COMEBACK_DAYS, type CustomMessages } from "./quotes";

const line = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");
const lines = (value: unknown, max: number) => (Array.isArray(value) ? [...new Set(value.map((v) => line(v, 160)).filter(Boolean))].slice(0, max) : []);

/** Whatever was stored or submitted, made safe and complete. */
export function normalizeMessages(raw: unknown): CustomMessages {
  const r = (raw ?? {}) as { quotes?: unknown; nudges?: unknown; comeback?: Record<string, { title?: unknown; body?: unknown }> };
  const comeback: CustomMessages["comeback"] = {};
  for (const day of COMEBACK_DAYS) {
    const title = line(r.comeback?.[day]?.title, 60);
    const body = line(r.comeback?.[day]?.body, 160);
    if (title && body) comeback[String(day)] = { title, body };
  }
  return { quotes: lines(r.quotes, 60), nudges: lines(r.nudges, 60), comeback };
}

/** The notification wording an admin has written (Admin → Notifications). */
export async function getMessages(): Promise<CustomMessages> {
  const rows = await query<{ value: string }>("SELECT value FROM site_settings WHERE key = 'messages'");
  try {
    return normalizeMessages(rows[0] ? JSON.parse(rows[0].value) : {});
  } catch {
    return normalizeMessages({});
  }
}

export async function saveMessages(raw: unknown): Promise<void> {
  await execute("INSERT INTO site_settings (key, value) VALUES ('messages', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()", [JSON.stringify(normalizeMessages(raw))]);
}

/** Which of the two uploadable icons an admin has replaced (their version numbers; 0 = built-in). */
export async function iconVersions(): Promise<{ arc: number; away: number }> {
  const rows = await query<{ slot: string; version: number }>("SELECT slot, version FROM site_images WHERE slot IN ('icon-arc', 'icon-away')");
  const version = (slot: string) => rows.find((r) => r.slot === slot)?.version ?? 0;
  return { arc: version("icon-arc"), away: version("icon-away") };
}
