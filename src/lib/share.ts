// Sharing a generated picture from a web page. On a phone this hands the
// picture to the system share menu — which is how a website posts to
// Instagram, Facebook, TikTok, WhatsApp and the rest: you pick the app there.
// On a computer there is no such menu, so the picture is downloaded instead.

export const canShareFiles = () => typeof navigator.canShare === "function" && navigator.canShare({ files: [new File([""], "x.png", { type: "image/png" })] });

export const fetchPicture = async (url: string, name: string) => new File([await (await fetch(url)).blob()], name, { type: "image/png" });

/** Opens the share menu. Returns false if the person closed it, and throws if it couldn't open. */
export async function sharePicture(file: File, caption: string): Promise<boolean> {
  // Instagram and TikTok take the picture but drop the text: put the caption on the clipboard to paste
  await navigator.clipboard?.writeText(caption).catch(() => {});
  try {
    await navigator.share({ files: [file], text: caption });
    return true;
  } catch (err) {
    if ((err as Error).name === "AbortError") return false;
    throw err;
  }
}

export function downloadPicture(file: File): void {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(link.href);
}
