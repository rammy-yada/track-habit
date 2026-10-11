// Cropping a picture before it is uploaded. Anything that uploads a photo
// calls cropPhoto(file, …); the dialog itself (components/ui/CropDialog) is
// mounted once for the whole app and answers through the promise.

export type CropRequest = {
  file: File;
  /** Width ÷ height the place this picture goes into has. Leave out when any shape is fine. */
  aspect?: number;
  /** What the picture is for, shown as the dialog's title: "Cover picture". */
  title: string;
  done: (result: File | null) => void;
};

let open: ((request: CropRequest) => void) | null = null;
export const setCropHost = (host: typeof open) => void (open = host);

/**
 * Lets the person crop `file`. Resolves with the cropped picture, with the
 * file itself if they chose to keep all of it, or with null if they backed
 * out. (With no dialog on the page, or a file that isn't a picture, the file
 * goes through as it is.)
 */
export function cropPhoto(file: File, options: { aspect?: number; title: string }): Promise<File | null> {
  if (!open || !file.type.startsWith("image/")) return Promise.resolve(file);
  return new Promise((done) => open!({ file, ...options, done }));
}

export type Area = { x: number; y: number; w: number; h: number };

/** Cuts `area` (fractions of the picture, 0–1) out of the picture. A PNG or WebP stays a PNG so a see-through background survives. */
export async function cutOut(file: File, area: Area): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const sx = Math.round(area.x * bitmap.width);
  const sy = Math.round(area.y * bitmap.height);
  const sw = Math.max(1, Math.round(area.w * bitmap.width));
  const sh = Math.max(1, Math.round(area.h * bitmap.height));
  const scale = Math.min(1, 2000 / Math.max(sw, sh)); // more than any place on the site shows
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  canvas.getContext("2d")!.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  const type = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));
  return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + (type === "image/jpeg" ? ".jpg" : ".png"), { type }) : file;
}
