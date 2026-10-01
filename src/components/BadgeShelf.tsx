import { BADGE_RULES } from "@/lib/arc-config";
import type { ShownBadge } from "@/lib/badges";
import { card } from "@/components/ui/styles";

/** A member's Winter Arc badges: the ones earned, and how close the others are. */
export function BadgeShelf({ badges }: { badges: ShownBadge[] }) {
  const earned = badges.filter((b) => b.earned).length;
  return (
    <section className={`${card} p-6 sm:p-7`} aria-label="Winter Arc badges" data-badge-shelf>
      <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-line pb-3">
        <h2 className="text-[15px] font-bold">❄ Winter Arc badges</h2>
        <span className="text-xs font-semibold text-muted">
          {earned} of {badges.length} earned
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {badges.map((badge) => {
          const rule = BADGE_RULES.find((r) => r.value === badge.rule);
          return (
            <li key={badge.id} className={`rounded-2xl border p-3.5 text-center ${badge.earned ? "border-brand bg-brand-soft" : "border-line"}`} data-earned={badge.earned}>
              <div className={`text-3xl leading-none ${badge.earned ? "" : "opacity-35 grayscale"}`} aria-hidden>
                {badge.icon}
              </div>
              <div className="mt-2 text-[13px] font-bold leading-tight">{badge.name}</div>
              {badge.description && <p className="mt-1 text-[11px] leading-snug text-muted">{badge.description}</p>}
              {badge.earned ? (
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-brand">Earned</p>
              ) : badge.rule === "manual" ? (
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted">Given by the team</p>
              ) : (
                <>
                  <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-line" role="img" aria-label={`${Math.round(badge.progress * 100)}% of the way`}>
                    <div className="h-full rounded-full bg-brand-solid" style={{ width: `${badge.progress * 100}%` }} />
                  </div>
                  <p className="mt-1.5 text-[10px] font-semibold text-muted">
                    {badge.threshold.toLocaleString("en-US")} {rule?.unit}
                  </p>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
