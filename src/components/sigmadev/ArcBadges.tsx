"use client";

import { useCallback, useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { btnGhost, btnPrimary, btnSmall, card, input, label } from "@/components/ui/styles";
import { deleteBadge, saveBadge, setBadgeHolder } from "@/lib/actions/arc-admin";
import { BADGE_RULES, BADGE_SUGGESTIONS, type BadgeRule } from "@/lib/arc-config";
import type { Badge } from "@/lib/badges";
import { whenOnline } from "@/lib/offline";

type Row = Badge & { holders: number; holderNames: string[] };
type Result = { ok: true; note?: string } | { ok: false; error: string };
const BLANK = { name: "", icon: "🏅", description: "", rule: "perfect" as BadgeRule, threshold: 7 };

/**
 * Admin → Winter Arc: badges. Each one is either earned automatically (so
 * many perfect days, a streak, or points) or given by hand to people you
 * choose. Members see them in Profile and on their leaderboard profile.
 */
export function ArcBadges({ badges }: { badges: Row[] }) {
  const [draft, setDraft] = useState(BLANK);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [who, setWho] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, startTransition] = useTransition();
  const closeDelete = useCallback(() => setDeleting(null), []);
  const have = new Set(badges.map((b) => b.name.toLowerCase()));
  const ideas = BADGE_SUGGESTIONS.filter((s) => !have.has(s.name.toLowerCase()));
  const rule = BADGE_RULES.find((r) => r.value === draft.rule)!;

  function run(task: () => Promise<Result>, done?: () => void) {
    setMessage(null);
    startTransition(async () => {
      const result = await whenOnline(task);
      if (!result.ok) return setMessage({ ok: false, text: result.error });
      if (result.note) setMessage({ ok: true, text: result.note });
      done?.();
    });
  }

  return (
    <section aria-label="Badges" data-arc-badges>
      <h2 className="font-display text-lg font-bold tracking-tight">Badges</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">Make your own badges for the Winter Arc. Members see them in their Profile, with how close they are, and on their leaderboard profile once earned.</p>

      {message && (
        <p role={message.ok ? "status" : "alert"} className={`mt-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium ${message.ok ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
          {message.text}
        </p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,340px)_1fr] lg:items-start">
        <form
          className={`${card} space-y-3.5 p-4`}
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveBadge(draft), () => setDraft(BLANK));
          }}
        >
          <h3 className="text-sm font-bold">New badge</h3>
          <div className="grid grid-cols-[4.5rem_1fr] gap-2.5">
            <label className="block">
              <span className={label}>Icon</span>
              <input className={`${input} text-center text-lg`} value={draft.icon} maxLength={4} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} aria-label="Badge icon (an emoji)" />
            </label>
            <label className="block">
              <span className={label}>Name</span>
              <input className={input} name="badge_name" value={draft.name} maxLength={40} required placeholder="e.g. Early Bird" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </label>
          </div>
          <label className="block">
            <span className={label}>What it is for</span>
            <input className={input} name="badge_description" value={draft.description} maxLength={160} placeholder="Shown under the badge" onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </label>
          <div className="grid grid-cols-[1fr_6rem] gap-2.5">
            <label className="block">
              <span className={label}>How it is earned</span>
              <select className={input} name="badge_rule" value={draft.rule} onChange={(e) => setDraft({ ...draft, rule: e.target.value as BadgeRule })}>
                {BADGE_RULES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            {draft.rule !== "manual" && (
              <label className="block">
                <span className={label}>How many</span>
                <input className={input} type="number" name="badge_threshold" min={1} max={100000} value={draft.threshold} onChange={(e) => setDraft({ ...draft, threshold: Number(e.target.value) })} />
              </label>
            )}
          </div>
          <p className="text-xs text-muted">{rule.hint}.</p>
          <button type="submit" className={`${btnPrimary} w-full`} disabled={busy || draft.name.trim().length < 2}>
            Create badge
          </button>
          {ideas.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-line pt-3">
              <span className="py-1 text-xs text-muted">Suggestions:</span>
              {ideas.map((idea) => (
                <button key={idea.name} type="button" disabled={busy} onClick={() => run(() => saveBadge(idea))} className="rounded-full border border-line px-2.5 py-1 text-xs font-medium text-muted hover:border-brand hover:text-brand">
                  {idea.icon} {idea.name}
                </button>
              ))}
            </div>
          )}
        </form>

        {badges.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-12 text-center text-sm text-muted">No badges yet. Create one, or tap a suggestion.</p>
        ) : (
          <ul className={`grid gap-2.5 sm:grid-cols-2 ${busy ? "opacity-70" : ""}`}>
            {badges.map((badge) => {
              const unit = BADGE_RULES.find((r) => r.value === badge.rule)?.unit;
              return (
                <li key={badge.id} className={`${card} p-4`} data-badge={badge.name}>
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-raised text-2xl" aria-hidden>
                      {badge.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold">{badge.name}</h3>
                      <p className="text-xs text-muted">{badge.rule === "manual" ? `Given by hand · ${badge.holders} ${badge.holders === 1 ? "person has" : "people have"} it` : `Earned at ${badge.threshold.toLocaleString("en-US")} ${unit}`}</p>
                      {badge.description && <p className="mt-1 text-xs text-muted">{badge.description}</p>}
                    </div>
                    <button type="button" className="rounded-md px-1.5 text-muted hover:text-bad" disabled={busy} onClick={() => setDeleting(badge)} aria-label={`Delete ${badge.name}`}>
                      ✕
                    </button>
                  </div>
                  {badge.rule === "manual" && (
                    <div className="mt-3 border-t border-line pt-3">
                      {badge.holderNames.length > 0 && (
                        <ul className="mb-2 flex flex-wrap gap-1.5">
                          {badge.holderNames.map((username) => (
                            <li key={username} className="flex items-center gap-1 rounded-full bg-raised py-0.5 pl-2.5 pr-1 text-xs font-medium">
                              @{username}
                              <button type="button" className="rounded-full px-1.5 text-muted hover:text-bad" disabled={busy} onClick={() => run(() => setBadgeHolder(badge.id, username, false))} aria-label={`Take ${badge.name} back from ${username}`}>
                                ✕
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <form
                        className="flex gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          run(() => setBadgeHolder(badge.id, who[badge.id] ?? "", true), () => setWho({ ...who, [badge.id]: "" }));
                        }}
                      >
                        <input className={`${input} min-w-0 flex-1 py-2`} value={who[badge.id] ?? ""} placeholder="username" autoCapitalize="none" onChange={(e) => setWho({ ...who, [badge.id]: e.target.value })} aria-label={`Username to give ${badge.name} to`} />
                        <button type="submit" className={btnSmall} disabled={busy || !(who[badge.id] ?? "").trim()}>
                          Give
                        </button>
                      </form>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog open={deleting !== null} title="Delete this badge?" body={`"${deleting?.name ?? ""}" disappears from everyone's profile, including people who have earned it.`} confirmLabel="Delete badge" onConfirm={() => deleting && run(() => deleteBadge(deleting.id))} onClose={closeDelete} />
    </section>
  );
}
