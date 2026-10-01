"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Modal } from "@/components/ui/Modal";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { viewArcProfile, type ArcProfile } from "@/lib/actions/arc";

/**
 * Someone's profile, opened by tapping them on the leaderboard: who they are
 * (as much as they have chosen to show), how their arc is going, and the
 * badges they've earned.
 */
export function ProfileSheet({ userId, onClose }: { userId: number | null; onClose: () => void }) {
  const [profile, setProfile] = useState<ArcProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId === null) return;
    let current = true;
    setProfile(null);
    setError(null);
    viewArcProfile(userId).then(
      (result) => current && (result.ok ? setProfile(result.profile) : setError(result.error)),
      () => current && setError(navigator.onLine ? "That profile couldn't be loaded." : "You're offline. Profiles need a connection."),
    );
    return () => {
      current = false;
    };
  }, [userId]);

  const facts = profile ? [profile.age !== null && { label: "Age", value: String(profile.age) }, profile.gender && { label: "Gender", value: profile.gender }, profile.country && { label: "Country", value: `${profile.country.flag} ${profile.country.name}` }].filter((f): f is { label: string; value: string } => Boolean(f)) : [];

  return (
    <Modal open={userId !== null} onClose={onClose} title={profile ? `@${profile.username}` : "Profile"} width="max-w-sm">
      <div data-true-color data-profile-sheet>
        {error ? (
          <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-3 text-sm font-medium text-bad">
            {error}
          </p>
        ) : !profile ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading profile">
            <div className="skeleton mx-auto h-20 w-20 rounded-full" />
            <div className="skeleton mx-auto h-5 w-40" />
            <div className="skeleton h-16 w-full" />
            <div className="skeleton h-24 w-full" />
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-center">
              <UserAvatar user={profile.avatar} size={84} className="mx-auto" />
              <h3 className="mt-3 font-display text-xl font-bold tracking-tight">
                {profile.name}
                {profile.isMe && <span className="ml-2 rounded-md bg-brand-soft px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-brand">You</span>}
              </h3>
              <p className="text-xs text-muted">
                {profile.pack ? `${profile.pack} pack · ` : ""}here since {profile.memberSince}
              </p>
            </div>

            {facts.length > 0 && (
              <dl className="mt-4 flex flex-wrap justify-center gap-2">
                {facts.map((fact) => (
                  <div key={fact.label} className="rounded-full bg-raised px-3 py-1.5 text-xs">
                    <dt className="sr-only">{fact.label}</dt>
                    <dd className="font-semibold">
                      {fact.label === "Age" ? `${fact.value} years old` : fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            <dl className="mt-4 grid grid-cols-4 gap-1.5 text-center">
              {[
                [profile.numbers.points.toLocaleString("en-US"), "points"],
                [String(profile.numbers.streak), "day streak"],
                [String(profile.numbers.perfect), "perfect days"],
                [String(profile.numbers.activeDays), "active days"],
              ].map(([value, text]) => (
                <div key={text} className="rounded-xl border border-line px-1 py-2.5">
                  <dd className="text-lg font-bold tabular-nums leading-none">{value}</dd>
                  <dt className="mt-1 text-[9.5px] font-semibold uppercase tracking-wide text-muted">{text}</dt>
                </div>
              ))}
            </dl>

            <div className="mt-4">
              <h4 className="text-xs font-bold">Badges</h4>
              {profile.badges.length === 0 ? (
                <p className="mt-1.5 text-xs text-muted">No badges yet.</p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {profile.badges.map((badge) => (
                    <li key={badge.name} title={badge.description} className="rounded-full border border-brand bg-brand-soft px-2.5 py-1 text-xs font-semibold">
                      {badge.icon} {badge.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {profile.isMe && (
              <p className="mt-4 rounded-xl bg-raised px-3.5 py-2.5 text-xs leading-relaxed text-muted">
                This is what other members see. Choose what to show in{" "}
                <Link href="/profile" className="font-semibold text-brand hover:underline">
                  Profile → About you
                </Link>
                .
              </p>
            )}
          </motion.div>
        )}
      </div>
    </Modal>
  );
}
