import { decorUrl, type DecorItem } from "@/lib/decor-shared";

/**
 * The pictures an admin placed on this area (Admin → Design). They are pure
 * decoration: behind the text, not clickable, and skipped by screen readers.
 * The parent must be positioned; this fills it.
 */
export function Decor({ items, className = "", first = false, area = "100vw" }: { items: DecorItem[]; className?: string; /** On the first screen of the page: fetched straight away rather than when scrolled to. */ first?: boolean; /** How wide the area is on screen (CSS), so the browser can pick the right copy. */ area?: string }) {
  if (items.length === 0) return null;
  return (
    <div aria-hidden data-decor className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {items.map((item) => (
        // eslint-disable-next-line @next/next/no-img-element -- served from the database, already sized and compressed
        <img
          key={item.id}
          src={decorUrl(item.id)}
          // a phone gets a copy sized for a phone; the browser picks by the picture's width on screen
          srcSet={`${decorUrl(item.id)}?w=400 400w, ${decorUrl(item.id)}?w=800 800w, ${decorUrl(item.id)} 1200w`}
          sizes={`calc(${item.w / 100} * ${area})`}
          alt=""
          loading={first ? "eager" : "lazy"}
          fetchPriority={first ? "high" : "auto"}
          decoding="async"
          draggable={false} className="absolute h-auto max-w-none -translate-x-1/2 -translate-y-1/2 select-none" style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.w}%` }} />
      ))}
    </div>
  );
}
