"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { UploadTile } from "@/components/ui/UploadTile";
import { btnGhost, btnPrimary, btnSmall, card, eyebrow, input, label } from "@/components/ui/styles";
import { deleteProduct, saveProduct } from "@/lib/actions/site-admin";
import { whenOnline } from "@/lib/offline";
import { send } from "@/lib/request";
import type { Product } from "@/lib/products";
import { shrinkImage } from "@/lib/shrink";

type Row = Product & { added: string };
type Draft = { id: number | null; name: string; price: string; description: string; url: string; category: string; active: boolean; image: string | null };
const BLANK: Draft = { id: null, name: "", price: "", description: "", url: "", category: "", active: true, image: null };
type Sort = "newest" | "clicks" | "name";

/**
 * Admin → Sellers: the products shown in the members' Popular section. Search,
 * filter and sort the list; add, edit, hide or delete a product; and see how
 * many times each Buy button has been tapped. The Buy section only appears to
 * members once at least one product is switched on.
 */
export function AdminProducts({ products }: { products: Row[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [show, setShow] = useState<"all" | "live" | "hidden">("all");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<Sort>("newest");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, startTransition] = useTransition();
  const closeDelete = useCallback(() => setDeleting(null), []);
  const closeDraft = useCallback(() => setDraft(null), []);

  const live = products.filter((p) => p.active).length;
  const clicks = products.reduce((sum, p) => sum + p.clicks, 0);
  const categories = ["All", ...new Set(products.map((p) => p.category).filter(Boolean))];
  const words = search.trim().toLowerCase();
  const list = products
    .filter((p) => (show === "all" || (show === "live") === p.active) && (category === "All" || p.category === category) && (!words || `${p.name} ${p.description} ${p.category} ${p.price}`.toLowerCase().includes(words)))
    .sort((a, b) => (sort === "clicks" ? b.clicks - a.clicks : sort === "name" ? a.name.localeCompare(b.name) : 0));

  function save(next: Draft, keepOpen = false) {
    setMessage(null);
    startTransition(async () => {
      const result = await whenOnline(() => saveProduct(next.id, next));
      if (!result.ok) return setMessage({ ok: false, text: result.error });
      if (keepOpen && "id" in result && result.id) setDraft({ ...next, id: result.id });
      else setDraft(null);
      router.refresh();
    });
  }

  async function sendImage(id: number, init: RequestInit) {
    setUploading(true);
    setMessage(null);
    const result = await send<{ url?: string }>(`/api/sigmadev/product-image?id=${id}`, init);
    setUploading(false);
    if (!result.ok) return setMessage({ ok: false, text: result.error });
    setDraft((d) => (d ? { ...d, image: result.data.url ?? null } : d));
    router.refresh();
  }

  return (
    <>
      <PageHeader title="Sellers">
        <button type="button" className={btnPrimary} onClick={() => setDraft(BLANK)}>
          <span className="text-base leading-none">+</span> Add product
        </button>
      </PageHeader>

      <div className="space-y-4 px-4 py-6 md:px-8 md:py-7" data-admin-products>
        <div className="grid grid-cols-3 gap-3 lg:max-w-2xl">
          {[
            ["Products", products.length],
            ["Shown to members", live],
            ["Buy taps", clicks],
          ].map(([name, value]) => (
            <div key={name} className={`${card} p-4`}>
              <div className="text-2xl font-semibold tabular-nums">{Number(value).toLocaleString("en-US")}</div>
              <div className={`${eyebrow} mt-1`}>{name}</div>
            </div>
          ))}
        </div>
        <p className="max-w-2xl text-sm text-muted">
          {live === 0 ? "Members don't see a Buy section yet. It appears in Popular as soon as one product is switched on." : "These appear under Popular → Buy products."} The site takes no payments: each Buy button opens the link you give it (your store page, a payment page, a WhatsApp link…).
        </p>

        <div className="flex flex-wrap gap-2.5">
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, description, category or price…" aria-label="Search products" className={`${input} min-w-0 flex-1 sm:max-w-sm`} />
          <select className={`${input} w-auto`} value={show} onChange={(e) => setShow(e.target.value as typeof show)} aria-label="Show">
            <option value="all">All</option>
            <option value="live">Shown</option>
            <option value="hidden">Hidden</option>
          </select>
          {categories.length > 1 && (
            <select className={`${input} w-auto`} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          )}
          <select className={`${input} w-auto`} value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort by">
            <option value="newest">Newest first</option>
            <option value="clicks">Most Buy taps</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
        {message && !draft && (
          <p role={message.ok ? "status" : "alert"} className={`rounded-xl px-3.5 py-2.5 text-[13px] font-medium ${message.ok ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
            {message.text}
          </p>
        )}
        <p className="text-xs font-medium text-muted">
          {list.length} of {products.length} {products.length === 1 ? "product" : "products"}
        </p>

        {products.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-12 text-center text-sm text-muted">No products yet. Add the first one and the Buy section appears for members.</p>
        ) : list.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">Nothing matches.</p>
        ) : (
          <ul className={`space-y-2.5 ${busy ? "opacity-70" : ""}`}>
            {list.map((p) => (
              <li key={p.id} className={`${card} flex flex-wrap items-center gap-4 p-3.5 ${p.active ? "" : "opacity-60"}`} data-product-row={p.name}>
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-raised" data-true-color>
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- a small WebP served by our own route
                    <img src={p.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-2xl" aria-hidden>
                      🛍️
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1 basis-52">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-bold">{p.name}</span>
                    {!p.active && <span className="rounded-md bg-raised px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">Hidden</span>}
                    {p.category && <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">{p.category}</span>}
                  </div>
                  <div className="truncate text-xs text-muted">
                    {p.price || "No price"} · {p.clicks} Buy {p.clicks === 1 ? "tap" : "taps"} · added {p.added}
                  </div>
                  <a href={p.url} target="_blank" rel="noopener noreferrer nofollow" className="block truncate text-xs font-medium text-brand hover:underline">
                    {p.url}
                  </a>
                </div>
                <div className="flex gap-1.5">
                  <button type="button" className={btnSmall} disabled={busy} onClick={() => setDraft({ id: p.id, name: p.name, price: p.price, description: p.description, url: p.url, category: p.category, active: p.active, image: p.image })}>
                    Edit
                  </button>
                  <button type="button" className={btnSmall} disabled={busy} onClick={() => save({ id: p.id, name: p.name, price: p.price, description: p.description, url: p.url, category: p.category, active: !p.active, image: p.image })}>
                    {p.active ? "Hide" : "Show"}
                  </button>
                  <button type="button" className={`${btnSmall} hover:!border-bad hover:!text-bad`} disabled={busy} onClick={() => setDeleting(p)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={draft !== null} onClose={closeDraft} title={draft?.id ? "Edit product" : "New product"}>
        {draft && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save(draft, draft.id === null); // a new product stays open once saved, so its picture can be added
            }}
          >
            {message && (
              <p role={message.ok ? "status" : "alert"} className={`rounded-xl px-3.5 py-2.5 text-[13px] font-medium ${message.ok ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
                {message.text}
              </p>
            )}
            <label className="block">
              <span className={label}>Name</span>
              <input className={input} name="product_name" value={draft.name} maxLength={80} required onChange={(e) => setDraft({ ...draft, name: e.target.value })} data-autofocus />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={label}>Price</span>
                <input className={input} name="product_price" value={draft.price} maxLength={40} placeholder="Rs 499" onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
              </label>
              <label className="block">
                <span className={label}>Category</span>
                <input className={input} name="product_category" value={draft.category} maxLength={40} placeholder="Bottles, Books…" onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
              </label>
            </div>
            <label className="block">
              <span className={label}>Where people buy it (link)</span>
              <input className={input} name="product_url" value={draft.url} maxLength={300} required placeholder="https://" inputMode="url" onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
            </label>
            <label className="block">
              <span className={label}>Description</span>
              <textarea className={`${input} min-h-[80px]`} name="product_description" value={draft.description} maxLength={600} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
              <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} className="h-5 w-5 accent-[var(--brand-solid)]" />
              Show to members
            </label>
            <UploadTile
              shape="row"
              src={draft.image}
              alt="Product picture"
              title="Picture"
              note="Square works best. It is cropped and compressed for you."
              emptyNote=""
              accept="image/png,image/webp,image/jpeg"
              busy={uploading}
              blocked={draft.id === null ? "Save the product first, then add its picture." : null}
              inputData={{ "data-product-input": "" }}
              onPick={(file) => void shrinkImage(file, 1400).then((small) => sendImage(draft.id!, { method: "POST", body: small, headers: { "Content-Type": small.type || "application/octet-stream" } }))}
              onRemove={() => sendImage(draft.id!, { method: "DELETE" })}
            />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={closeDraft}>
                {draft.id ? "Close" : "Cancel"}
              </button>
              <button type="submit" className={btnPrimary} disabled={busy}>
                {busy ? "Saving…" : draft.id ? "Save" : "Save and add a picture"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog open={deleting !== null} title="Delete this product?" body={`"${deleting?.name ?? ""}" will be removed from the shop for good.`} confirmLabel="Delete product" onConfirm={() => deleting && startTransition(async () => void (await whenOnline(() => deleteProduct(deleting.id)), router.refresh()))} onClose={closeDelete} />
    </>
  );
}
