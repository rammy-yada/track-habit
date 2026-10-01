// The small, safe writing format used for blog posts, and helpers that both
// the public pages and the admin's editor need. A post is plain text with a
// few marks — it is never treated as HTML, so nothing typed into a post can
// run as code on a reader's page.
//
//   ## Heading        ### Smaller heading
//   - list item       1. numbered item
//   > quote           ---  (a dividing line)
//   **bold**  *italic*  `code`  [link text](https://example.com)

export type Block =
  | { type: "h2" | "h3" | "p" | "quote"; text: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "hr" };

export function parsePost(body: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ type: "p", text: paragraph.join(" ") });
    paragraph = [];
  };
  for (const raw of body.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    const last = blocks[blocks.length - 1];
    let match: RegExpMatchArray | null;
    if (!line) flush();
    else if (/^-{3,}$/.test(line)) (flush(), blocks.push({ type: "hr" }));
    else if ((match = line.match(/^###\s+(.+)/))) (flush(), blocks.push({ type: "h3", text: match[1] }));
    else if ((match = line.match(/^##?\s+(.+)/))) (flush(), blocks.push({ type: "h2", text: match[1] }));
    else if ((match = line.match(/^>\s?(.*)/))) {
      flush();
      if (last?.type === "quote") last.text += ` ${match[1]}`;
      else blocks.push({ type: "quote", text: match[1] });
    } else if ((match = line.match(/^[-*•]\s+(.+)/))) {
      flush();
      if (last?.type === "ul") last.items.push(match[1]);
      else blocks.push({ type: "ul", items: [match[1]] });
    } else if ((match = line.match(/^\d+[.)]\s+(.+)/))) {
      flush();
      if (last?.type === "ol") last.items.push(match[1]);
      else blocks.push({ type: "ol", items: [match[1]] });
    } else paragraph.push(line);
  }
  flush();
  return blocks;
}

export type Inline = { type: "text" | "bold" | "italic" | "code"; text: string } | { type: "link"; text: string; href: string; external: boolean };

const INLINE = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]\n]+\]\((?:https?:\/\/|\/)[^\s)]+\))/g;

/** Splits a line into plain text, bold, italic, code and links. Only http(s) and same-site links are recognised. */
export function parseInline(text: string): Inline[] {
  return text
    .split(INLINE)
    .filter(Boolean)
    .map((part): Inline => {
      const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) return { type: "link", text: link[1], href: link[2], external: /^https?:\/\//i.test(link[2]) };
      if (/^\*\*[^*]+\*\*$/.test(part)) return { type: "bold", text: part.slice(2, -2) };
      if (/^\*[^*]+\*$/.test(part)) return { type: "italic", text: part.slice(1, -1) };
      if (/^`[^`]+`$/.test(part)) return { type: "code", text: part.slice(1, -1) };
      return { type: "text", text: part };
    });
}

/** The post without its marks: for word counts and search-engine descriptions. */
export const plainText = (body: string) =>
  body
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*(#{1,3}|>|[-*•]|\d+[.)])\s+/gm, "")
    .replace(/[*`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const wordCount = (body: string) => (plainText(body).match(/\S+/g) ?? []).length;

/** About how long a post takes to read. */
export const readingMinutes = (body: string) => Math.max(1, Math.round(wordCount(body) / 200));

/** "Why Small Habits Win!" → "why-small-habits-win" */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const parseTags = (tags: string) => [...new Set(tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 8);

// What search engines show before cutting a result short.
export const SEO_TITLE_MAX = 60;
export const SEO_DESCRIPTION_MAX = 160;
