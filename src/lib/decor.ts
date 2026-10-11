import "server-only";
import { execute, query } from "./db";
import { emptyDecor, normalizeDecor, type Decor } from "./decor-shared";

/**
 * The pictures placed on the sign-in panel and the Winter Arc page. These
 * are public pages, so a database hiccup must never take them down: on any
 * failure they are simply shown undecorated.
 */
export async function getDecor(): Promise<Decor> {
  try {
    const rows = await query<{ value: string }>("SELECT value FROM site_settings WHERE key = 'decor'");
    return rows[0] ? normalizeDecor(JSON.parse(rows[0].value)) : emptyDecor();
  } catch {
    return emptyDecor();
  }
}

/** Saves the layout, and clears out pictures that are no longer placed anywhere. */
export async function saveDecorLayout(input: unknown): Promise<Decor> {
  const wanted = normalizeDecor(input);
  const stored = new Set((await query<{ slot: string }>("SELECT slot FROM site_images WHERE slot LIKE 'd-%'")).map((r) => r.slot));
  // a picture that isn't in storage (removed in another tab, say) is dropped rather than shown broken
  const decor: Decor = { auth: wanted.auth.filter((i) => stored.has(i.id)), arc: wanted.arc.filter((i) => stored.has(i.id)) };
  await execute("INSERT INTO site_settings (key, value) VALUES ('decor', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()", [JSON.stringify(decor)]);
  const used = new Set([...decor.auth, ...decor.arc].map((i) => i.id));
  for (const slot of stored) if (!used.has(slot)) await execute("DELETE FROM site_images WHERE slot = ?", [slot]);
  return decor;
}
