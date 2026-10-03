"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

const INTRO_SEEN_KEY = "habitflow:arc-intro-seen";
const REPLAY_EVENT = "habitflow:arc-story";
const SLIDE_MS = 5200;
const poster = "font-[family-name:var(--font-poster)]";

/** Lets a button anywhere on the page start the story again. */
export const replayArcStory = () => window.dispatchEvent(new Event(REPLAY_EVENT));

export type Story = {
  member: boolean;
  firstName: string;
  season: { range: string; day: number; totalDays: number; live: boolean; startsIn: number };
  members: number;
  top: { name: string; points: number; isMe: boolean }[];
  me: { rank: number; points: number; streak: number; today: number; dailyMax: number } | null;
  pack: { name: string; icon: string; habits: { name: string; icon: string; done: boolean }[] } | null;
  perfectDays: number;
  nextBadge: { title: string; inDays: number } | null;
  quote: string;
};

type Slide = { key: string; render: () => React.ReactNode };

/**
 * A full-screen story, the kind you tap through: where you are in the Winter
 * Arc today, told in a few screens. It plays every time the Arc is opened.
 * Tap the right side to go on, the left to go back,
 * hold to pause, or close it. People who ask their device for reduced motion
 * only see it if they open it themselves, and it doesn't move on by itself.
 */
export function ArcStory({ story }: { story: Story }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);
  const paused = useRef(false);
  const bar = useRef<HTMLSpanElement>(null);
  const { season, me } = story;

  const slides: Slide[] = story.member && me ? memberSlides(story) : visitorSlides(story);
  const last = slides.length - 1;

  const close = useCallback(() => setOpen(false), []);
  const go = useCallback((step: number) => setIndex((i) => (i + step < 0 ? 0 : i + step > last ? (setOpen(false), i) : i + step)), [last]);

  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(still);
    const start = () => {
      setIndex(0);
      setOpen(true);
    };
    let introSeen = true;
    try {
      introSeen = localStorage.getItem(INTRO_SEEN_KEY) === "1";
    } catch {}
    // a member who hasn't seen the opening scene yet gets that first, not both at once
    if (!still && (introSeen || !story.member)) start();
    window.addEventListener(REPLAY_EVENT, start);
    return () => window.removeEventListener(REPLAY_EVENT, start);
  }, [story.member]);

  // the clock that fills the bar and turns the page
  useEffect(() => {
    if (!open) return;
    let elapsed = 0;
    let before = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      if (!paused.current && !reduced) elapsed += now - before;
      before = now;
      if (bar.current) bar.current.style.width = `${Math.min(100, (elapsed / SLIDE_MS) * 100)}%`;
      if (elapsed >= SLIDE_MS) return go(1);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [open, index, reduced, go]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight" || e.key === " ") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, go, close]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div role="dialog" aria-modal="true" aria-label="Winter Arc story" className="fixed inset-0 z-[65] bg-black text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} data-arc-story data-arc-scene>
          <div className="relative mx-auto h-full w-full max-w-[480px] overflow-hidden bg-[radial-gradient(120%_80%_at_50%_0%,#3b3b3b_0%,#0b0b0b_55%,#000_100%)]">
            {/* slow snow behind everything */}
            <span aria-hidden className="pointer-events-none absolute inset-0">
              {/* moved by the browser's compositor (a CSS animation), not by script: it stays smooth while the cards animate */}
              {!reduced &&
                Array.from({ length: 14 }, (_, i) => (
                  <span key={i} className="snow absolute top-0 h-1 w-1 rounded-full bg-white" style={{ left: `${(i * 37 + 11) % 100}%`, ["--t" as string]: `${8 + (i % 5) * 2}s`, ["--delay" as string]: `${-((i * 1.7) % 11)}s`, ["--sway" as string]: `${i % 2 ? 22 : -16}px`, ["--o" as string]: 0.3 + (i % 4) * 0.15, ["--fall" as string]: "105vh" }} />
                ))}
            </span>

            {/* progress: one bar per screen */}
            <div className="absolute inset-x-3 top-[calc(10px+env(safe-area-inset-top))] z-20 flex gap-1" aria-hidden>
              {slides.map((slide, i) => (
                <span key={slide.key} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
                  <span ref={i === index ? bar : undefined} className="block h-full bg-white" style={{ width: i < index ? "100%" : "0%" }} />
                </span>
              ))}
            </div>
            <div className="absolute inset-x-4 top-[calc(24px+env(safe-area-inset-top))] z-20 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70">
                ❄ Winter Arc{season.live ? ` · Day ${season.day}` : ""}
              </span>
              <button type="button" onClick={close} aria-label="Close story" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-lg leading-none hover:bg-white/20">
                ✕
              </button>
            </div>

            {/* tap left to go back, right to go on; hold anywhere to pause */}
            <div className="absolute inset-0 z-10 flex" onPointerDown={() => (paused.current = true)} onPointerUp={() => (paused.current = false)} onPointerLeave={() => (paused.current = false)} onPointerCancel={() => (paused.current = false)}>
              <button type="button" className="h-full w-1/3 cursor-w-resize" aria-label="Previous" onClick={() => go(-1)} />
              <button type="button" className="h-full flex-1 cursor-e-resize" aria-label="Next" onClick={() => go(1)} />
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={slides[index].key} className="pointer-events-none absolute inset-0 flex flex-col justify-center px-7 pb-16 pt-24 [&_a]:pointer-events-auto [&_button]:pointer-events-auto" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.28 }} aria-live="polite">
                {slides[index].render()}
              </motion.div>
            </AnimatePresence>

            <p className="pointer-events-none absolute inset-x-0 bottom-[calc(14px+env(safe-area-inset-bottom))] z-20 text-center text-[10px] uppercase tracking-[0.22em] text-white/40">{index === last ? "Tap to finish" : "Tap to continue · hold to pause"}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ── the screens ──────────────────────────────────────────────────────────────

