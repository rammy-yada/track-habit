import "server-only";
import sharp from "sharp";

/** The narrower copies a stored picture can be asked for (?w=), for phones and small boxes. */
export const WIDTHS = [400, 800] as const;

/**
 * The stored picture, or a narrower copy of it when `w` is one of WIDTHS.
 * Pages offer these through srcset, so a phone downloads a picture sized for
 * a phone. A picture already narrower than `w` is returned as it is.
 */
export async function sizedImage(image: Buffer, mime: string, w: string | null): Promise<{ body: Buffer; type: string }> {
  const width = Number(w);
  if (!(WIDTHS as readonly number[]).includes(width)) return { body: image, type: mime };
  try {
    const body = await sharp(image).resize({ width, withoutEnlargement: true }).webp({ quality: 80, alphaQuality: 85, effort: 4 }).toBuffer();
    return { body, type: "image/webp" };
  } catch {
    return { body: image, type: mime };
  }
}
