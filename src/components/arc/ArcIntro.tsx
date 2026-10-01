"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";

const SEEN_KEY = "habitflow:arc-intro-seen";
const REPLAY_EVENT = "habitflow:arc-intro";
const poster = "font-[family-name:var(--font-poster)]";

/** Lets the "Replay intro" button on the arc screen start it again. */
export const replayArcIntro = () => window.dispatchEvent(new Event(REPLAY_EVENT));

// The scene, beat by beat — staged like the opening of a game.
const BEATS = [
  { at: 0, name: "before" }, //     LEVEL 01: a tired figure, stats nearly empty
  { at: 2300, name: "ignite" }, //  LEVEL UP: flash, shockwave, the figure changes, stats fill
  { at: 4700, name: "title" }, //   NEW QUEST: WINTER ARC — press start
  { at: 11000, name: "done" }, //   (starts by itself if nobody presses)
] as const;
type Beat = (typeof BEATS)[number]["name"];

const STATS = [
  { label: "Discipline", low: 12 },
  { label: "Strength", low: 18 },
  { label: "Focus", low: 9 },
];

type Props = {
  firstName: string;
  /** Pictures uploaded in Admin → Winter Arc. Where one is missing, a built-in drawing is used. */
  images?: { before: string | null; after: string | null };
  /** Length of the season in days (shown as the level reached and on the title card). */
  totalDays?: number;
  /** Called when the scene ends, however it ends. */
  onDone?: () => void;
  /** false: never start by itself, only when asked to (the join flow starts it at the right moment). */
  auto?: boolean;
};

/**
 * The Winter Arc's opening scene, played the first time someone opens it: a
 * tired character levels up into a strong one, then a "new quest" title card.
 * Tap Skip (or press Escape) to end it. People who ask their device for
 * reduced motion never see it.
 */