const rise = (delay: number) => ({ initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] as const } });
const Small = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60" {...rise(delay)}>
    {children}
  </motion.p>
);
const cta = "mt-8 block w-full border-2 border-white bg-white py-3.5 text-center text-sm font-bold uppercase tracking-[0.26em] text-black";

function memberSlides(story: Story): Slide[] {
  const { season, firstName, top, pack, perfectDays, nextBadge, quote } = story;
  const me = story.me!;
  const progress = season.live ? season.day / season.totalDays : 0;
  const done = pack?.habits.filter((h) => h.done).length ?? 0;
  const leader = Math.max(1, top[0]?.points ?? 0);

  const slides: Slide[] = [
    {
      key: "day",
      render: () => (
        <>
          <Small>{season.range}</Small>
          <motion.div className={`${poster} mt-3 text-[clamp(5rem,30vw,9rem)] leading-[0.82] tracking-[-0.04em]`} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 160, damping: 14 }}>
            {season.live ? (
              <>
                DAY
                <br />
                <AnimatedNumber value={season.day} />
              </>
            ) : (
              <>
                {season.startsIn}
                <br />
                DAYS
              </>
            )}
          </motion.div>
          <motion.p className="mt-5 text-lg text-white/80" {...rise(0.35)}>
            {season.live ? `of ${season.totalDays}. ${season.totalDays - season.day} to go, ${firstName}.` : `until the Winter Arc begins, ${firstName}.`}
          </motion.p>
          <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/15">
            <motion.div className="h-full bg-white" initial={{ width: 0 }} animate={{ width: `${Math.max(progress * 100, 2)}%` }} transition={{ delay: 0.5, duration: 1.4, ease: "easeOut" }} />
          </div>
        </>
      ),
    },
    {
      key: "streak",
      render: () => (
        <>
          <Small>Your streak</Small>
          <div className="mt-3 flex items-end gap-3">
            <motion.span className="text-[clamp(6rem,36vw,10rem)] font-extrabold leading-[0.8] tabular-nums" initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 150, damping: 13 }}>
              <AnimatedNumber value={me.streak} />
            </motion.span>
            <motion.span className="pb-3 text-5xl grayscale" aria-hidden animate={{ scale: [1, 1.2, 1], rotate: [0, -6, 6, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>
              {me.streak > 0 ? "🔥" : "🧊"}
            </motion.span>
          </div>
          <motion.p className="mt-4 text-lg text-white/80" {...rise(0.3)}>
            {me.streak > 1 ? `${me.streak} days in a row. Don't hand it back today.` : me.streak === 1 ? "One day down. Today makes it a streak." : "No streak yet. It starts with today's first tick."}
          </motion.p>
          <motion.div className="mt-7 grid grid-cols-2 gap-3" {...rise(0.5)}>
            {[
              [me.points.toLocaleString("en-US"), "points so far"],
              [`${me.today}/${me.dailyMax}`, "points today"],
            ].map(([value, label]) => (
              <div key={label} className="border border-white/20 px-4 py-3">
                <div className="text-2xl font-bold tabular-nums">{value}</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">{label}</div>
              </div>
            ))}
          </motion.div>
        </>
      ),
    },
    {
      key: "rank",
      render: () => (
        <>
          <Small>The leaderboard</Small>
          <motion.div className={`${poster} mt-3 text-[clamp(4.5rem,26vw,8rem)] leading-[0.85]`} initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 170, damping: 16 }}>
            #{me.rank}
          </motion.div>
          <motion.p className="mt-2 text-lg text-white/80" {...rise(0.25)}>
            of {story.members} in the arc{me.rank === 1 ? ". Everyone is chasing you." : me.rank <= 3 ? ". On the podium." : "."}
          </motion.p>
          <ol className="mt-7 space-y-2.5">
            {top.slice(0, 3).map((entry, i) => (
              <motion.li key={i} className="relative overflow-hidden border border-white/15 px-3.5 py-2.5 text-sm" {...rise(0.4 + i * 0.14)}>
                <motion.span aria-hidden className="absolute inset-y-0 left-0 bg-white/15" initial={{ width: 0 }} animate={{ width: `${(entry.points / leader) * 100}%` }} transition={{ delay: 0.6 + i * 0.14, duration: 0.9, ease: "easeOut" }} />
                <span className="relative flex items-center justify-between gap-3">
                  <span className="truncate font-semibold">
                    {["I", "II", "III"][i]} · {entry.name}
                    {entry.isMe && " (you)"}
                  </span>
                  <span className="shrink-0 tabular-nums text-white/70">{entry.points.toLocaleString("en-US")}</span>
                </span>
              </motion.li>
            ))}
          </ol>
        </>
      ),
    },
  ];

  if (pack && pack.habits.length > 0)
    slides.push({
      key: "pack",
      render: () => (
        <>
          <Small>
            {pack.icon} {pack.name} pack · today
          </Small>
          <motion.div className="mt-3 text-6xl font-extrabold tabular-nums" {...rise(0.05)}>
            {done}
            <span className="text-white/40">/{pack.habits.length}</span>
          </motion.div>
          <ul className="mt-6 space-y-2">
            {pack.habits.slice(0, 7).map((habit, i) => (
              <motion.li key={habit.name} className={`flex items-center gap-3 border px-3.5 py-2.5 text-sm ${habit.done ? "border-white bg-white text-black" : "border-white/20"}`} {...rise(0.2 + i * 0.09)}>
                <span aria-hidden className="grayscale">
                  {habit.icon}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">{habit.name}</span>
                <span className="text-xs font-bold">{habit.done ? "✓" : ""}</span>
              </motion.li>
            ))}
          </ul>
          <motion.p className="mt-5 text-sm text-white/70" {...rise(0.9)}>
            {perfectDays} perfect {perfectDays === 1 ? "day" : "days"}
            {nextBadge && ` · ${nextBadge.inDays} more for “${nextBadge.title}”`}
          </motion.p>
        </>
      ),
    });

  slides.push({
    key: "go",
    render: () => (
      <>
        <Small>Today&apos;s word</Small>
        <motion.blockquote className={`${poster} mt-4 text-[clamp(1.7rem,8vw,2.4rem)] leading-[1.15]`} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          “{quote}”
        </motion.blockquote>
        <motion.div {...rise(0.6)}>
          <Link href="/dashboard" className={cta}>
            ▶ Tick today&apos;s habits
          </Link>
        </motion.div>
      </>
    ),
  });
  return slides;
}

