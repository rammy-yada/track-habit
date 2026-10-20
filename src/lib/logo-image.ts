import "server-only";
import sharp from "sharp";
import { queryOne } from "./db";

/** The uploaded logo (Admin → Design → Logo) as a square PNG of `size` pixels, or null when none has been uploaded. */
export async function logoPng(size: number, options: { background?: string } = {}): Promise<Buffer | null> {
  const row = await queryOne<{ image: Buffer }>("SELECT image FROM site_images WHERE slot = 'icon-logo'").catch(() => null);
  if (!row) return null;
  let image = sharp(row.image).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  if (options.background) image = image.flatten({ background: options.background });
  return image.png().toBuffer();
}

/** The same, as a data address for drawing into generated pictures (share cards, link previews). */
export async function logoDataUrl(size: number): Promise<string | null> {
  const png = await logoPng(size);
  return png ? `data:image/png;base64,${png.toString("base64")}` : null;
}

/**
 * The small one-colour mark Android shows in the status bar for a
 * notification: white where the logo has its drawing, see-through elsewhere.
 * For a logo on a see-through background that is its shape; for one on a
 * solid colour, the parts that stand out from that colour.
 */
export async function badgePng(size = 96): Promise<Buffer | null> {
  const row = await queryOne<{ image: Buffer }>("SELECT image FROM site_images WHERE slot = 'icon-logo'").catch(() => null);
  if (!row) return null;
  const { data, info } = await sharp(row.image).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [r0, g0, b0, a0] = [data[0], data[1], data[2], data[3]];
  const seeThrough = a0 < 128;
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    const [r, g, b, a] = [data[i * 4], data[i * 4 + 1], data[i * 4 + 2], data[i * 4 + 3]];
    const ink = seeThrough ? a : a < 128 ? 0 : Math.min(255, (Math.abs(r - r0) + Math.abs(g - g0) + Math.abs(b - b0)) * 2);
    out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = 255;
    out[i * 4 + 3] = ink > 60 ? Math.min(255, ink) : 0;
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}
