import "server-only";
import { query } from "./db";

export type IntroImages = { before: string | null; after: string | null };

/** Addresses of the admin-uploaded intro pictures (null where none has been uploaded). */
export async function getIntroImages(): Promise<IntroImages> {
  const rows = await query<{ slot: string; version: number }>("SELECT slot, version FROM site_images");
  const url = (slot: string) => {
    const row = rows.find((r) => r.slot === slot);
    return row ? `/api/intro-image/${slot}?v=${row.version}` : null;
  };
  return { before: url("before"), after: url("after") };
}
