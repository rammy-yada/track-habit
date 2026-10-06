"use client";

import { useLayoutEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PostBody } from "@/components/blog/PostBody";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { UploadTile } from "@/components/ui/UploadTile";
import { btnGhost, btnPrimary, btnSmall, card, input, label } from "@/components/ui/styles";
import { deletePost, savePost } from "@/lib/actions/site-admin";
import { parsePost, plainText, readingMinutes, SEO_DESCRIPTION_MAX, SEO_TITLE_MAX, slugify, wordCount } from "@/lib/blog-format";
import { whenOnline } from "@/lib/offline";
import { send } from "@/lib/request";
import { shrinkImage } from "@/lib/shrink";

export type EditablePost = { id: number | null; title: string; slug: string; excerpt: string; body: string; published: boolean; seoTitle: string; seoDescription: string; tags: string; cover: string | null };

// Toolbar buttons. "wrap" puts marks around the selected words; "line" puts a
// mark at the start of each selected line.
const TOOLS = [
  { key: "h2", label: "H2", title: "Heading", line: "## " },
  { key: "h3", label: "H3", title: "Smaller heading", line: "### " },
  { key: "bold", label: "B", title: "Bold (Ctrl+B)", wrap: "**", sample: "bold text", className: "font-extrabold" },
  { key: "italic", label: "I", title: "Italic (Ctrl+I)", wrap: "*", sample: "italic text", className: "italic" },
  { key: "ul", label: "• List", title: "Bulleted list", line: "- " },
  { key: "ol", label: "1. List", title: "Numbered list", line: "1. " },
  { key: "quote", label: "❝ Quote", title: "Quote", line: "> " },
  { key: "code", label: "</>", title: "Code", wrap: "`", sample: "code" },
  { key: "link", label: "Link", title: "Link (Ctrl+K)" },
  { key: "hr", label: "―", title: "Dividing line" },
] as const;

/**
 * Admin → Blog: the post editor. Writing on the left with a formatting
 * toolbar, a live preview on the right (the same renderer the public page
 * uses), and everything that affects how the post shows up in search results.
 */
