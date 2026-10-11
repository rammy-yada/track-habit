// Pictures an admin places on a page (Admin → Design): which ones, where,
// and how big. Shared by the editor, the server and the pages that show them.

/** The places that can be decorated. */
export const DECOR_SCENES = ["auth", "arc"] as const;
export type DecorScene = (typeof DECOR_SCENES)[number];

export type DecorItem = {
  /** The stored picture (see /decor/[id]). */
  id: string;
  /** Where its centre sits, in percent of the area's width and height. */
  x: number;
  y: number;
  /** How wide it is, in percent of the area's width. The height follows the picture. */
  w: number;
};
export type Decor = Record<DecorScene, DecorItem[]>;

export const DECOR_MAX_ITEMS = 12;
export const DECOR_ID = /^d-[0-9a-f]{8}$/;
export const decorUrl = (id: string) => `/decor/${id}`;
export const emptyDecor = (): Decor => ({ auth: [], arc: [] });

const between = (value: unknown, low: number, high: number, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(Math.min(high, Math.max(low, n)) * 10) / 10 : fallback;
};

/** Whatever was stored or sent, reduced to something safe to draw. */
export function normalizeDecor(input: unknown): Decor {
  const out = emptyDecor();
  if (!input || typeof input !== "object") return out;
  for (const scene of DECOR_SCENES) {
    const list = (input as Record<string, unknown>)[scene];
    if (!Array.isArray(list)) continue;
    for (const raw of list.slice(0, DECOR_MAX_ITEMS)) {
      const item = raw as Partial<DecorItem> | null;
      if (!item || typeof item.id !== "string" || !DECOR_ID.test(item.id)) continue;
      out[scene].push({ id: item.id, x: between(item.x, 0, 100, 50), y: between(item.y, 0, 100, 50), w: between(item.w, 4, 100, 25) });
    }
  }
  return out;
}
