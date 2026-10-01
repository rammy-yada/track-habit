import "server-only";
import { execute, query, queryOne } from "./db";

// A hosted database on a free plan has a fixed amount of space. This keeps an
// eye on it: a warning at 80%, and at 95% uploads (photos, pictures, sounds —
// the only things that take real space) are paused so the site itself keeps
// working. The plan's size is set in Admin → Overview.

export const DEFAULT_LIMIT_GB = 1;
export const WARN_AT = 0.8;
export const FULL_AT = 0.95;

export type Storage = { usedBytes: number; limitBytes: number; limitGb: number; share: number; state: "ok" | "warn" | "full" };

export async function getStorage(): Promise<Storage> {
  const [size, setting] = await Promise.all([queryOne<{ bytes: string | number }>("SELECT pg_database_size(current_database()) AS bytes"), queryOne<{ value: string }>("SELECT value FROM site_settings WHERE key = 'storage_limit_gb'")]);
  const limitGb = Math.min(1024, Math.max(0.001, Number(setting?.value) || DEFAULT_LIMIT_GB));
  const usedBytes = Number(size?.bytes ?? 0);
  const limitBytes = limitGb * 1024 ** 3;
  const share = usedBytes / limitBytes;
  return { usedBytes, limitBytes, limitGb, share, state: share >= FULL_AT ? "full" : share >= WARN_AT ? "warn" : "ok" };
}

/** Is there room for another upload? (One small query; asked before anything is stored.) */
export async function storageFull(): Promise<boolean> {
  return (await getStorage()).state === "full";
}

export const STORAGE_FULL_MESSAGE = "Uploads are paused for the moment: the site's storage is nearly full. Everything else keeps working, and this will be back soon.";

export async function setStorageLimit(gb: number): Promise<void> {
  await execute("INSERT INTO site_settings (key, value) VALUES ('storage_limit_gb', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()", [String(gb)]);
}

/** What is taking the space, largest first (for the admin screen). */
export async function storageBreakdown(): Promise<{ name: string; bytes: number; rows: number }[]> {
  const rows = await query<{ name: string; bytes: string | number; rows: string | number }>(
    "SELECT c.relname AS name, pg_total_relation_size(c.oid) AS bytes, GREATEST(c.reltuples, 0)::bigint AS rows FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY 2 DESC LIMIT 6",
  );
  return rows.map((r) => ({ name: r.name, bytes: Number(r.bytes), rows: Number(r.rows) }));
}

export const formatBytes = (bytes: number) => (bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(2)} GB` : bytes >= 1024 ** 2 ? `${(bytes / 1024 ** 2).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