export function PostEditor({ post, siteUrl }: { post: EditablePost; siteUrl: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState(post);
  const [saved, setSaved] = useState(post);
  const [slugTouched, setSlugTouched] = useState(post.id !== null);
  const [view, setView] = useState<"write" | "preview">("write");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, startTransition] = useTransition();
  const area = useRef<HTMLTextAreaElement>(null);

  const set = <K extends keyof EditablePost>(key: K, value: EditablePost[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const slug = slugTouched ? slugify(draft.slug) : slugify(draft.title);
  const dirty = (Object.keys(draft) as (keyof EditablePost)[]).some((k) => k !== "cover" && k !== "id" && draft[k] !== saved[k]) || slug !== saved.slug;

  // ── formatting ──
  // Changing the text from code makes the browser drop the cursor at the end.
  // Where it should go instead is remembered here and put back the moment the
  // new text is on screen — before the next key can be typed.
  const caret = useRef<{ from: number; to: number } | null>(null);
  useLayoutEffect(() => {
    const el = area.current;
    if (!el || !caret.current) return;
    el.focus();
    el.setSelectionRange(caret.current.from, caret.current.to);
    caret.current = null;
  }, [draft.body]);

  function edit(change: (text: string, start: number, end: number) => { text: string; from: number; to: number }) {
    const el = area.current;
    if (!el) return;
    const next = change(el.value, el.selectionStart, el.selectionEnd);
    caret.current = { from: next.from, to: next.to };
    set("body", next.text);
  }
  function apply(key: (typeof TOOLS)[number]["key"]) {
    const tool = TOOLS.find((t) => t.key === key)!;
    if ("wrap" in tool) {
      const mark = tool.wrap;
      return edit((text, start, end) => {
        const chosen = text.slice(start, end) || tool.sample;
        return { text: text.slice(0, start) + mark + chosen + mark + text.slice(end), from: start + mark.length, to: start + mark.length + chosen.length };
      });
    }
    if ("line" in tool) {
      const mark = tool.line;
      return edit((text, start, end) => {
        const from = text.lastIndexOf("\n", start - 1) + 1;
        const to = text.indexOf("\n", end) === -1 ? text.length : text.indexOf("\n", end);
        const lines = text.slice(from, to).split("\n").map((line, i) => (key === "ol" ? `${i + 1}. ` : mark) + line.replace(/^\s*(#{1,3}\s+|>\s?|[-*•]\s+|\d+[.)]\s+)/, ""));
        const block = lines.join("\n");
        return { text: text.slice(0, from) + block + text.slice(to), from: from + block.length, to: from + block.length };
      });
    }
    if (key === "hr") return edit((text, start, end) => ({ text: `${text.slice(0, start)}\n\n---\n\n${text.slice(end)}`, from: start + 7, to: start + 7 }));
    // link
    const url = window.prompt("Link address (https://… or /page on this site)", "https://");
    if (!url || !/^(https?:\/\/|\/)\S+$/i.test(url.trim())) return;
    edit((text, start, end) => {
      const chosen = text.slice(start, end) || "link text";
      const inserted = `[${chosen}](${url.trim()})`;
      return { text: text.slice(0, start) + inserted + text.slice(end), from: start + 1, to: start + 1 + chosen.length };
    });
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(e.ctrlKey || e.metaKey)) return;
    const key = { b: "bold", i: "italic", k: "link" }[e.key.toLowerCase()] as "bold" | "italic" | "link" | undefined;
    if (key) {
      e.preventDefault();
      apply(key);
    }
    if (e.key.toLowerCase() === "s") {
      e.preventDefault();
      save(draft.published);
    }
  }

  // ── saving ──
  function save(published: boolean) {
    setMessage(null);
    startTransition(async () => {
      const next = { ...draft, slug, published };
      const result = await whenOnline(() => savePost(draft.id, next));
      if (!result.ok) return setMessage({ ok: false, text: result.error });
      setDraft(next);
      setSaved(next);
      setSlugTouched(true);
      setMessage({ ok: true, text: published ? "Published. It is live on the blog." : "Saved as a draft. Only you can see it." });
      if (draft.id === null && "id" in result && result.id) router.replace(`/sigmadev/blog/${result.id}`);
      else router.refresh();
    });
  }

  async function sendCover(init: RequestInit) {
    if (draft.id === null) return;
    setUploading(true);
    setMessage(null);
    const result = await send<{ url?: string }>(`/api/sigmadev/post-cover?id=${draft.id}`, init);
    setUploading(false);
    if (result.ok) set("cover", result.data.url ?? null);
    else setMessage({ ok: false, text: result.error });
  }

  // ── what search engines will show, and a few checks ──
  const words = wordCount(draft.body);
  const blocks = parsePost(draft.body);
  const seoTitle = draft.seoTitle || draft.title;
  const seoDescription = draft.seoDescription || draft.excerpt || plainText(draft.body).slice(0, 155);
  const fullTitle = `${seoTitle} — HabitFlow`;
  const checks = [
    { ok: seoTitle.length >= 25 && fullTitle.length <= SEO_TITLE_MAX + 12, text: `Title is a good length for search results (${seoTitle.length} characters; 25–60 is best)` },
    { ok: seoDescription.length >= 70 && seoDescription.length <= SEO_DESCRIPTION_MAX, text: `Description is ${seoDescription.length} characters (70–160 is best)` },
    { ok: words >= 300, text: `${words} words (300 or more gives search engines something to work with)` },
    { ok: blocks.some((b) => b.type === "h2"), text: "Has at least one heading (## Heading)" },
    { ok: /\]\((https?:\/\/|\/)/.test(draft.body), text: "Links to another page (a related post, or the sign-up page)" },
    { ok: draft.cover !== null, text: "Has a cover picture (used when the post is shared)" },
    { ok: draft.tags.trim().length > 0, text: "Has topics" },
    { ok: slug.length > 0 && slug.length <= 60, text: "Address is short and readable" },
  ];
  const score = checks.filter((c) => c.ok).length;

  const counter = (length: number, max: number) => <span className={`font-normal tabular-nums ${length > max ? "text-bad" : ""}`}>{` · ${length}/${max}`}</span>;

  return (
    <>
      <PageHeader title={draft.id === null ? "New post" : "Edit post"}>
        <Link href="/sigmadev/blog" className={btnGhost}>
          ← All posts
        </Link>
      </PageHeader>

      <div className="space-y-5 px-4 py-6 md:px-8 md:py-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wider ${saved.published ? "bg-good-soft text-good" : "bg-raised text-muted"}`}>{saved.published ? "Published" : "Draft"}</span>
          {dirty && <span className="text-xs font-medium text-muted">Unsaved changes</span>}
          <span className="flex-1" />
          {saved.published && draft.id !== null && (
            <a href={`/blog/${saved.slug}`} target="_blank" rel="noopener" className={btnSmall}>
              View live ↗
            </a>
          )}
          <button type="button" className={btnGhost} disabled={busy} onClick={() => save(false)}>
            {saved.published ? "Unpublish" : "Save draft"}
          </button>
          <button type="button" className={btnPrimary} disabled={busy} onClick={() => save(true)}>
            {busy ? "Saving…" : saved.published ? "Update" : "Publish"}
          </button>
        </div>

        {message && (
          <p role={message.ok ? "status" : "alert"} className={`rounded-xl px-3.5 py-2.5 text-[13px] font-medium ${message.ok ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
            {message.text}
          </p>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:items-start">
          {/* ── the post ── */}
          <div className="min-w-0 space-y-4">
            <label className="block">
              <span className={label}>Title</span>
              <input className={`${input} font-display text-lg font-bold`} name="post_title" value={draft.title} maxLength={160} placeholder="What is this post about?" onChange={(e) => set("title", e.target.value)} />
            </label>
            <label className="block">
              <span className={label}>
                Summary <span className="font-normal">· shown on the blog page and under the title</span>
                {counter(draft.excerpt.length, 300)}
              </span>
              <textarea className={`${input} min-h-[70px]`} name="post_excerpt" value={draft.excerpt} maxLength={300} placeholder="One or two sentences that make someone want to read it." onChange={(e) => set("excerpt", e.target.value)} />
            </label>

            <div className={`${card} overflow-hidden`}>
              <div className="flex flex-wrap items-center gap-1 border-b border-line bg-raised/60 p-2">
                {TOOLS.map((tool) => (
                  <button key={tool.key} type="button" title={tool.title} aria-label={tool.title} onClick={() => apply(tool.key)} disabled={view === "preview"} className={`grid h-9 min-w-9 place-items-center rounded-lg px-2.5 text-xs font-semibold text-muted hover:bg-card hover:text-ink disabled:opacity-40 ${"className" in tool ? tool.className : ""}`}>
                    {tool.label}
                  </button>
                ))}
                <span className="flex-1" />
                <div className="flex rounded-lg border border-line p-0.5 xl:hidden" role="tablist" aria-label="Editor view">
                  {(["write", "preview"] as const).map((v) => (
                    <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`rounded-md px-3 py-2 text-xs font-semibold capitalize ${view === v ? "bg-brand-solid text-on-brand" : "text-muted"}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 xl:divide-x xl:divide-line">
                <textarea
                  ref={area}
                  name="post_body"
                  value={draft.body}
                  onChange={(e) => set("body", e.target.value)}
                  onKeyDown={onKeyDown}
                  spellCheck
                  placeholder={"Write here.\n\n## A heading\n\nA paragraph with **bold** and a [link](https://example.com).\n\n- A list item"}
                  aria-label="Post text"
                  className={`min-h-[520px] w-full resize-y bg-card p-4 font-mono text-[14px] leading-relaxed text-ink outline-none placeholder:text-muted/60 ${view === "preview" ? "hidden xl:block" : ""}`}
                />
                <div className={`min-h-[520px] min-w-0 overflow-y-auto break-words p-5 ${view === "write" ? "hidden xl:block" : ""}`} aria-label="Preview" data-post-preview>
                  {draft.body.trim() ? <PostBody body={draft.body} /> : <p className="text-sm text-muted">The preview appears here as you write.</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-4 py-2 text-xs text-muted">
                <span>{words} words</span>
                <span>{readingMinutes(draft.body)} min read</span>
                <span className="hidden sm:inline">Ctrl+B bold · Ctrl+I italic · Ctrl+K link · Ctrl+S save</span>
              </div>
            </div>
          </div>

          {/* ── cover, search engines ── */}
          <div className="min-w-0 space-y-4">
            <section className={`${card} p-4`} aria-label="Cover picture">
              <h2 className="text-sm font-bold">Cover picture</h2>
              <div className="mt-3">
                <UploadTile
                  src={draft.cover}
                  alt="Cover picture"
                  emptyNote="Tap to choose a picture, or drop one here. Without one, the site's own picture is used when the post is shared."
                  blocked={draft.id === null ? "Save the post once, then add a picture." : null}
                  accept="image/png,image/webp,image/jpeg"
                  busy={uploading}
                  inputData={{ "data-cover-input": "" }}
                  // made smaller here first: a phone photo is far bigger than a cover needs, and than one request may carry
                  onPick={(chosen) => void shrinkImage(chosen, 1800).then((small) => sendCover({ method: "POST", body: small, headers: { "Content-Type": small.type || "application/octet-stream" } }))}
                  onRemove={() => sendCover({ method: "DELETE" })}
                />
              </div>
              <p className="mt-2 text-xs text-muted">Any JPG, PNG or WebP. It is cropped to 1200×630 and compressed to WebP for you. Only upload pictures you made or may use.</p>
            </section>

            <section className={`${card} space-y-3.5 p-4`} aria-label="Search engines">
              <h2 className="text-sm font-bold">Search engines (SEO)</h2>

              {/* roughly how the post appears in a search result */}
              <div className="rounded-xl border border-line bg-bg p-3.5" data-seo-preview>
                <div className="truncate text-xs text-muted">
                  {siteUrl.replace(/^https?:\/\//, "")} › blog › {slug || "…"}
                </div>
                <div className="mt-0.5 truncate text-[17px] font-medium text-brand">{fullTitle}</div>
                <div className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted">{seoDescription || "A description appears here."}</div>
              </div>

              <label className="block">
                <span className={label}>
                  Address
                  <span className="font-normal"> · /blog/…</span>
                </span>
                <input
                  className={`${input} font-mono text-[13px]`}
                  name="post_slug"
                  value={slugTouched ? draft.slug : slug}
                  maxLength={80}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", e.target.value);
                  }}
                />
                {saved.published && slug !== saved.slug && <span className="mt-1 block text-xs text-bad">Changing the address of a published post breaks links people have already shared.</span>}
              </label>
              <label className="block">
                <span className={label}>
                  Search title <span className="font-normal">· empty = the post&apos;s title</span>
                  {counter((draft.seoTitle || draft.title).length, SEO_TITLE_MAX)}
                </span>
                <input className={input} name="post_seo_title" value={draft.seoTitle} maxLength={70} placeholder={draft.title} onChange={(e) => set("seoTitle", e.target.value)} />
              </label>
              <label className="block">
                <span className={label}>
                  Search description <span className="font-normal">· empty = the summary</span>
                  {counter(seoDescription.length, SEO_DESCRIPTION_MAX)}
                </span>
                <textarea className={`${input} min-h-[80px]`} name="post_seo_description" value={draft.seoDescription} maxLength={170} placeholder={draft.excerpt} onChange={(e) => set("seoDescription", e.target.value)} />
              </label>
              <label className="block">
                <span className={label}>
                  Topics <span className="font-normal">· separated by commas, up to 8</span>
                </span>
                <input className={input} name="post_tags" value={draft.tags} maxLength={200} placeholder="habits, discipline, winter arc" onChange={(e) => set("tags", e.target.value)} />
              </label>

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold">Checklist</h3>
                  <span className={`text-xs font-bold ${score >= 6 ? "text-good" : "text-muted"}`}>
                    {score}/{checks.length}
                  </span>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {checks.map((check) => (
                    <li key={check.text} className="flex gap-2 text-xs leading-snug">
                      <span className={check.ok ? "text-good" : "text-muted"} aria-hidden>
                        {check.ok ? "✓" : "○"}
                      </span>
                      <span className={check.ok ? "text-ink" : "text-muted"}>{check.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {draft.id !== null && (
              <button type="button" className={`${btnSmall} hover:!border-bad hover:!text-bad`} disabled={busy} onClick={() => setDeleting(true)}>
                Delete this post
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleting}
        title="Delete this post?"
        body={`"${saved.title}" will be removed from the blog for good. Links to it will stop working.`}
        confirmLabel="Delete post"
        onConfirm={() =>
          startTransition(async () => {
            const result = await whenOnline(() => deletePost(draft.id!));
            if (result.ok) router.push("/sigmadev/blog");
            else setMessage({ ok: false, text: result.error });
          })
        }
        onClose={() => setDeleting(false)}
      />
    </>
  );
}
