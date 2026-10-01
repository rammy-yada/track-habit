"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { FlowField } from "@/components/FlowField";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Reveal } from "@/components/ui/Reveal";
import { Spotlight } from "@/components/ui/Spotlight";
import { Flame } from "@/components/dashboard/effects";
import { btnGhost, btnPrimary, card } from "@/components/ui/styles";
import { CREATOR } from "@/lib/constants";
import { DemoCard } from "./DemoCard";
import { Magnetic } from "./Magnetic";

const ease = [0.2, 0.7, 0.2, 1] as const;

/** Headline words rise out of a mask one after another. */
function Words({ text, from = 0 }: { text: string; from?: number }) {
  return (
    <>
      {text.split(" ").map((word, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span className="mr-[0.22em] inline-block" initial={{ y: "115%", rotate: 6 }} animate={{ y: 0, rotate: 0 }} transition={{ duration: 0.7, delay: 0.15 + (from + i) * 0.08, ease }}>
            {word}
          </motion.span>
        </span>
      ))}
    </>
  );
}

export function Landing() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip">
      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-10">
        <Logo />
        <nav className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link href="/login" className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-ink sm:block">
            Sign in
          </Link>
          <Link href="/register" className={btnPrimary}>
            Get Started
          </Link>
        </nav>
      </header>

      <main className="relative flex-1">
        {/* the current, fading out toward the bottom of the hero */}
        <div className="absolute inset-x-0 top-0 h-[720px] [mask-image:linear-gradient(to_bottom,black_55%,transparent)]">
          <FlowField />
        </div>

        <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 sm:px-10 lg:grid-cols-[1.15fr_1fr] lg:pb-28 lg:pt-20">
          <div>
            <motion.span
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-card/80 px-3.5 py-1.5 text-xs font-semibold text-muted backdrop-blur"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="relative flex h-2 w-2">
                <span className="ripple absolute inset-0 rounded-full bg-good" />
                <span className="relative h-2 w-2 rounded-full bg-good" />
              </span>
              Habit tracking, minus the clutter
            </motion.span>

            <h1 className="font-display text-[clamp(2.5rem,5.6vw,4rem)] font-extrabold leading-[1.02] tracking-[-0.035em]">
              <Words text="Build habits that" />
              <br />
              <span className="relative inline-block text-brand">
                <Words text="actually stick" from={3} />
                {/* a hand-drawn underline that draws itself once the words have landed */}
                <svg aria-hidden viewBox="0 0 300 18" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3.5 w-[96%] overflow-visible">
                  <motion.path
                    d="M3 12c40-8 82-9 124-6s96 8 170-2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.55 }}
                    transition={{ delay: 0.95, duration: 0.8, ease: "easeInOut" }}
                  />
                </svg>
              </span>
            </h1>

            <motion.p className="mt-7 max-w-xl text-lg leading-relaxed text-muted" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, duration: 0.6, ease }}>
              Simple habit tracking designed for clarity and focus. No clutter, just your progress.
            </motion.p>

            <motion.div className="mt-9 flex flex-wrap items-center gap-4" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.6, ease }}>
              <Magnetic>
                <Link href="/register" className={`${btnPrimary} px-7 py-3.5 text-base`}>
                  Create Account
                  <motion.span aria-hidden animate={{ x: [0, 4, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
                    →
                  </motion.span>
                </Link>
              </Magnetic>
              <Magnetic>
                <Link href="/login" className={`${btnGhost} px-7 py-3.5 text-base`}>
                  Sign In
                </Link>
              </Magnetic>
            </motion.div>
          </div>

          <DemoCard />
        </section>

        <section aria-label="Winter Arc" className="relative mx-auto max-w-6xl px-5 pb-16 sm:px-10">
          <Reveal>
            <Link href="/winter-arc" className="group relative block overflow-hidden rounded-3xl bg-[#050505] px-6 py-9 text-white sm:px-12 sm:py-12">
              <span aria-hidden className="aurora absolute -right-20 -top-24 h-64 w-96 rounded-full bg-white/25 blur-[70px]" />
              <span aria-hidden className="grain pointer-events-none absolute inset-0 opacity-60" />
              <span className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <span>
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60">Oct 1 – Jan 31</span>
                  <span className="mt-2 block font-[family-name:var(--font-poster)] text-6xl leading-[0.9] tracking-[-0.03em] sm:text-7xl">WINTER ARC</span>
                  <span className="mt-4 block max-w-md text-sm leading-relaxed text-white/65">123 days. A few habits, every day, with everyone on one leaderboard. Finish the year stronger than you started it.</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-white px-6 py-3.5 text-sm font-bold uppercase tracking-[0.14em] text-black transition-transform group-hover:translate-x-1 sm:self-auto">
                  Join the arc <span aria-hidden>→</span>
                </span>
              </span>
            </Link>
          </Reveal>
        </section>

        <section aria-label="Features" className="relative border-t border-line bg-card/60">
          <div className="mx-auto grid max-w-6xl gap-4 px-5 py-14 sm:px-10 md:grid-cols-3">
            <Feature title="Daily" label="Automatic reset" body="Your checklist starts fresh at midnight in your own timezone." delay={0}>
              <div className="flex gap-1.5">
                {Array.from({ length: 7 }, (_, i) => (
                  <motion.span key={i} className="h-5 w-5 rounded-md bg-brand-solid" animate={{ opacity: [0.18, 1, 0.18], scale: [0.85, 1, 0.85] }} transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }} />
                ))}
              </div>
            </Feature>
            <Feature title="Streaks" label="Momentum tracking" body="Every consecutive day counts — and you can see it building." delay={0.08}>
              <div className="flex items-center gap-2">
                <Flame lit size={30} />
                <span className="text-2xl font-semibold tabular-nums">27</span>
                <span className="text-sm text-muted">day streak</span>
              </div>
            </Feature>
            <Feature title="Insights" label="Clarity & focus" body="Weekly patterns, a monthly grid and per-habit rates, at a glance." delay={0.16}>
              <svg viewBox="0 0 160 40" className="h-10 w-40 overflow-visible" aria-hidden>
                <motion.path
                  d="M2 32 L24 26 L46 30 L68 16 L90 20 L112 8 L134 14 L158 4"
                  fill="none"
                  className="stroke-chart"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.4, ease: "easeInOut", delay: 0.3 }}
                />
                <motion.circle cx="158" cy="4" r="4.5" className="fill-chart stroke-card" strokeWidth="2" initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: 1.6, type: "spring" }} />
              </svg>
            </Feature>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-line px-5 py-6 text-center text-xs text-muted sm:px-10">
        HabitFlow · Small steps, better flow. · Made by{" "}
        <a href={CREATOR.supportUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
          {CREATOR.handle}
        </a>{" "}
        ·{" "}
        <Link href="/privacy" className="hover:text-ink hover:underline">
          Privacy
        </Link>{" "}
        ·{" "}
        <Link href="/terms" className="hover:text-ink hover:underline">
          Terms
        </Link>
      </footer>
    </div>
  );
}

function Feature({ title, label, body, delay, children }: { title: string; label: string; body: string; delay: number; children: React.ReactNode }) {
  return (
    <Reveal delay={delay}>
      <Spotlight className={`${card} h-full p-6`}>
        <div className="mb-5 flex h-10 items-center">{children}</div>
        <h3 className="font-display text-2xl font-bold tracking-tight">{title}</h3>
        <p className="text-sm font-medium text-brand">{label}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
      </Spotlight>
    </Reveal>
  );
}
