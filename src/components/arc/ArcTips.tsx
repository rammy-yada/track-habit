"use client";

import { useRef, useState } from "react";
import { btnPrimary, card, eyebrow } from "@/components/ui/styles";
import { SITUATION_LABEL, TIP_GROUPS, TIPS_FOR, tipOfTheDay, type Situation } from "@/lib/arc-tips";

type Card = { title: string; body: string; label: string; personal: boolean };

/**
 * The Tips tab: a deck of tip cards to swipe through (or step through with
 * "Give me a tip"). The first cards are picked from how the person's last
 * days have gone — a missed day, a habit they keep skipping, a hard week, a
 * growing streak — and the rest follow, starting with today's tip. Every tip
 * is also listed by theme underneath, folded away.
 */
export function ArcTips({ dayNumber, situations, neglected }: { dayNumber: number; situations: Situation[]; neglected: { name: string; days: number } | null }) {
  const personal: Card[] = situations.flatMap((s) =>
    TIPS_FOR[s].map((tip, i) =>
      // the skipped habit gets named on the first tip about it
      s === "neglect" && neglected && i === 0
        ? { title: `Shrink “${neglected.name}” for now`, body: `${neglected.days} days without a tick. ${tip.body}`, label: SITUATION_LABEL[s], personal: true }
        : { ...tip, label: SITUATION_LABEL[s], personal: true },
    ),
  );
  const all = TIP_GROUPS.flatMap((g) => g.tips.map((tip) => ({ ...tip, label: `${g.icon} ${g.label}`, personal: false })));
  const start = all.findIndex((t) => t.title === tipOfTheDay(dayNumber).title);
  const general = [...all.slice(start), ...all.slice(0, start)];
  const seen = new Set(personal.map((t) => t.title));
  const cards: Card[] = [...personal, ...general.filter((t) => !seen.has(t.title))];

  const deck = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const go = (index: number) => {
    const el = deck.current;
    const next = (index + cards.length) % cards.length;
    const target = el?.children[next] as HTMLElement | undefined;
    if (el && target) el.scrollTo({ left: target.offsetLeft - el.offsetLeft, behavior: "smooth" });
    setAt(next);
  };

  return (
    <div className="space-y-5" data-arc-tips>
      <section aria-label="Tips for you" aria-roledescription="carousel">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <h2 className={eyebrow}>{personal.length > 0 ? "Tips for you" : "Tip of the day"}</h2>
          <span className="text-xs tabular-nums text-muted" aria-live="polite">
            {at + 1} of {cards.length}
          </span>
        </div>
        {/* swipe on a phone; each card snaps into place */}
        <div
          ref={deck}
          onScroll={(e) => {
            const el = e.currentTarget;
            const first = el.children[0] as HTMLElement | undefined;
            if (first) setAt(Math.min(cards.length - 1, Math.round(el.scrollLeft / (first.offsetWidth + 12))));
          }}
          className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          data-tip-deck
        >
          {cards.map((tip, i) => (
            <article
              key={tip.title}
              aria-label={`Tip ${i + 1} of ${cards.length}`}
              className={`flex min-h-[190px] w-[85%] shrink-0 snap-center flex-col rounded-2xl p-6 sm:w-[60%] ${tip.personal ? "bg-ink text-bg" : `${card}`}`}
              data-tip-card={tip.personal ? "personal" : "general"}
            >
              <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${tip.personal ? "opacity-70" : "text-muted"}`}>{tip.label}</p>
              <h3 className="mt-2 font-display text-xl font-bold leading-snug tracking-tight">{tip.title}</h3>
              <p className={`mt-2 text-[14.5px] leading-relaxed ${tip.personal ? "opacity-85" : "text-muted"}`}>{tip.body}</p>
            </article>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-center gap-2">
          <button type="button" onClick={() => go(at - 1)} aria-label="Previous tip" className="grid h-10 w-10 place-items-center rounded-full border border-line text-muted hover:text-ink">
            ‹
          </button>
          <button type="button" className={btnPrimary} onClick={() => go(at + 1)} data-next-tip>
            Give me a tip ✨
          </button>
          <button type="button" onClick={() => go(at + 1)} aria-label="Next tip" className="grid h-10 w-10 place-items-center rounded-full border border-line text-muted hover:text-ink">
            ›
          </button>
        </div>
      </section>

      <details className={`${card} group p-4`}>
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold [&::-webkit-details-marker]:hidden">
          Browse all tips by theme
          <span aria-hidden className="text-muted transition-transform group-open:rotate-45">
            +
          </span>
        </summary>
        <div className="mt-4 space-y-5">
          {TIP_GROUPS.map((group) => (
            <section key={group.id} aria-label={group.label}>
              <h3 className={`${eyebrow} mb-2`}>
                {group.icon} {group.label}
              </h3>
              <ul className="space-y-2">
                {group.tips.map((tip) => (
                  <li key={tip.title} className="rounded-xl border border-line p-3.5">
                    <h4 className="text-sm font-bold">{tip.title}</h4>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted">{tip.body}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </details>
    </div>
  );
}
