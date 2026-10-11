import { decorUrl, type DecorItem } from "@/lib/decor-shared";

/**
 * The pictures an admin placed on this area (Admin → Design). They are pure
 * decoration: behind the text, not clickable, and skipped by screen readers.
 * The parent must be positioned; this fills it.
 */
export function Decor({ items, className = "" }: { items: DecorItem[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <div aria-hidden data-decor className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {items.map((item) => (
        // eslint-disable-next-line @next/next/no-img-element -- served from the database, already sized and compressed
        <img key={item.id} src={decorUrl(item.id)} alt="" loading="lazy" decoding="async" draggable={false} className="absolute h-auto max-w-none -translate-x-1/2 -translate-y-1/2 select-none" style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.w}%` }} />
      ))}
    </div>
  );
}
