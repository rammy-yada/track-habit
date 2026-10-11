import "server-only";
import { cache } from "react";
import { queryOne } from "./db";

/**
 * Has an admin uploaded their own logo (Admin → Design → Logo), and which
 * upload is it? 0: the built-in logo. Otherwise the upload's number, which
 * goes into the picture's address so browsers fetch a new logo at once.
 *
 * Asked once per page (the layout, its icons and the logo itself share the
 * answer) and never remembered between pages, so a change shows everywhere
 * straight away. Pages built ahead of time are rebuilt when the logo changes.
 */
export const logoVersion = cache(async (): Promise<number> => {
  try {
    const row = await queryOne<{ version: number }>("SELECT version FROM site_images WHERE slot = 'icon-logo'");
    return row ? Number(row.version) : 0;
  } catch {
    return 0; // the database is busy: the logo is not worth failing a page over
  }
});
