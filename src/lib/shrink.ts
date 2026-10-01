/**
 * Shrinks a picture in the browser before it is uploaded, so a 6 MB phone
 * photo goes up as a few hundred KB. That saves the person's data and time,
 * and keeps the upload under the host's size limit for a single request.
 * (The server re-encodes whatever arrives regardless.)
 */
export async function shrinkImage(file: File, maxSide: number, quality = 0.86): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => null);
  if (!bitmap) return file; // a format this browser can't decode: let the server try
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 900_000) return file; // already small
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const encode = (type: string, q: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, q));
  const webp = await encode("image/webp", quality);
  // Safari can't write WebP from a canvas and quietly returns PNG; use JPEG there
  return (webp?.type === "image/webp" ? webp : await encode("image/jpeg", quality)) ?? file;
}
