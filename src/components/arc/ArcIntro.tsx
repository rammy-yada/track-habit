"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DEFAULT_INTRO, type IntroConfig } from "@/lib/arc-config";
import { createIntroSound, setSoundMuted, soundMuted, type IntroSound } from "@/lib/arc-sound";

const SEEN_KEY = "habitflow:arc-intro-seen";
const REPLAY_EVENT = "habitflow:arc-intro";
const poster = "font-[family-name:var(--font-poster)]";

/** Lets a button anywhere on the page start the scene again. */
export const replayArcIntro = () => window.dispatchEvent(new Event(REPLAY_EVENT));

// The scene in three beats, like the opening of a game:
//   before  — a tired figure in the dark, the counter at day 0
//   ignite  — a flash; the figure changes; the counter runs up to the last day
//   title   — WINTER ARC, and a button to begin
// It moves on by itself, and a tap anywhere moves it on sooner.
const BEATS = ["before", "ignite", "title"] as const;
type Beat = (typeof BEATS)[number];
const HOLD: Record<Beat, number> = { before: 2000, ignite: 2300, title: 6500 };

const STATS = [
  { label: "Discipline", low: 0.12 },
  { label: "Strength", low: 0.18 },
  { label: "Focus", low: 0.09 },
];

type Props = {
  firstName: string;
  /** Pictures uploaded in Admin → Winter Arc. Where one is missing, a built-in drawing is used. */
  images?: { before: string | null; after: string | null };
  /** Length of the season in days (the number the counter runs up to). */
  totalDays?: number;
  /** Called when the scene ends, however it ends. */
  onDone?: () => void;
  /** false: never start by itself, only when asked to (the join flow starts it at the right moment). */
  auto?: boolean;
  /** Play on every visit, not just the first. */
  always?: boolean;
  /** Shake, sound and wording, as set in Admin → Winter Arc. */
  config?: IntroConfig & { soundUrl?: string | null };
};

// How far the screen is thrown at the moment of change, in pixels.
const SHAKE = { off: 0, soft: 7, hard: 18 } as const;

/**
 * The Winter Arc's opening scene.
 *
 * Built to stay smooth on a phone: everything that moves is a CSS transition
 * or keyframe on `transform` and `opacity` only (see ".arc-intro" in
 * globals.css), so the browser animates it on the graphics chip without
 * running any script per frame. React only changes one attribute —
 * data-beat — three times. Nothing blurs, nothing filters, nothing repaints.
 *
 * Tap anywhere to move on, Skip (or Escape) to end it. People who ask their
 * device for reduced motion don't get it unless they press replay.
 */