function visitorSlides(story: Story): Slide[] {
  const { season, firstName, top, members, quote } = story;
  return [
    {
      key: "what",
      render: () => (
        <>
          <Small>{season.range}</Small>
          <h2 className={`${poster} mt-3 text-[clamp(4.2rem,24vw,7rem)] leading-[0.84] tracking-[-0.03em]`} aria-label="Winter Arc">
            {["WINTER", "ARC"].map((word, line) => (
              <span key={word} aria-hidden className="block overflow-hidden">
                <motion.span className="block" initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ delay: line * 0.16, duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}>
                  {word}
                </motion.span>
              </span>
            ))}
          </h2>
          <motion.p className="mt-5 text-lg text-white/80" {...rise(0.45)}>
            {season.live ? `It's day ${season.day} of ${season.totalDays}, ${firstName}. You can still get in.` : `It starts in ${season.startsIn} days, ${firstName}.`}
          </motion.p>
        </>
      ),
    },
    {
      key: "how",
      render: () => (
        <>
          <Small>How it works</Small>
          <ul className="mt-5 space-y-3">
            {[
              ["01", "Pick a pack", "A handful of habits, chosen for you or by you."],
              ["02", "Show up daily", "Tick them off each day. 10 points a habit."],
              ["03", "Earn it", "Streaks, badges, a surprise for every perfect day."],
            ].map(([n, title, body], i) => (
              <motion.li key={n} className="flex gap-4 border border-white/15 p-4" {...rise(0.1 + i * 0.18)}>
                <span className={`${poster} text-3xl text-white/50`}>{n}</span>
                <span>
                  <span className="block text-base font-bold">{title}</span>
                  <span className="block text-sm text-white/65">{body}</span>
                </span>
              </motion.li>
            ))}
          </ul>
        </>
      ),
    },
    {
      key: "join",
      render: () => (
        <>
          <Small>{members > 0 ? `${members} already in` : "Be the first in"}</Small>
          {top.length > 0 && (
            <ol className="mt-4 space-y-2">
              {top.slice(0, 3).map((entry, i) => (
                <motion.li key={i} className="flex items-center justify-between border border-white/15 px-3.5 py-2.5 text-sm" {...rise(0.1 + i * 0.12)}>
                  <span className="truncate font-semibold">
                    {["I", "II", "III"][i]} · {entry.name}
                  </span>
                  <span className="tabular-nums text-white/70">{entry.points.toLocaleString("en-US")}</span>
                </motion.li>
              ))}
            </ol>
          )}
          <motion.blockquote className={`${poster} mt-7 text-2xl leading-snug`} {...rise(0.5)}>
            “{quote}”
          </motion.blockquote>
          <motion.div {...rise(0.7)}>
            <Link href="/arc/start" className={cta}>
              ▶ Join the Winter Arc
            </Link>
          </motion.div>
        </>
      ),
    },
  ];
}
