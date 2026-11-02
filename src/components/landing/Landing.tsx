"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { InstallApp } from "@/components/InstallApp";
import { Logo } from "@/components/Logo";
import { SiteFooter } from "@/components/SiteFooter";
import { COBALT, MARIGOLD, ON_COBALT } from "@/components/ui/cobalt";
import { btnPrimary } from "@/components/ui/styles";
import { FAQ } from "@/lib/faq";

// The home page is one idea: the question the app asks every day, and the box
// that answers it. Cobalt, white, and marigold for "today" and nothing else.

const STEPS = [
  { title: "Add your habits", body: "Type in what you want to do: read ten pages, drink water, go for a walk, study for an hour. Pick an icon and, if you like, a time to be reminded." },
  { title: "Tick them off each day", body: "Open the app and tap a habit when it is done. Your checklist starts again at midnight in your own timezone, wherever you live." },
  { title: "Watch your streak grow", body: "Every day in a row adds to your streak. Charts and a monthly grid show which habits are holding and which need a little more care." },
];

const BENEFITS = [
  { title: "Free to use", body: "Every feature is free: habits, streaks, charts, reminders and the Winter Arc. There is no paid plan hiding the useful parts." },
  { title: "Works offline", body: "No signal on the bus or in class? Tick your habits anyway. They are kept on your phone and sent when you are back online." },
  { title: "Installs like an app", body: "Add HabitFlow to your home screen on Android, iPhone or a computer. It opens full screen, with its own icon, without an app store." },
  { title: "Reminders that help", body: "Set a time for any habit and get a notification then. A short line of motivation in the morning is there if you want it, and off if you don't." },
  { title: "Any country, any timezone", body: "Your day ends at your own midnight, not somebody else's. Use it in English, with reminders in Nepali if you prefer." },
  { title: "Your data stays yours", body: "Sign in with email or Google. You choose what others can see on the leaderboard, and you can download or delete your data at any time." },
];

// The days either side of today. Mostly ticked, one missed: that's what real streaks look like.
const PAST = [1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1];
const SHOTS = ["/screenshots/today.webp", "/screenshots/month.webp", "/screenshots/stats.webp"];
const SHOT_ALT = ["HabitFlow's Today screen with a list of habits", "The monthly grid, with a tick for each day a habit was done", "Charts of habits completed each week"];

const Tick = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

/** The giant box, and the line of days it belongs to. */
function TodayBox() {
  const [done, setDone] = useState(false);
  return (
    <>
      <div className="mt-7 flex items-center gap-5 md:mt-8 md:gap-8">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label="I did it today"
          onClick={() => setDone((d) => !d)}
          className="grid aspect-square w-[clamp(6.5rem,13vw,10.5rem)] shrink-0 cursor-pointer place-items-center rounded-[22%] border-[clamp(6px,0.9vw,12px)] border-white text-black outline-offset-4 outline-white transition-transform hover:scale-[1.03] active:scale-95"
          style={{ background: done ? MARIGOLD : "transparent", borderColor: done ? MARIGOLD : "#fff" }}
          data-today-box
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" className="h-[72%] w-[72%]" aria-hidden>
            <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={false} animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }} transition={{ type: "spring", stiffness: 240, damping: 20 }} />
          </svg>
        </button>
        <div className="min-w-0 max-w-md" aria-live="polite">
          <p className="font-display text-[clamp(1.35rem,2.6vw,2.1rem)] font-bold leading-[1.12] tracking-tight">{done ? "That's day one." : "Go on, tick it."}</p>
          <p className="mt-2 text-[15px] leading-relaxed text-muted md:text-base">{done ? "Tomorrow there's a new box. Make an account and we'll keep count." : "That's the whole app. HabitFlow is a free habit tracker: a box for each thing you want to do, every day."}</p>
        </div>
      </div>
      <div className="mt-7 flex flex-wrap items-center gap-3 md:mt-8">
        <Link href="/register" className={`${btnPrimary} !shadow-none px-7 py-3.5 text-base`}>
          {done ? "Keep my streak" : "Start tracking free"}
        </Link>
      </div>
      {/* the line of days runs off both edges of the screen, with today in the middle */}
      <div aria-hidden className="-mx-5 mt-9 flex justify-center gap-[clamp(4px,0.5vw,7px)] overflow-hidden pb-[clamp(1.5rem,4vw,3rem)] sm:-mx-10 md:mt-14" data-day-line>
        {PAST.map((on, i) => (
          <span key={i} className={`grid size-[clamp(24px,3.2vw,44px)] shrink-0 place-items-center rounded-[22%] ${on ? "bg-white" : "bg-white/15"}`} style={{ color: COBALT }}>
            {on ? <Tick className="h-[68%] w-[68%]" /> : null}
          </span>
        ))}
        <span className="grid size-[clamp(24px,3.2vw,44px)] shrink-0 place-items-center rounded-[22%] border-2 text-black transition-colors" style={{ borderColor: MARIGOLD, background: done ? MARIGOLD : "transparent" }}>
          {done && <Tick className="h-[68%] w-[68%]" />}
        </span>
        {PAST.map((_, i) => (
          <span key={`f${i}`} className="size-[clamp(24px,3.2vw,44px)] shrink-0 rounded-[22%] border border-white/30" />
        ))}
      </div>
    </>
  );
}

