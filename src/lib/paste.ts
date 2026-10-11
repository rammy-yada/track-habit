// Turns formatted text copied from somewhere else (a web page, Google Docs,
// Word, another blog) into the plain marks the post editor uses: "## " for a
// heading, **bold**, *italic*, [links](…), "- " lists, "> " quotes.
// Anything it doesn't know is kept as plain words; nothing else comes along —
// no colours, fonts, scripts or styles.

const BLOCKS = new Set(["P", "DIV", "SECTION", "ARTICLE", "HEADER", "FOOTER", "MAIN", "ASIDE", "FIGURE", "FIGCAPTION", "TABLE", "TR"]);
const SKIP = new Set(["SCRIPT", "STYLE", "META", "LINK", "TITLE", "HEAD", "NOSCRIPT", "IFRAME", "SVG", "BUTTON", "INPUT", "SELECT", "TEXTAREA"]);

function inline(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? "").replace(/\s+/g, " ");
  if (!(node instanceof HTMLElement) || SKIP.has(node.tagName.toUpperCase())) return "";
  const inner = () => [...node.childNodes].map(inline).join("");
  const tag = node.tagName;
  if (tag === "BR") return "\n";
  // Google Docs and Word say bold and italic with styles rather than tags (Docs even wraps everything in a <b> that isn't bold)
  const weight = node.style.fontWeight;
  const bold = weight ? weight === "bold" || Number(weight) >= 600 : tag === "B" || tag === "STRONG";
  const italic = node.style.fontStyle ? node.style.fontStyle === "italic" : tag === "I" || tag === "EM";
  let text = inner();
  if (tag === "A") {
    const href = node.getAttribute("href") ?? "";
    return /^(https?:\/\/|\/)\S+$/i.test(href) && text.trim() ? `[${text.trim()}](${href})` : text;
  }
  if (tag === "CODE" && text.trim() && !text.includes("`")) return `\`${text.trim()}\``;
  // the marks go tight around the words, with any outer spaces left outside them
  const wrap = (mark: string) => (text = text.trim() ? text.replace(/^(\s*)([\s\S]*?)(\s*)$/, (_, a, body, b) => `${a}${mark}${body}${mark}${b}`) : text);
  if (italic) wrap("*");
  if (bold) wrap("**");
  return text;
}

function block(node: Node, out: string[], depth = 0): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent ?? "").replace(/\s+/g, " ");
    if (text.trim()) out.push(text.trim());
    return;
  }
  if (!(node instanceof HTMLElement) || SKIP.has(node.tagName.toUpperCase())) return;
  const tag = node.tagName;
  const line = () => inline(node).replace(/\n+/g, " ").trim();
  if (/^H[1-6]$/.test(tag)) {
    const text = line().replace(/\*\*/g, "");
    if (text) out.push(`${tag === "H1" || tag === "H2" ? "##" : "###"} ${text}`);
  } else if (tag === "UL" || tag === "OL") {
    const items = [...node.children].filter((c) => c.tagName === "LI");
    const lines = items.map((li, i) => `${tag === "OL" ? `${i + 1}.` : "-"} ${inline(li).replace(/\s*\n\s*/g, " ").trim()}`).filter((l) => l.length > 3);
    if (lines.length) out.push(lines.join("\n"));
  } else if (tag === "BLOCKQUOTE") {
    const inner: string[] = [];
    for (const child of node.childNodes) block(child, inner, depth + 1);
    const text = inner.join("\n").trim() || line();
    if (text) out.push(text.split("\n").map((l) => `> ${l}`).join("\n"));
  } else if (tag === "PRE") {
    const text = (node.textContent ?? "").trim();
    if (text) out.push(text);
  } else if (tag === "HR") {
    out.push("---");
  } else if ([...node.children].some((c) => BLOCKS.has(c.tagName) || /^(H[1-6]|UL|OL|BLOCKQUOTE|PRE|HR)$/.test(c.tagName))) {
    // a wrapper around other blocks: go inside
    for (const child of node.childNodes) block(child, out, depth + 1);
  } else {
    // a paragraph (or anything that only holds words): a line break inside it stays a line break
    const text = inline(node).split("\n").map((l) => l.trim()).join("\n").trim();
    if (text) out.push(text);
  }
}

/** Is there formatting in this copied HTML worth keeping? (Plain text copied from a web page also arrives as HTML.) */
export const hasFormatting = (html: string) => /<(h[1-6]|strong|b|em|i|a|ul|ol|li|blockquote|code|pre)[\s>]/i.test(html) || /font-weight:\s*(bold|[6-9]00)|font-style:\s*italic/i.test(html);

export function htmlToPost(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out: string[] = [];
  for (const child of doc.body.childNodes) block(child, out);
  return out.join("\n\n").replace(/ /g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
