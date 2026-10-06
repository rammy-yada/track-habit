"use client";

import { useCallback, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { btnSmall, card, eyebrow } from "@/components/ui/styles";
import { removeArcMember } from "@/lib/actions/admin";
import { giveBonus } from "@/lib/actions/arc-admin";
import { Modal } from "@/components/ui/Modal";
import { btnGhost, btnPrimary, input, label } from "@/components/ui/styles";
import type { getAdminArc } from "@/lib/admin-data";
import { whenOnline } from "@/lib/offline";
import type { Pack } from "@/lib/arc-packs";
import type { ArcIntroSetup } from "@/lib/arc-settings";
import type { getBadges } from "@/lib/badges";
import { ArcBadges } from "./ArcBadges";
import { ArcPacks } from "./ArcPacks";
import { IntroImages } from "./IntroImages";
import { IntroSettings } from "./IntroSettings";

type Data = Awaited<ReturnType<typeof getAdminArc>>;
type Member = Data["members"][number];

type Props = { data: Data; joined: Record<number, string>; images: { before: string | null; after: string | null }; adminName: string; intro: ArcIntroSetup; surprises: string[]; packs: Pack[]; badges: Awaited<ReturnType<typeof getBadges>> };

export function AdminArc({ data, joined, images, adminName, intro, surprises, packs, badges }: Props) {
  const { season, members } = data;
  const [removing, setRemoving] = useState<Member | null>(null);
  const [rewarding, setRewarding] = useState<Member | null>(null);
  const [bonus, setBonus] = useState({ points: "50", reason: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const close = useCallback(() => setRemoving(null), []);
  const top = Math.max(1, members[0]?.points ?? 0);
  const total = members.reduce((sum, m) => sum + m.points, 0);

  function remove(member: Member) {
    setError(null);
    startTransition(async () => {
      const result = await whenOnline(() => removeArcMember(member.id));
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <>
      <PageHeader title="Winter Arc">
        <span className="text-[13px] font-medium text-muted">{season.live ? `Day ${season.day} of ${season.totalDays}` : `Starts in ${season.startsIn} days`}</span>
      </PageHeader>

      <div className="space-y-5 px-4 py-6 md:px-8 md:py-7">
        <div className="grid grid-cols-3 gap-3 lg:max-w-2xl">
          {[
            ["Members", members.length],
            ["Total points", total],
            ["Scored today or before", members.filter((m) => m.points > 0).length],
          ].map(([name, value]) => (
            <div key={name} className={`${card} p-4`}>
              <div className="text-2xl font-semibold tabular-nums">{Number(value).toLocaleString("en-US")}</div>
              <div className={`${eyebrow} mt-1`}>{name}</div>
            </div>
          ))}
        </div>

        <ArcPacks packs={packs} />

        <ArcBadges badges={badges} />

        <h2 className="pt-2 font-display text-lg font-bold tracking-tight">Opening scene</h2>
        <IntroImages images={images} />
        <IntroSettings intro={intro} surprises={surprises} images={images} adminName={adminName} totalDays={season.totalDays} />

        <h2 className="pt-2 font-display text-lg font-bold tracking-tight">Leaderboard</h2>
        <p className="max-w-2xl text-sm text-muted">
          {season.range}. This is the same ranking members see. Removing someone takes them off this year&apos;s leaderboard — their habits and check-ins are untouched, and they can join again.
        </p>
        {error && (
          <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-[13px] font-medium text-bad">
            {error}
          </p>
        )}

        {members.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-12 text-center text-sm text-muted">Nobody has joined the Winter Arc yet.</p>
        ) : (
          <ol className={`space-y-2 ${busy ? "opacity-70" : ""}`}>
            <AnimatePresence initial={false}>
              {members.map((m) => (
                <motion.li key={m.id} layout exit={{ opacity: 0, x: -30 }} className={`${card} relative flex items-center gap-3 overflow-hidden px-4 py-3`} data-member={m.username}>
                  <span aria-hidden className="absolute inset-y-0 left-0 bg-brand-soft/60" style={{ width: `${(m.points / top) * 100}%` }} />
                  <span className="relative w-7 text-center text-sm font-bold tabular-nums text-muted">{m.rank}</span>
                  <UserAvatar user={{ id: m.id, name: m.full_name, color: m.avatar_color, version: m.avatar_version }} size={38} className="relative" />
                  <span className="relative min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{m.full_name}</span>
                    <span className="block truncate text-xs text-muted">
                      @{m.username} · {m.active_days} active {m.active_days === 1 ? "day" : "days"} · joined {joined[m.id]}
                    </span>
                  </span>
                  <span className="relative text-sm font-bold tabular-nums">
                    {m.points.toLocaleString("en-US")} <span className="text-[11px] font-medium text-muted">pts</span>
                  </span>
                  <button type="button" className={`${btnSmall} relative`} disabled={busy} onClick={() => (setBonus({ points: "50", reason: "" }), setRewarding(m))}>
                    ± Points
                  </button>
                  <button type="button" className={`${btnSmall} relative hover:!border-bad hover:!text-bad`} disabled={busy} onClick={() => setRemoving(m)}>
                    Remove
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        )}
      </div>

      <Modal open={rewarding !== null} onClose={() => setRewarding(null)} title="Bonus points" width="max-w-sm">
        {rewarding && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              startTransition(async () => {
                const result = await whenOnline(() => giveBonus(rewarding.id, Number(bonus.points), bonus.reason));
                if (result.ok) setRewarding(null);
                else setError(result.error);
              });
            }}
          >
            <p className="text-sm text-muted">
              For <span className="font-semibold text-ink">{rewarding.full_name}</span>
              {rewarding.bonus !== 0 && ` (bonus so far: ${rewarding.bonus > 0 ? "+" : ""}${rewarding.bonus})`}. A negative number takes points away.
            </p>
            {error && (
              <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-[13px] font-medium text-bad">
                {error}
              </p>
            )}
            <label className="block">
              <span className={label}>Points</span>
              <input className={input} type="number" name="bonus_points" min={-1000} max={1000} value={bonus.points} onChange={(e) => setBonus({ ...bonus, points: e.target.value })} required data-autofocus />
            </label>
            <label className="block">
              <span className={label}>What for</span>
              <input className={input} name="bonus_reason" value={bonus.reason} maxLength={120} placeholder="e.g. Won the weekend challenge" onChange={(e) => setBonus({ ...bonus, reason: e.target.value })} required />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setRewarding(null)}>
                Cancel
              </button>
              <button type="submit" className={btnPrimary} disabled={busy}>
                Save
              </button>
            </div>
          </form>
        )}
      </Modal>
      <ConfirmDialog
        open={removing !== null}
        title="Remove from the leaderboard?"
        body={`${removing?.full_name ?? ""} will no longer appear on this year's Winter Arc. Nothing else about their account changes.`}
        confirmLabel="Remove"
        onConfirm={() => removing && remove(removing)}
        onClose={close}
      />
    </>
  );
}