/** `arc`: where the Winter Arc season stands today. */
export function Landing({ arc }: { arc: { live: boolean; daysLeft: number; startsIn: number } }) {
  const countdown = arc.live ? (arc.daysLeft > 0 ? `${arc.daysLeft} ${arc.daysLeft === 1 ? "day" : "days"} left` : "Last day today") : arc.startsIn > 0 ? `Starts in ${arc.startsIn} ${arc.startsIn === 1 ? "day" : "days"}` : "";
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      {/* the Winter Arc gets the very top of the page */}
      <Link href="/winter-arc" className="flex items-center justify-center gap-2 bg-black px-4 py-2.5 text-center text-[13px] font-semibold text-white">
        <span aria-hidden>❄</span>
        <span className="sm:hidden">Winter Arc</span>
        <span className="hidden sm:inline">The Winter Arc: Oct 1 – Jan 31, a few habits every day</span>
        {countdown && (
          <span className="whitespace-nowrap rounded-full border border-white/30 px-2.5 py-0.5 text-[11px] font-bold tabular-nums" data-arc-countdown>
            {countdown}
          </span>
        )}
        <span className="whitespace-nowrap rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-black">Join</span>
      </Link>
      <section style={ON_COBALT} className="overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-5 py-5 sm:px-10">
          <Logo />
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link href="/blog" className="hidden rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:text-ink md:block">
              Blog
            </Link>
            <Link href="/winter-arc" className="hidden rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:text-ink md:block">
              Winter Arc
            </Link>
            <span className="hidden md:inline-flex">
              <InstallApp variant="pill" />
            </span>
            <Link href="/login" className="rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:text-ink">
              Sign in
            </Link>
          </nav>
        </header>
        <div className="px-5 pt-[clamp(1rem,4vw,3.5rem)] sm:px-10">
          <h1 className="font-display text-[clamp(3.9rem,11vw,11.5rem)] font-extrabold leading-[0.9] tracking-[-0.045em]">Did you do it today?</h1>
          <TodayBox />
        </div>
      </section>
      <InstallApp variant="banner" />

      <main className="flex-1">
        {/* the steps really are a sequence, so they are numbered; each one drops a little lower than the last */}
        <section aria-labelledby="how-title" className="mx-auto max-w-6xl px-5 py-[clamp(4rem,9vw,8rem)] sm:px-10">
          <h2 id="how-title" className="max-w-3xl font-display text-[clamp(2.25rem,5.5vw,4.5rem)] font-extrabold leading-[1] tracking-[-0.03em]">
            How to start tracking your habits
          </h2>
          <ol className="mt-12 grid gap-14 md:mt-16 md:grid-cols-3 md:gap-8">
            {STEPS.map((step, i) => (
              <li key={step.title} className={i === 1 ? "md:mt-16" : i === 2 ? "md:mt-32" : ""}>
                <span className="font-display text-7xl font-extrabold leading-none tracking-tighter text-brand" data-step-number>
                  {i + 1}
                </span>
                <h3 className="mt-3 font-display text-2xl font-bold tracking-tight">{step.title}</h3>
                <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-muted">{step.body}</p>
                {/* eslint-disable-next-line @next/next/no-img-element -- the app's own screenshots, already compressed */}
                <img src={SHOTS[i]} alt={SHOT_ALT[i]} width={780} height={1688} loading="lazy" decoding="async" className="mt-6 aspect-[780/1100] w-full max-w-[300px] rounded-[1.75rem] border border-line object-cover object-top" />
              </li>
            ))}
          </ol>
        </section>

        {/* the Winter Arc keeps its own black-and-white world */}
        <Link href="/winter-arc" className="group block overflow-hidden bg-black px-5 py-[clamp(3rem,7vw,6rem)] text-white sm:px-10" data-arc-block>
          <h2 className="font-[family-name:var(--font-poster)] text-[clamp(4.2rem,19.5vw,21rem)] font-normal leading-[0.86] tracking-[-0.04em]">Winter Arc</h2>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
            <p className="max-w-xl text-lg leading-relaxed text-white/75">
              {countdown ? `${countdown}. ` : ""}From October to January: a few habits, every day, and one leaderboard for everyone who joins. It&apos;s free too.
            </p>
            <span className="rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-black transition-transform group-hover:-translate-y-0.5">Join the Winter Arc</span>
          </div>
        </Link>

        <section aria-labelledby="why-title" className="mx-auto max-w-6xl px-5 py-[clamp(4rem,9vw,8rem)] sm:px-10">
          <h2 id="why-title" className="max-w-3xl font-display text-[clamp(2.25rem,5.5vw,4.5rem)] font-extrabold leading-[1] tracking-[-0.03em]">
            What you get with HabitFlow
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            A free habit tracker that stays out of your way. Write down the few things you want to do every day, tick them off, and watch the days add up. Ideas for where to begin are on the{" "}
            <Link href="/blog" className="font-semibold text-brand hover:underline">
              blog
            </Link>
            .
          </p>
          <dl className="mt-12 md:mt-16">
            {BENEFITS.map((item) => (
              <div key={item.title} className="grid gap-2 border-t border-line py-6 md:grid-cols-[1fr_1.4fr] md:gap-8 md:py-8">
                <dt>
                  <h3 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{item.title}</h3>
                </dt>
                <dd className="max-w-xl text-[15px] leading-relaxed text-muted md:text-base">{item.body}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* questions people ask before signing up (also given to search engines, see app/page.tsx) */}
        <section aria-labelledby="faq-title" className="mx-auto max-w-6xl px-5 pb-[clamp(4rem,9vw,8rem)] sm:px-10">
          <h2 id="faq-title" className="max-w-3xl font-display text-[clamp(2.25rem,5.5vw,4.5rem)] font-extrabold leading-[1] tracking-[-0.03em]">
            Questions, answered
          </h2>
          <div className="mt-10 md:mt-14">
            {FAQ.map((item) => (
              <details key={item.q} className="group border-t border-line">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-display text-lg font-bold tracking-tight md:text-xl [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span aria-hidden className="text-2xl font-normal text-muted transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="max-w-2xl pb-6 text-[15px] leading-relaxed text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section style={ON_COBALT} className="px-5 py-[clamp(3.5rem,8vw,7rem)] sm:px-10" aria-label="Get started">
          <p className="font-display text-[clamp(3rem,9vw,9rem)] font-extrabold leading-[0.92] tracking-[-0.04em]">Today&apos;s box is still empty.</p>
          <Link href="/register" className={`${btnPrimary} !shadow-none mt-8 px-7 py-3.5 text-base`}>
            Start tracking free
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
