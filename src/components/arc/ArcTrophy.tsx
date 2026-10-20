import { card } from "@/components/ui/styles";

/** The trophy's four steps, by perfect days (every habit of the pack done). */
export const TROPHY_TIERS = [
  { days: 30, name: "Bronze", color: "#cd7f32", shade: "#8a4f1d" },
  { days: 60, name: "Silver", color: "#e3e7ec", shade: "#8b939c" },
  { days: 90, name: "Gold", color: "#f7c948", shade: "#a87b0d" },
  { days: 123, name: "Champion", color: "#a5f3fc", shade: "#2b8fa3" },
] as const;

/** A trophy cup, drawn in the tier's colours (or as a dim outline while it is still to be won). `id` names its gradient by what it draws, so two cups that look the same may share one. */
function Cup({ color, shade, won, size, id, preview = false }: { color: string; shade: string; won: boolean; size: number; id: string; /** the next prize, shown faded */ preview?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={won || preview ? color : "transparent"} />
          <stop offset="1" stopColor={won || preview ? shade : "transparent"} />
        </linearGradient>
      </defs>
      <g fill={`url(#${id})`} stroke={won || preview ? shade : "currentColor"} strokeWidth="2" strokeLinejoin="round" opacity={won ? 1 : preview ? 0.45 : 0.35}>
        {/* handles, cup, stem and base */}
        <path d="M16 12h-6c0 9 4 14 10 15M48 12h6c0 9-4 14-10 15" fill="none" />
        <path d="M16 8h32v10c0 11-7 18-16 18S16 29 16 18z" />
        <path d="M28 36h8v8h-8z" />
        <path d="M20 46h24l2 8H18z" />
      </g>
      {won && <path d="M24 14c0 8 2 13 6 16" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="2.5" strokeLinecap="round" />}
    </svg>
  );
}

/**
 * The Winter Arc trophy, at the top of the Arc page: which step of it the
 * member has won (Bronze at 30 perfect days, then Silver, Gold, Champion at
 * every single day), how far the next one is, and whether it can still be
 * reached in the days that are left.
 */
export function ArcTrophy({ perfectDays, daysLeft, member }: { perfectDays: number; daysLeft: number; member: boolean }) {
  const won = [...TROPHY_TIERS].reverse().find((t) => perfectDays >= t.days) ?? null;
  const next = TROPHY_TIERS.find((t) => perfectDays < t.days) ?? null;
  // the best still possible if every day from today on is perfect
  const reachable = [...TROPHY_TIERS].reverse().find((t) => perfectDays + daysLeft >= t.days) ?? null;
  // the trophy shown big: the one won, or else the next one to win, faded
  const shown = won ?? next ?? TROPHY_TIERS[0];
  const from = won?.days ?? 0;

  return (
    <section className={`${card} overflow-hidden p-5`} aria-label="Winter Arc trophy" data-arc-trophy>
      <div className="flex items-center gap-4">
        <div className={`relative shrink-0 ${won ? "text-ink" : "text-muted"}`}>
          {won && <span aria-hidden className="absolute inset-2 rounded-full blur-xl" style={{ background: won.color, opacity: 0.35 }} />}
          <span className="relative block">
            <Cup color={shown.color} shade={shown.shade} won={won !== null} preview={won === null} size={76} id={`trophy-${shown.name}-${won ? "won" : "next"}`} />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Winter Arc trophy</p>
          <h2 className="font-display text-xl font-bold tracking-tight">{won ? (won.name === "Champion" ? "Champion 🏆" : `${won.name} trophy`) : member ? "Not won yet" : "Win the trophy"}</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            {!member
              ? "Join the Winter Arc and finish every habit of your pack on 30 days to win Bronze."
              : next
                ? `${perfectDays} perfect ${perfectDays === 1 ? "day" : "days"} · ${next.days - perfectDays} more for ${next.name}`
                : "Every single day of the Winter Arc. Legendary."}
          </p>
        </div>
      </div>

      {member && next && (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-brand-solid transition-[width] duration-700" style={{ width: `${Math.min(100, ((perfectDays - from) / (next.days - from)) * 100)}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">
            {reachable && reachable.days > (won?.days ?? 0)
              ? `${reachable.name} is still within reach if you don't miss a day from now on.`
              : won
                ? `Your ${won.name} trophy is yours to keep. Keep going for the leaderboard.`
                : "The days left aren't enough for Bronze this season — every perfect day still counts for badges and points."}
          </p>
        </div>
      )}

      {/* the four steps */}
      <ul className="mt-4 grid grid-cols-4 gap-2">
        {TROPHY_TIERS.map((tier) => {
          const has = perfectDays >= tier.days && member;
          return (
            <li key={tier.name} className={`rounded-xl border px-1 py-2 text-center ${has ? "border-brand bg-brand-soft" : "border-line"}`} title={`${tier.name}: ${tier.days} perfect days`} data-trophy-tier={tier.name} data-won={has}>
              <span className={`mx-auto block w-fit ${has ? "" : "text-muted"}`}>
                <Cup color={tier.color} shade={tier.shade} won={has} size={30} id={`trophy-${tier.name}-${has ? "won" : "off"}`} />
              </span>
              <span className="mt-1 block text-[10px] font-semibold">{tier.name}</span>
              <span className="block text-[9px] text-muted">{tier.days}d</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