export function ArcIntro({ firstName, images, totalDays = 123, onDone, auto = true }: Props) {
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState<Beat>("before");

  const finish = useCallback(() => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
    setPlaying(false);
    onDone?.();
  }, [onDone]);

  useEffect(() => {
    const start = () => {
      setBeat("before");
      setPlaying(true);
    };
    let seen = true;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
    } catch {}
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (auto && !seen && !reduced) start();
    // asked to play, but this person prefers no motion: skip straight to the end
    const onReplay = () => (reduced ? finish() : start());
    window.addEventListener(REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_EVENT, onReplay);
  }, [auto, finish]);

  useEffect(() => {
    if (!playing) return;
    const timers = BEATS.map(({ at, name }) => setTimeout(() => (name === "done" ? finish() : setBeat(name)), at));
    const onKey = (e: KeyboardEvent) => (e.key === "Escape" || (e.key === "Enter" && beat === "title")) && finish();
    window.addEventListener("keydown", onKey);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("keydown", onKey);
    };
    // the timers are set once per play, not once per beat
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, finish]);

  if (typeof document === "undefined") return null;
  const strong = beat !== "before";

  return createPortal(
    <AnimatePresence>
      {playing && (
        <motion.div
          role="dialog"
          aria-label="Winter Arc intro"
          className="fixed inset-0 z-[70] overflow-hidden bg-black font-mono text-white grayscale"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          // the scene lifts away like a curtain, uncovering the arc screen
          exit={{ clipPath: "inset(0 0 100% 0)", transition: { duration: 0.7, ease: [0.7, 0, 0.2, 1] } }}
          style={{ clipPath: "inset(0 0 0% 0)" }}
        >
          {/* speed lines streaming upward once the change starts */}
          <span aria-hidden className="absolute inset-0">
            {Array.from({ length: 18 }, (_, i) => (
              <motion.span
                key={i}
                className="absolute top-full w-px bg-white"
                style={{ left: `${(i * 53 + 7) % 100}%`, height: 60 + (i % 5) * 40 }}
                animate={strong ? { y: [0, -1400], opacity: [0, 0.5, 0] } : { opacity: 0 }}
                transition={{ duration: 0.9 + (i % 4) * 0.25, delay: (i % 6) * 0.12, repeat: Infinity, ease: "linear" }}
              />
            ))}
          </span>

          {/* ── HUD: player and level, top left ── */}
          <div className="absolute left-4 top-4 text-[10px] uppercase tracking-[0.2em] sm:left-6 sm:top-6">
            <div className="text-white/50">Player</div>
            <div className="text-sm font-bold tracking-[0.14em]">{firstName}</div>
            <div className="mt-2 flex items-center gap-2 text-white/50">
              Level
              <span className="relative inline-block h-5 w-10 overflow-hidden text-sm font-bold text-white">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={strong ? "max" : "one"} className="absolute inset-0" initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -18, opacity: 0 }}>
                    {strong ? totalDays : "01"}
                  </motion.span>
                </AnimatePresence>
              </span>
            </div>
          </div>
          <button type="button" onClick={finish} className="absolute right-4 top-4 z-10 rounded-full border border-white/30 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80 hover:bg-white/10 sm:right-6 sm:top-6">
            Skip
          </button>

          {/* ── the character ── */}
          <div className="absolute inset-0 grid place-items-center">
            <div className="relative h-[min(52vh,440px)] w-[min(76vw,300px)]">
              <AnimatePresence>
                {strong && (
                  <motion.span key="energy" aria-hidden className="absolute inset-0 grid place-items-center" exit={{ opacity: 0 }}>
                    <motion.span className="absolute h-40 w-40 rounded-full border-2 border-white" initial={{ scale: 0.2, opacity: 0.9 }} animate={{ scale: 5, opacity: 0 }} transition={{ duration: 1.1, ease: "easeOut" }} />
                    <motion.span className="absolute h-40 w-40 rounded-full border border-white" initial={{ scale: 0.2, opacity: 0.7 }} animate={{ scale: 3.4, opacity: 0 }} transition={{ duration: 1.3, delay: 0.15, ease: "easeOut" }} />
                    <motion.span className="absolute h-[150%] w-[170%] rounded-full bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.4),transparent_60%)]" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: [0.4, 1.1, 1], opacity: [0, 1, 0.75] }} transition={{ duration: 0.9 }} />
                    {Array.from({ length: 16 }, (_, i) => (
                      <span key={i} className="absolute h-[150%] w-px origin-center" style={{ transform: `rotate(${i * 22.5}deg)` }}>
                        <motion.span className="block h-1/2 w-px origin-bottom bg-gradient-to-t from-white to-transparent" initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: [0, 1, 0.75], opacity: [0, 0.9, 0.3] }} transition={{ duration: 0.8, delay: 0.05 + (i % 4) * 0.05 }} />
                      </span>
                    ))}
                  </motion.span>
                )}
              </AnimatePresence>

              <AnimatePresence mode="popLayout">
                {!strong ? (
                  <motion.div key="before" className="absolute inset-0" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, filter: "blur(10px)" }} transition={{ duration: 0.6 }}>
                    <Figure strong={false} src={images?.before ?? null} />
                  </motion.div>
                ) : (
                  <motion.div key="after" className="absolute inset-0" initial={{ opacity: 0, scale: 0.8, y: 26 }} animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }} transition={{ opacity: { delay: 0.12 }, scale: { type: "spring", stiffness: 170, damping: 13, delay: 0.12 }, y: { duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 1 } }}>
                    <Figure strong src={images?.after ?? null} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* the flash at the moment of change */}
          {beat === "ignite" && <motion.span aria-hidden className="absolute inset-0 bg-white" initial={{ opacity: 0.95 }} animate={{ opacity: 0 }} transition={{ duration: 0.55, ease: "easeOut" }} />}

          {/* ── captions, top centre ── */}
          <div className="absolute inset-x-0 top-[13vh] px-6 text-center">
            <AnimatePresence mode="wait">
              {beat === "before" && <Caption key="a" small="Day 0" big="WHO YOU WERE" />}
              {beat === "ignite" && <Caption key="b" small="Level up" big="WHO YOU BECOME" />}
              {beat === "title" && (
                <motion.div key="c" exit={{ opacity: 0 }}>
                  <motion.p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-white/60" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.4, 1] }} transition={{ duration: 0.6 }}>
                    New quest unlocked
                  </motion.p>
                  <h2 className={`${poster} mt-2 text-[clamp(3rem,14vw,5.2rem)] leading-[0.86] tracking-[-0.03em]`} aria-label="Winter Arc">
                    {["WINTER", "ARC"].map((word, line) => (
                      <span key={word} aria-hidden className="block overflow-hidden">
                        <motion.span className="block" initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ delay: 0.15 + line * 0.14, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}>
                          {word}
                        </motion.span>
                      </span>
                    ))}
                  </h2>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── bottom: stat bars, then the start button ── */}
          <div className="absolute inset-x-0 bottom-[5vh] mx-auto w-[min(86vw,340px)]">
            <AnimatePresence mode="wait">
              {beat !== "title" ? (
                <motion.div key="stats" className="space-y-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
                  {STATS.map((stat, i) => (
                    <div key={stat.label} className="flex items-center gap-3 text-[10px] uppercase tracking-[0.18em]">
                      <span className="w-[5.5rem] text-white/60">{stat.label}</span>
                      <span className="h-2 flex-1 border border-white/40 p-px">
                        <motion.span className="block h-full bg-white" initial={{ width: 0 }} animate={{ width: `${strong ? 100 : stat.low}%` }} transition={strong ? { duration: 0.9, delay: 0.25 + i * 0.18, ease: "easeOut" } : { duration: 0.6, delay: 0.3 + i * 0.12 }} />
                      </span>
                      <span className="w-8 text-right tabular-nums">{strong ? "MAX" : stat.low}</span>
                    </div>
                  ))}
                </motion.div>
              ) : (
                <motion.div key="start" className="text-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                  <p className="mb-4 text-[11px] uppercase tracking-[0.3em] text-white/75">{totalDays} days · Become better, {firstName}</p>
                  <motion.button type="button" onClick={finish} autoFocus className="w-full border-2 border-white bg-white py-3.5 text-sm font-bold uppercase tracking-[0.3em] text-black" animate={{ opacity: [1, 0.55, 1] }} transition={{ duration: 1.2, repeat: Infinity }} whileTap={{ scale: 0.96 }}>
                    ▶ Press start
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* scanlines and grain: an old screen */}
          <span aria-hidden className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_2px,rgba(0,0,0,0.28)_3px)]" />
          <span aria-hidden className="grain pointer-events-none absolute inset-0 opacity-80" />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Caption({ small, big }: { small: string; big: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-white/55">{small}</p>
      <p className={`${poster} mt-2 text-3xl tracking-[0.14em]`}>{big}</p>
    </motion.div>
  );
}