export function ArcIntro({ firstName, images, totalDays = 123, onDone, auto = true, always = false, config = DEFAULT_INTRO }: Props) {
  const [playing, setPlaying] = useState(false);
  const [closing, setClosing] = useState(false);
  const [beat, setBeat] = useState<Beat>("before");
  const [muted, setMuted] = useState(false);
  const sound = useRef<IntroSound | null>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const { text } = config;
  const amount = SHAKE[config.shake];
  const hasSound = config.sound !== "none" && (config.sound !== "custom" || Boolean(config.soundUrl));
  const tagline = text.tagline.replaceAll("{name}", firstName).replaceAll("{days}", String(totalDays));

  const finish = useCallback(() => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
    sound.current?.stop();
    // fade out first, then leave the page
    setClosing(true);
    setTimeout(() => {
      setPlaying(false);
      setClosing(false);
      onDone?.();
    }, 380);
  }, [onDone]);

  // start: by itself on arriving (if allowed), or when asked to replay
  useEffect(() => {
    const start = () => {
      setBeat("before");
      setClosing(false);
      setPlaying(true);
    };
    let seen = true;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
    } catch {}
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (auto && (always || !seen) && !reduced) start();
    window.addEventListener(REPLAY_EVENT, start);
    return () => window.removeEventListener(REPLAY_EVENT, start);
  }, [auto, always]);

  // each beat holds for a while, then gives way to the next (or the scene ends)
  useEffect(() => {
    if (!playing || closing) return;
    const next = BEATS[BEATS.indexOf(beat) + 1];
    const timer = setTimeout(() => (next ? setBeat(next) : finish()), HOLD[beat]);
    return () => clearTimeout(timer);
  }, [playing, closing, beat, finish]);

  // sound, vibration and the running counter follow the beats
  useEffect(() => {
    if (!playing) return;
    const off = soundMuted();
    setMuted(off);
    sound.current = createIntroSound(off ? "none" : config.sound, config.soundUrl ?? null);
    sound.current.start();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      sound.current?.stop();
      document.body.style.overflow = overflow;
    };
  }, [playing, config.sound, config.soundUrl]);
  useEffect(() => {
    if (!playing) return;
    if (beat === "ignite") {
      sound.current?.ignite();
      if (amount) navigator.vibrate?.(amount > 10 ? [120, 40, 160] : 90);
      // the day counter runs from 0 to the last day; written straight into the page, not through React
      const from = performance.now();
      let frame = 0;
      const tick = (now: number) => {
        const t = Math.min(1, (now - from) / 1500);
        if (counter.current) counter.current.textContent = String(Math.round(totalDays * (1 - (1 - t) ** 3)));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frame);
    }
    if (beat === "title") sound.current?.title();
    if (beat === "before" && counter.current) counter.current.textContent = "0";
  }, [beat, playing, amount, totalDays]);

  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => (e.key === "Escape" || (e.key === "Enter" && beat === "title")) && finish();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, beat, finish]);

  function toggleSound() {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
    sound.current?.stop();
    sound.current = createIntroSound(next ? "none" : config.sound, config.soundUrl ?? null);
    if (!next) sound.current.start();
  }

  // a tap anywhere moves the scene on; on the title it is the button that begins
  const advance = () => beat !== "title" && setBeat(BEATS[BEATS.indexOf(beat) + 1]);

  if (typeof document === "undefined" || !playing) return null;
  const pill = "rounded-full border border-white/30 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80";

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Winter Arc intro" data-arc-scene data-beat={beat} data-closing={closing || undefined} className="arc-intro fixed inset-0 z-[70] overflow-hidden bg-black font-mono text-white" style={{ ["--amp" as string]: `${amount}px` }} onClick={advance}>
      <div className="ai-stage absolute inset-0">
        {/* light rising behind the figure, and streaks of speed once it changes */}
        <span aria-hidden className="ai-glow absolute left-1/2 top-[46%] h-[70vh] w-[70vh] rounded-full" />
        <span aria-hidden className="absolute inset-0">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="ai-streak absolute bottom-0 w-px bg-white" style={{ left: `${8 + i * 10.5}%`, height: 70 + (i % 4) * 50, ["--d" as string]: `${(i % 5) * 0.13}s`, ["--t" as string]: `${0.8 + (i % 3) * 0.3}s` }} />
          ))}
        </span>
        <span aria-hidden className="ai-ring absolute left-1/2 top-[46%] h-40 w-40 rounded-full border-2 border-white" />
        <span aria-hidden className="ai-ring ai-ring-2 absolute left-1/2 top-[46%] h-40 w-40 rounded-full border border-white" />

        {/* ── top: who is playing, and the day ── */}
        <div className="absolute left-4 top-[calc(16px+env(safe-area-inset-top))] text-[10px] uppercase tracking-[0.2em] sm:left-6">
          <div className="text-white/50">Player</div>
          <div className="text-sm font-bold tracking-[0.14em]">{firstName}</div>
        </div>
        <div className="absolute right-4 top-[calc(14px+env(safe-area-inset-top))] z-10 flex gap-2 sm:right-6">
          {hasSound && (
            <button type="button" onClick={(e) => (e.stopPropagation(), toggleSound())} aria-pressed={!muted} className={pill}>
              {muted ? "Sound off" : "Sound on"}
            </button>
          )}
          <button type="button" onClick={(e) => (e.stopPropagation(), finish())} className={pill}>
            Skip
          </button>
        </div>

        {/* ── the lines, one per beat, in the same place ── */}
        <div className="absolute inset-x-0 top-[13vh] px-6 text-center">
          <div className="ai-line ai-line-before">
            <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-white/55">Day 0</p>
            <p className={`${poster} mt-2 text-[clamp(1.4rem,7vw,1.875rem)] uppercase tracking-[0.14em]`}>{text.before}</p>
          </div>
          <div className="ai-line ai-line-ignite">
            <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-white/55">
              Day <span ref={counter} className="tabular-nums text-white">0</span>
            </p>
            <p className={`${poster} mt-2 text-[clamp(1.4rem,7vw,1.875rem)] uppercase tracking-[0.14em]`}>{text.after}</p>
          </div>
          <div className="ai-line ai-line-title">
            <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-white/60">{text.quest}</p>
            <h2 className={`${poster} mt-2 text-[clamp(3rem,14vw,5.2rem)] leading-[0.86] tracking-[-0.03em]`} aria-label="Winter Arc">
              {["WINTER", "ARC"].map((word) => (
                <span key={word} aria-hidden className="block overflow-hidden">
                  <span className="ai-word block">{word}</span>
                </span>
              ))}
            </h2>
          </div>
        </div>

        {/* ── the character: both versions are there from the start, one fades into the other ── */}
        <div className="absolute inset-0 grid place-items-center">
          <div className="relative h-[min(50vh,430px)] w-[min(74vw,290px)]">
            <div className="ai-figure ai-figure-before absolute inset-0">
              <Figure strong={false} src={images?.before ?? null} />
            </div>
            <div className="ai-figure ai-figure-after absolute inset-0">
              <Figure strong src={images?.after ?? null} />
            </div>
          </div>
        </div>

        {/* ── bottom: the bars fill, then the button ── */}
        <div className="absolute inset-x-0 bottom-[calc(5vh+env(safe-area-inset-bottom))] mx-auto w-[min(86vw,340px)]">
          <div className="ai-stats space-y-2">
            {STATS.map((stat, i) => (
              <div key={stat.label} className="flex items-center gap-3 text-[10px] uppercase tracking-[0.18em]">
                <span className="w-[5.5rem] text-white/60">{stat.label}</span>
                <span className="h-2 flex-1 overflow-hidden border border-white/40 p-px">
                  <span className="ai-bar block h-full w-full origin-left bg-white" style={{ ["--low" as string]: stat.low, ["--d" as string]: `${0.15 + i * 0.16}s` }} />
                </span>
              </div>
            ))}
          </div>
          <div className="ai-start absolute inset-x-0 bottom-0 text-center">
            <p className="mb-4 text-[11px] uppercase tracking-[0.3em] text-white/75">{tagline}</p>
            <button type="button" onClick={(e) => (e.stopPropagation(), finish())} className="ai-button w-full border-2 border-white bg-white py-3.5 text-sm font-bold uppercase tracking-[0.3em] text-black">
              ▶ {text.button}
            </button>
          </div>
        </div>

        <p className="ai-hint pointer-events-none absolute inset-x-0 bottom-[calc(10px+env(safe-area-inset-bottom))] text-center text-[9px] uppercase tracking-[0.24em] text-white/35">Tap to continue</p>
      </div>
      {/* the flash at the moment of change */}
      <span aria-hidden className="ai-flash pointer-events-none absolute inset-0 bg-white" />
    </div>,
    document.body,
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
    return <img src={src} alt="" className={`h-full w-full object-contain object-bottom grayscale ${strong ? "drop-shadow-[0_0_28px_rgba(255,255,255,0.55)]" : "opacity-70"}`} />;
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
