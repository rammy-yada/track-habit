"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { addPopularHabit } from "@/lib/actions/arc";
import { whenOnline } from "@/lib/offline";
import type { PopularItem } from "@/lib/popular";

type Product = { id: number; name: string; price: string; description: string; category: string; image: string | null };
type Tab = "skills" | "shop";

/**
 * The Popular section. Two views, switched with a pill that floats at the
 * bottom of the screen: the habits and skills most people here are building
 * (add any with a tap), and — once there is at least one — products to buy.
 */
export function PopularScreen({ popular, products }: { popular: PopularItem[]; products: Product[] }) {
  const [tab, setTab] = useState<Tab>("skills");
  const [added, setAdded] = useState<Set<string>>(() => new Set(popular.filter((p) => p.mine).map((p) => p.name)));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");
  const [, startTransition] = useTransition();
  const hasShop = products.length > 0;
  const top = Math.max(1, popular[0]?.people ?? 0);
  const categories = ["All", ...new Set(products.map((p) => p.category).filter(Boolean))];
  const shown = products.filter((p) => filter === "All" || p.category === filter);

  function add(name: string) {
    setBusy(name);
    setError(null);
    startTransition(async () => {
      const result = await whenOnline(() => addPopularHabit(name));
      setBusy(null);
      if (result.ok) setAdded((current) => new Set(current).add(name));
      else setError(result.error);
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg" data-popular>
      <header className="flex items-center px-3 pb-1 pt-[calc(10px+env(safe-area-inset-top))] sm:px-6">
        <Link href="/dashboard" aria-label="Back to Today" className="grid h-10 w-10 place-items-center rounded-full border border-line bg-card text-ink shadow-sm">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <h1 className="sr-only">Popular</h1>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className={`mx-auto w-full max-w-3xl px-4 pt-3 sm:px-6 ${hasShop ? "pb-28" : "pb-10"}`}>
          {error && (
            <p role="alert" className="mb-3 rounded-xl bg-bad-soft px-3.5 py-2.5 text-[13px] font-medium text-bad">
              {error}
            </p>
          )}

          {tab === "skills" && (
            <section aria-label="Popular skills">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">Popular right now</p>
              <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">What people here are building</h2>
              <p className="mt-1 text-sm text-muted">Ranked by how many members have each one on their list. Tap + to add it to yours.</p>
              <ol className="mt-5 space-y-2">
                {popular.map((item, i) => {
                  const on = added.has(item.name);
                  return (
                    <motion.li key={item.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.04 }} className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-line bg-card px-3.5 py-3" data-popular-item={item.name}>
                      {/* how it compares with the most popular one */}
                      <span aria-hidden className="absolute inset-y-0 left-0 bg-brand-soft/70" style={{ width: `${(item.people / top) * 100}%` }} />
                      <span className="relative w-6 text-center text-sm font-bold tabular-nums text-muted">{i + 1}</span>
                      <span className="relative text-2xl" aria-hidden>
                        {item.icon}
                      </span>
                      <span className="relative min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold">{item.name}</span>
                        <span className="block truncate text-xs text-muted">
                          {item.people > 0 ? `${item.people} ${item.people === 1 ? "person" : "people"}` : "Be the first"} · {item.group}
                        </span>
                      </span>
                      <button type="button" onClick={() => add(item.name)} disabled={on || busy !== null} aria-label={on ? `${item.name}: on your list` : `Add ${item.name}`} className={`relative grid h-9 min-w-9 place-items-center rounded-full px-3 text-xs font-bold ${on ? "bg-good-soft text-good" : "bg-brand-solid text-on-brand"}`}>
                        {busy === item.name ? "…" : on ? "✓" : "+"}
                      </button>
                    </motion.li>
                  );
                })}
              </ol>
            </section>
          )}

          {tab === "shop" && (
            <section aria-label="Buy products">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">Shop</p>
              <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">Gear for the grind</h2>
              <p className="mt-1 text-sm text-muted">Buy opens the seller&apos;s page. HabitFlow doesn&apos;t take payments or store card details.</p>
              {categories.length > 2 && (
                <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Product categories">
                  {categories.map((c) => (
                    <button key={c} type="button" role="tab" aria-selected={filter === c} onClick={() => setFilter(c)} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${filter === c ? "border-brand bg-brand-solid text-on-brand" : "border-line text-muted"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              )}
              <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {shown.map((product) => (
                  <li key={product.id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card" data-product={product.name} data-true-color>
                    {product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- a small WebP served by our own route
                      <img src={product.image} alt={product.name} width={800} height={800} loading="lazy" decoding="async" className="aspect-square w-full object-cover" />
                    ) : (
                      <div aria-hidden className="grid aspect-square w-full place-items-center bg-raised text-4xl">
                        🛍️
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-3">
                      <h3 className="line-clamp-2 text-sm font-bold leading-snug">{product.name}</h3>
                      {product.description && <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted">{product.description}</p>}
                      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                        <span className="truncate text-sm font-bold">{product.price}</span>
                        <a href={`/shop/go/${product.id}`} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-full bg-brand-solid px-3.5 py-1.5 text-xs font-bold text-on-brand">
                          Buy
                        </a>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {/* the switch between the two views floats above the content, within reach of a thumb */}
      {hasShop && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[calc(18px+env(safe-area-inset-bottom))] flex justify-center px-4">
          <div role="tablist" aria-label="Popular sections" className="pointer-events-auto flex rounded-full border border-line bg-card p-1 shadow-[0_10px_30px_-8px_rgb(0_0_0/0.45)]">
            {(
              [
                ["skills", "🔥 Popular skills"],
                ["shop", "🛍️ Buy products"],
              ] as const
            ).map(([id, text]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`relative rounded-full px-4 py-2.5 text-sm font-semibold ${tab === id ? "text-on-brand" : "text-muted"}`} data-popular-tab={id}>
                {tab === id && <motion.span layoutId="popular-pill" className="absolute inset-0 rounded-full bg-brand-solid" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <span className="relative">{text}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
