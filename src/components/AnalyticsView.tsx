"use client";

import { motion } from "motion/react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Reveal } from "@/components/ui/Reveal";
import { Spotlight } from "@/components/ui/Spotlight";
import { BarList } from "@/components/charts/BarList";
import { ColumnChart } from "@/components/charts/ColumnChart";
import { RadarChart } from "@/components/charts/RadarChart";
import { EmptyChart } from "@/components/charts/shared";
import { card, eyebrow } from "@/components/ui/styles";
import { MOODS } from "@/lib/constants";
import type { getAnalytics } from "@/lib/data";

function ChartCard({ title, sub, delay = 0, children }: { title: string; sub: string; delay?: number; children: React.ReactNode }) {
  return (
    <Reveal delay={delay}>
      <section className={`${card} h-full p-5`}>
        <h2 className="text-sm font-bold">{title}</h2>
        <p className="mb-4 text-xs text-muted">{sub}</p>
        {children}
      </section>
    </Reveal>
  );
}

export function AnalyticsView({ data }: { data: Awaited<ReturnType<typeof getAnalytics>> }) {
  const tiles = [
    { label: "Total check-ins", value: data.totalCheckins },
    { label: "Days active", value: data.activeDays },
    { label: "Active habits", value: data.totalHabits },
  ];
  const hasMoods = data.moods.some((m) => m.value > 0);
  const hasCheckins = data.totalCheckins > 0;

  return (
    <div className="space-y-4 px-4 py-6 md:px-8 md:py-7">
      <motion.div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4" initial="hidden" animate="shown" variants={{ shown: { transition: { staggerChildren: 0.07 } } }}>
        {tiles.map((t) => (
          <Tile key={t.label} label={t.label}>
            <AnimatedNumber value={t.value} />
          </Tile>
        ))}
        <Tile label="Done today">
          <AnimatedNumber value={data.todayDone} />
          <span className="text-muted">/{data.totalHabits}</span>
        </Tile>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Weekly completion" sub="Check-ins in each of the last four weeks">
          {hasCheckins ? <ColumnChart data={data.weekly} unit="check-ins" caption="Check-ins per week, last four weeks" /> : <EmptyChart>Tick off a habit to start this chart.</EmptyChart>}
        </ChartCard>
        <ChartCard title="Day-of-week pattern" sub="All-time check-ins by weekday — where your week is strong or thin" delay={0.06}>
          {hasCheckins ? <RadarChart data={data.dayOfWeek} unit="check-ins" caption="All-time check-ins by day of week" /> : <EmptyChart>Your weekly rhythm appears here.</EmptyChart>}
        </ChartCard>
        <ChartCard title="Check-ins by category" sub="All-time, across your active habits">
          {data.categories.length ? <BarList data={data.categories} unit="check-ins" caption="Check-ins by habit category" /> : <EmptyChart>No habits tracked yet.</EmptyChart>}
        </ChartCard>
        <ChartCard title="Mood distribution" sub="From the notes you log on habits" delay={0.06}>
          {hasMoods ? (
            <ColumnChart data={data.moods.map((m) => ({ label: `${MOODS.find((x) => x.value === m.mood)?.emoji} ${MOODS.find((x) => x.value === m.mood)?.label}`, value: m.value }))} unit="notes" caption="Logged moods" height={190} />
          ) : (
            <EmptyChart>Add a note with a mood from the dashboard to see this.</EmptyChart>
          )}
        </ChartCard>
      </div>

      <Reveal>
        <section className={`${card} p-5`}>
          <h2 className="text-sm font-bold">Per-habit performance</h2>
          <p className="mb-4 text-xs text-muted">Share of the last 30 days each habit was completed</p>
          {data.habits.length === 0 ? (
            <EmptyChart>No habits tracked yet.</EmptyChart>
          ) : (
            <ul className="space-y-2.5">
              {data.habits.map((h, i) => (
                <motion.li
                  key={h.id}
                  className="flex items-center gap-3.5 rounded-xl bg-raised px-4 py-3"
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <span className="w-8 text-center text-xl" aria-hidden>
                    {h.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{h.name}</div>
                    {/* meter: the track is a lighter step of the same hue as the fill */}
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-soft">
                      <motion.div
                        className="h-full rounded-full bg-brand-solid"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${h.percent}%` }}
                        viewport={{ once: true }}
                        transition={{ type: "spring", stiffness: 70, damping: 18, delay: 0.15 + i * 0.05 }}
                      />
                    </div>
                  </div>
                  <span className="w-11 text-right text-sm font-bold tabular-nums">{h.percent}%</span>
                  <span className="hidden w-28 text-right text-xs text-muted sm:block">{h.total} total check-ins</span>
                </motion.li>
              ))}
            </ul>
          )}
        </section>
      </Reveal>
    </div>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 16 }, shown: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 24 } } }}>
      <Spotlight className={`${card} p-5 text-center`}>
        <div className="text-3xl font-semibold tracking-tight">{children}</div>
        <div className={`${eyebrow} mt-1`}>{label}</div>
      </Spotlight>
    </motion.div>
  );
}
