// The PHP app ran htmlspecialchars() on text *before* storing it, so older
// rows hold "Tom &amp; Jerry". React escapes on output, so we store raw text
// now and undo the old encoding when reading.
const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#039;": "'", "&#39;": "'" };

export function decodeEntities(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/&(amp|lt|gt|quot|#0?39);/g, (match) => ENTITIES[match] ?? match);
}

/** Trim and drop control characters; React handles HTML escaping on output. */
export function clean(value: FormDataEntryValue | null | undefined, maxLength = 255): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, maxLength);
}

export function initial(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}
