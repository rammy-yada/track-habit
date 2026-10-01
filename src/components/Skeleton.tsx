/** Grey placeholder shapes shown the instant you tap a link, while the page's data loads. */
export function PageSkeleton({ rows = 4, tiles = 4 }: { rows?: number; tiles?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="flex items-center justify-between border-b border-line px-4 py-4 md:px-8 md:py-5">
        <div className="skeleton h-7 w-44" />
        <div className="skeleton h-9 w-28" />
      </div>
      <div className="space-y-6 px-4 py-6 md:px-8 md:py-7">
        {tiles > 0 && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            {Array.from({ length: tiles }, (_, i) => (
              <div key={i} className="skeleton h-24 rounded-2xl" />
            ))}
          </div>
        )}
        <div className="skeleton h-5 w-40" />
        <div className="space-y-2.5">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="skeleton h-[76px] rounded-2xl" style={{ animationDelay: `${i * 90}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