/**
 * The character. If an admin has uploaded a picture for this slot it is shown
 * (a PNG with a transparent background works best); otherwise one of two
 * built-in silhouettes: narrow and slumped before, broad and upright after.
 */
function Figure({ strong, src }: { strong: boolean; src: string | null }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- an uploaded WebP served by our own route
    return <img src={src} alt="" className={`h-full w-full object-contain object-bottom ${strong ? "drop-shadow-[0_0_28px_rgba(255,255,255,0.55)]" : "opacity-70"}`} />;
  }
  if (!strong) {
    return (
      <svg viewBox="0 0 200 330" className="h-full w-full" aria-hidden>
        <g fill="#3b3b3b">
          <circle cx="97" cy="64" r="17" />
          <path d="M84 60 L82 46 L90 52 L94 42 L100 52 L108 44 L109 56 L115 54 L112 66 C106 56 92 54 84 60 Z" />
          {/* shoulders rolled forward, arms hanging */}
          <path d="M96 82 C84 84 72 90 67 104 C63 116 62 150 64 202 C64 210 71 212 73 204 L77 132 L81 200 C81 214 83 226 85 240 L86 322 H99 L101 250 L104 322 H117 L117 240 C119 224 121 212 121 200 L124 132 L128 204 C130 212 136 210 136 202 C138 150 138 116 132 104 C126 90 110 84 96 82 Z" />
        </g>
        <path d="M70 108 C68 140 68 170 69 198" stroke="#5a5a5a" strokeWidth="1.2" fill="none" />
      </svg>
    );
  }

  // one half is drawn, the other is its mirror image
  const half = (
    <>
      <path
        fill="#040404"
        d="M100 70 L112 70 C116 76 126 80 138 82 C154 84 166 94 170 110 C174 126 172 142 168 156 L172 196 C174 210 170 222 161 224 C153 223 150 212 152 198 L150 158 C149 146 146 138 142 134 L137 176 C134 194 133 206 135 218 L139 236 L146 318 L148 328 H116 L115 318 L109 246 L100 238 Z"
      />
      {/* chest, shoulder and arm definition */}
      <g fill="none" stroke="#4a4a4a" strokeWidth="1.5" strokeLinecap="round">
        <path d="M101 104 C110 113 126 112 137 102" />
        <path d="M150 92 C157 104 157 118 152 128" />
        <path d="M157 150 C161 162 162 176 160 190" />
        <path d="M103 124 H115 M103 142 H114 M103 160 H113" />
        <path d="M118 236 C122 262 122 288 120 314" />
      </g>
      {/* light catching the outer edge */}
      <path d="M138 82 C154 84 166 94 170 110 C174 126 172 142 168 156 L172 196" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
      <path d="M139 236 L146 318" fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.5" />
    </>
  );

  return (
    <svg viewBox="0 0 200 330" className="h-full w-full" aria-hidden>
      {half}
      <g transform="translate(200 0) scale(-1 1)">{half}</g>
      {/* centre line of the torso, and a belt */}
      <path d="M100 88 V206" stroke="#4a4a4a" strokeWidth="1.5" />
      <path d="M66 216 H134" stroke="#8a8a8a" strokeWidth="2" />
      {/* head and swept-up hair */}
      <circle cx="100" cy="48" r="19" fill="#040404" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.55" />
      <path d="M79 46 L74 26 L85 33 L87 14 L97 28 L104 10 L110 28 L122 16 L119 34 L128 30 L122 48 C116 35 104 31 96 33 C88 33 82 39 79 46 Z" fill="#040404" />
      <path d="M74 26 L85 33 L87 14 L97 28 L104 10 L110 28 L122 16" fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.7" />
      <path d="M92 76 H108" stroke="#4a4a4a" strokeWidth="1.5" />
    </svg>
  );
}
