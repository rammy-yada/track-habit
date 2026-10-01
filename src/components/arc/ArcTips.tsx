import { card, eyebrow } from "@/components/ui/styles";
import { TIP_GROUPS, tipOfTheDay } from "@/lib/arc-tips";

/** The Tips tab: one tip for today, then all of them by theme. */
export function ArcTips({ dayNumber }: { dayNumber: number }) {
  const today = tipOfTheDay(dayNumber);
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-ink p-6 text-bg" aria-label="Tip of the day">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">
          {today.icon} Tip of the day · {today.group}
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">{today.title}</h2>
        <p className="mt-2 text-[15px] leading-relaxed opacity-85">{today.body}</p>
      </section>

      {TIP_GROUPS.map((group) => (
        <section key={group.id} aria-label={group.label}>
          <h3 className={`${eyebrow} mb-2.5`}>
            {group.icon} {group.label}
          </h3>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {group.tips.map((tip) => (
              <li key={tip.title} className={`${card} p-4`}>
                <h4 className="text-sm font-bold">{tip.title}</h4>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{tip.body}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
