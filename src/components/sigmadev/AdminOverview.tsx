"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { PageHeader } from "@/components/PageHeader";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Reveal } from "@/components/ui/Reveal";
import { Spotlight } from "@/components/ui/Spotlight";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { BarList } from "@/components/charts/BarList";
import { ColumnChart } from "@/components/charts/ColumnChart";
import { EmptyChart } from "@/components/charts/shared";
import { btnPrimary, card, eyebrow } from "@/components/ui/styles";
import type { getAdminOverview } from "@/lib/admin-data";

type Data = Awaited<ReturnType<typeof getAdminOverview>>;

export function AdminOverview({ data, joined, status }: { data: Data; joined: Record<number, string>; status: { build: string; database: string } }) {
  const { stats } = data;
  const tiles = [
    { label: "Accounts", value: stats.totalUsers, note: `${stats.newThisWeek} new this week`, href: "/sigmadev/users" },
    { label: "Active accounts", value: stats.activeUsers, note: stats.disabledUsers ? `${stats.disabledUsers} disabled` : "none disabled", href: "/sigmadev/users" },
    { label: "Check-ins today", value: stats.checkinsToday, note: `${stats.totalHabits} active habits`, href: null },
    { label: "In the Winter Arc", value: stats.arcMembers, note: data.arcLive ? "season is live" : "season not started", href: "/sigmadev/arc" },
    { label: "New messages", value: stats.newInquiries, note: "Open the inbox →", href: "/sigmadev/inbox" },
    { label: "Blog posts", value: stats.posts, note: "Write or edit →", href: "/sigmadev/blog" },
  ];
  // the last 7 of the 14 days fit a phone; the chart shows all 14 on wider screens
  const week = (series: Data["activity"]) => series.slice(-7);

  return (
    <>
      <PageHeader title="Overview">
        <Link href="/sigmadev/users" className={btnPrimary}>
          Manage users
        </Link>
      </PageHeader>

      <div className="space-y-5 px-4 py-6 md:px-8 md:py-7">
        <motion.div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4" initial="hidden" animate="shown" variants={{ shown: { transition: { staggerChildren: 0.06 } } }}>
          {tiles.map((tile) => {
            const body = (
              <Spotlight className={`${card} h-full p-4 sm:p-5`}>
                <div className="text-3xl font-semibold tracking-tight">
                  <AnimatedNumber value={tile.value} />
                </div>
                <div className={`${eyebrow} mt-1`}>{tile.label}</div>
                <div className="mt-2 text-xs font-medium text-brand">{tile.note}</div>
              </Spotlight>
            );
            return (
              <motion.div key={tile.label} variants={{ hidden: { opacity: 0, y: 16 }, shown: { opacity: 1, y: 0 } }}>
                {tile.href ? (
                  <Link href={tile.href} className="block h-full rounded-2xl">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </motion.div>
            );
          })}
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Reveal className="min-w-0">
            <section className={`${card} h-full p-5`}>
              <h2 className="text-sm font-bold">Check-ins</h2>
              <p className="mb-3 text-xs text-muted">Habits ticked across all members, last 7 days</p>
              <ColumnChart data={week(data.activity)} unit="check-ins" caption="Check-ins across all members over the last 7 days" height={190} />
            </section>
          </Reveal>
          <Reveal delay={0.06} className="min-w-0">
            <section className={`${card} h-full p-5`}>
              <h2 className="text-sm font-bold">New sign-ups</h2>
              <p className="mb-3 text-xs text-muted">Accounts created, last 7 days</p>
              <ColumnChart data={week(data.signups)} unit="sign-ups" caption="Accounts created over the last 7 days" height={190} />
            </section>
          </Reveal>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_0.9fr]">
          <Reveal className="min-w-0">
            <section className={`${card} h-full p-5`}>
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-sm font-bold">Newest members</h2>
                <Link href="/sigmadev/users" className="text-xs font-semibold text-brand hover:underline">
                  All users →
                </Link>
              </div>
              <ul className="space-y-3">
                {data.recent.map((u) => (
                  <li key={u.id} className="flex items-center gap-3">
                    <UserAvatar user={{ id: u.id, name: u.full_name, color: u.avatar_color, version: u.avatar_version }} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{u.full_name}</span>
                      <span className="block truncate text-xs text-muted">@{u.username}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">{joined[u.id]}</span>
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
          <Reveal delay={0.06} className="min-w-0">
            <section className={`${card} h-full p-5`}>
              <h2 className="text-sm font-bold">Popular categories</h2>
              <p className="mb-4 text-xs text-muted">Active habits per category</p>
              {data.popular.length ? <BarList data={data.popular} unit="habits" caption="Active habits per category" /> : <EmptyChart>No habits yet.</EmptyChart>}
            </section>
          </Reveal>
          <Reveal delay={0.12} className="min-w-0">
            <section className={`${card} h-full p-5`}>
              <h2 className="mb-4 text-sm font-bold">System</h2>
              <dl className="space-y-3 text-sm">
                {[
                  ["Database", status.database],
                  ["Version", status.build],
                  ["Administrators", String(stats.admins)],
                  ["Profile photos", String(stats.withPhoto)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <dt className="text-muted">{label}</dt>
                    <dd className="flex items-center gap-2 font-semibold">
                      {label === "Database" && <span className={`h-2 w-2 rounded-full ${value === "Connected" ? "bg-good" : "bg-bad"}`} />}
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <a href="/api/health" target="_blank" rel="noreferrer" className="mt-4 inline-block text-xs font-semibold text-brand hover:underline">
                Open status check ↗
              </a>
            </section>
          </Reveal>
        </div>
      </div>
    </>
  );
}
