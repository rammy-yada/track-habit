"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { AppControls } from "@/components/AppStatus";
import { replayArcIntro } from "./ArcIntro";
import { ProfileSheet } from "./ProfileSheet";
import { ShareAchievement } from "./ShareAchievement";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { leaveArc } from "@/lib/actions/arc";
import type { getArc } from "@/lib/arc";
import { whenOnline } from "@/lib/offline";
import { UserAvatar } from "@/components/ui/UserAvatar";

type Arc = Awaited<ReturnType<typeof getArc>>;
type Entry = Arc["board"][number];

// The Winter Arc screen is a black-and-white poster: grainy, high contrast,
// thin tall lettering, a hooded knight resting on a sword. It keeps this look
// in both light and dark theme. (`grayscale` on the frame turns everything
// inside it monochrome, including people's coloured avatars.)
const PLACES = [
  { numeral: "I", block: "linear-gradient(180deg,#ffffff,#b9b9b9)", ink: "#000", ring: "#ffffff", height: 132, delay: 0.75 },
  { numeral: "II", block: "linear-gradient(180deg,#bdbdbd,#666666)", ink: "#000", ring: "#bdbdbd", height: 100, delay: 0.45 },
  { numeral: "III", block: "linear-gradient(180deg,#757575,#2e2e2e)", ink: "#fff", ring: "#757575", height: 78, delay: 0.2 },
];

const poster = "font-[family-name:var(--font-poster)]";

/**
 * The Winter Arc as a phone screen. On a phone it simply is the screen; on a
 * wider display it sits inside a device frame and scrolls inside it.
 */
export function ArcScreen({ arc }: { arc: Arc }) {
  const { season, board, me } = arc;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // tapping someone on the leaderboard opens their profile (members only: others are invited to join)
  const [viewing, setViewing] = useState<number | null>(null);
  const view = me ? setViewing : undefined;

  const run = (action: () => Promise<{ ok: true } | { ok: false; error: string }>) =>
    startTransition(async () => {
      setError(null);
      const result = await whenOnline(action);
      if (!result.ok) setError(result.error);
    });

  const podium = [board[1], board[0], board[2]]; // II · I · III, like a real podium
  const rest = board.slice(3);
  const topPoints = Math.max(1, board[0]?.points ?? 0);
  const progress = season.live ? season.day / season.totalDays : 0;

  return (
    <div className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-[28px] bg-[#050505] text-white shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9)] grayscale md:h-[790px] md:w-[392px] md:rounded-[54px] md:border-[11px] md:border-[#141414] md:ring-1 md:ring-white/15">
      {/* device details, desktop only */}
      <span aria-hidden className="absolute left-1/2 top-2.5 z-40 hidden h-[26px] w-[104px] -translate-x-1/2 rounded-full bg-black md:block" />
      <span aria-hidden className="absolute bottom-2 left-1/2 z-40 hidden h-1 w-28 -translate-x-1/2 rounded-full bg-white/40 md:block" />
      {/* film grain over everything */}
      <span aria-hidden className="grain pointer-events-none absolute inset-0 z-30 opacity-70" />

      <div className="no-scrollbar relative md:h-full md:overflow-y-auto md:overscroll-contain">
        {/* ── Poster ── */}
        <header className="relative h-[480px] overflow-hidden bg-[linear-gradient(180deg,#f4f4f4_0%,#dcdcdc_30%,#9b9b9b_58%,#3a3a3a_80%,#050505_100%)] text-black">
          {/* slow fog banks */}
          <span aria-hidden className="aurora absolute -left-24 top-24 h-40 w-80 rounded-full bg-white/80 blur-[46px]" />
          <span aria-hidden className="aurora absolute -right-28 top-44 h-36 w-72 rounded-full bg-[#5c5c5c]/70 blur-[50px] [animation-delay:-4s]" />
          <Snow />

          <h2 className={`${poster} relative pt-10 text-center text-[4.6rem] leading-[0.86] tracking-[-0.04em] md:pt-14`} aria-label="Winter Arc">
            {["WINTER", "ARC"].map((word, line) => (
              <span key={word} aria-hidden className="block">
                {word.split("").map((ch, i) => (
                  <motion.span key={i} className="inline-block" initial={{ y: 30, opacity: 0, filter: "blur(8px)" }} animate={{ y: 0, opacity: 1, filter: "blur(0px)" }} transition={{ delay: 0.1 + line * 0.3 + i * 0.06, duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}>
                    {ch}
                  </motion.span>
                ))}
              </span>
            ))}
          </h2>

          <Knight />

          {/* day counter, bottom of the poster */}
          <div className="absolute inset-x-6 bottom-4 text-white" role="img" aria-label={season.live ? `Day ${season.day} of ${season.totalDays}` : `Starts in ${season.startsIn} days`}>
            <div className="flex items-end justify-between text-[10px] font-semibold uppercase tracking-[0.22em] text-white/75">
              <span>{season.range}</span>
              <span>
                {season.live ? (
                  <>
                    Day <AnimatedNumber value={season.day} /> / {season.totalDays}
                  </>
                ) : (
                  `Starts in ${season.startsIn}d`
                )}
              </span>
            </div>
            <div className="mt-2 h-px bg-white/25">
              <motion.div className="h-px bg-white" initial={{ width: 0 }} animate={{ width: `${Math.max(progress * 100, 1.5)}%` }} transition={{ delay: 0.9, duration: 1.2, ease: "easeOut" }} />
            </div>
          </div>
        </header>

        {/* ── Podium ── */}
        <section aria-label="Top three" className="relative px-5 pt-6">
          <div className="mb-4 flex items-baseline justify-between px-1">
            <h3 className={`${poster} text-2xl tracking-[0.12em]`}>LEADERBOARD</h3>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">{arc.members} in the arc</span>
          </div>

          <div className="grid grid-cols-3 items-end gap-2.5 border-b border-white/15 px-2 pt-6">
            {podium.map((entry, i) => {
              const place = i === 1 ? 0 : i === 0 ? 1 : 2;
              return <PodiumSpot key={place} entry={entry} place={PLACES[place]} first={place === 0} onView={view} />;
            })}
          </div>
        </section>

        {/* ── You ── */}
        <section className="px-5 pt-5" aria-label="Your arc">
          <AnimatePresence mode="wait" initial={false}>
            {me ? (
              <motion.div key="me" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="rounded-2xl bg-white p-4 text-black">
                <div className="flex items-center gap-3.5">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-black text-center leading-none text-white">
                    <div>
                      <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/60">Rank</div>
                      <div className="text-2xl font-bold tabular-nums">
                        <AnimatedNumber value={me.rank} />
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/55">Your arc</div>
                    <div className="text-2xl font-bold leading-tight tabular-nums">
                      <AnimatedNumber value={me.points} /> <span className="text-sm font-medium text-black/55">pts</span>
                    </div>
                  </div>
                  <div className="text-right text-xs font-semibold">
                    <div>{me.streak}-day streak</div>
                    <div className="mt-1 font-medium text-black/55">
                      {me.activeDays} active {me.activeDays === 1 ? "day" : "days"}
                    </div>
                  </div>
                </div>
                <div className="mt-3.5">
                  <div className="mb-1.5 flex justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-black/60">
                    <span>Today</span>
                    <span className="tabular-nums">
                      {me.today} / {me.dailyMax} pts
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-black/15">
                    <motion.div className="h-full rounded-full bg-black" initial={{ width: 0 }} animate={{ width: `${(me.today / me.dailyMax) * 100}%` }} transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.3 }} />
                  </div>
                </div>
                <ShareAchievement stats={{ day: season.day, totalDays: season.totalDays, points: me.points, streak: me.streak, rank: me.rank }} />
              </motion.div>
            ) : (
              <motion.div key="join" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="rounded-2xl border border-white/15 p-5 text-center">
                <p className={`${poster} text-xl tracking-[0.1em]`}>NOT IN THE ARC YET</p>
                <p className="mx-auto mt-2 max-w-[17rem] text-xs leading-relaxed text-white/60">Choose your habits, start the arc, and earn points for every one you tick.</p>
                <Link href="/arc/start" className="relative mt-4 block w-full overflow-hidden rounded-xl bg-white py-3 text-sm font-bold uppercase tracking-[0.14em] text-black">
                  <span aria-hidden className="shine absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-black/15 to-transparent" />
                  <span className="relative">Join the Winter Arc</span>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
          {error && (
            <p role="alert" className="mt-2 text-center text-xs text-white/80">
              {error}
            </p>
          )}
        </section>

        {/* ── Everyone else ── */}
        <section className="px-5 pb-4 pt-4" aria-label="Rankings">
          {board.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/20 px-4 py-6 text-center text-xs text-white/55">Nobody has joined yet. Be the first name on the board.</p>
          ) : (
            <ol className="space-y-1.5">
              {rest.map((entry, i) => (
                <motion.li
                  key={entry.username}
                  initial={{ opacity: 0, x: -18 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: Math.min(i, 8) * 0.05, type: "spring", stiffness: 260, damping: 26 }}
                  className={`relative flex items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 ${entry.isMe ? "border-white bg-white/10" : "border-white/10"}`}
                >
                  {view && <button type="button" className="absolute inset-0 z-10 rounded-xl" aria-label={`View ${entry.name}'s profile`} onClick={() => view(entry.avatar.id)} data-view-profile={entry.username} />}
                  {/* how close this person is to first place */}
                  <motion.span aria-hidden className="absolute inset-y-0 left-0 bg-white/[0.07]" initial={{ width: 0 }} whileInView={{ width: `${(entry.points / topPoints) * 100}%` }} viewport={{ once: true }} transition={{ delay: 0.2 + Math.min(i, 8) * 0.05, duration: 0.7 }} />
                  <span className="relative w-6 text-center text-xs font-bold tabular-nums text-white/55">{entry.rank}</span>
                  <Avatar entry={entry} size={34} />
                  <span className="relative min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate text-[13px] font-semibold">
                      {entry.name}
                      {entry.isMe && <span className="rounded-sm bg-white px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-black">You</span>}
                    </span>
                    <span className="block truncate text-[11px] text-white/50">
                      @{entry.username} · {entry.activeDays} active {entry.activeDays === 1 ? "day" : "days"}
                    </span>
                  </span>
                  <span className="relative text-sm font-bold tabular-nums">
                    {entry.points.toLocaleString("en-US")} <span className="text-[10px] font-medium text-white/50">pts</span>
                  </span>
                </motion.li>
              ))}
            </ol>
          )}
          {me && me.rank > board.length && <p className="mt-3 text-center text-xs text-white/55">You&apos;re #{me.rank} — keep ticking to climb onto the board.</p>}
        </section>

        {/* ── Rules, and app controls ── */}
        <footer className="space-y-3 px-5 pb-8 md:pb-10">
          <div className="rounded-xl border border-white/10">
            <button type="button" onClick={() => setShowRules((v) => !v)} aria-expanded={showRules} className="flex w-full items-center justify-between px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
              How points work
              <motion.span aria-hidden animate={{ rotate: showRules ? 180 : 0 }}>
                ⌄
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {showRules && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <ul className="space-y-1.5 px-4 pb-3 text-xs leading-relaxed text-white/60">
                    <li>• 10 points for each habit you tick, up to 5 habits a day (50 points).</li>
                    <li>• Only ticks made on the day count. Filling in old days fixes your record, not your score.</li>
                    <li>• Ticks made offline count once they sync, if that happens within a day.</li>
                    <li>• Ties go to whoever has more active days, then whoever joined first.</li>
                  </ul>
                  {me && (
                    <button type="button" disabled={pending} onClick={() => setLeaving(true)} className="w-full px-4 pb-3 text-left text-xs font-medium text-white/45 underline-offset-2 hover:text-white/80 hover:underline">
                      Leave the arc and remove me from the leaderboard
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="rounded-xl border border-white/10 p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">App</p>
            <AppControls tone="dark" />
            <button type="button" onClick={replayArcIntro} className="mt-3 rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/10">
              Replay intro
            </button>
          </div>
        </footer>
      </div>
      <ProfileSheet userId={viewing} onClose={() => setViewing(null)} />
      <ConfirmDialog
        open={leaving}
        title="Leave the Winter Arc?"
        body="You'll be taken off the leaderboard and the Winter Arc look is removed from your account. Your habits and check-ins stay. You can join again later."
        confirmLabel="Leave the arc"
        onConfirm={() => run(leaveArc)}
        onClose={() => setLeaving(false)}
      />
    </div>
  );
}

function PodiumSpot({ entry, place, first, onView }: { entry: Entry | undefined; place: (typeof PLACES)[number]; first: boolean; onView?: (userId: number) => void }) {
  return (
    <div className="relative flex flex-col items-center">
      {entry && onView && <button type="button" className="absolute inset-0 z-10" aria-label={`View ${entry.name}'s profile`} onClick={() => onView(entry.avatar.id)} data-view-profile={entry.username} />}
      <motion.div className="relative mb-2 flex flex-col items-center" initial={{ y: -40, opacity: 0, scale: 0.6 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: place.delay + 0.35, type: "spring", stiffness: 300, damping: 15 }}>
        {first && entry && (
          <motion.svg aria-hidden className="absolute -top-6" width="26" height="18" viewBox="0 0 26 18" fill="#fff" animate={{ y: [0, -4, 0], rotate: [-5, 5, -5] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}>
            <path d="M2 16 L1 5 L7 10 L13 1 L19 10 L25 5 L24 16 Z" />
          </motion.svg>
        )}
        {entry ? (
          <span className="rounded-full p-[2px]" style={{ background: place.ring }}>
            <Avatar entry={entry} size={first ? 58 : 48} ring />
          </span>
        ) : (
          <span className="grid place-items-center rounded-full border border-dashed border-white/25 text-white/30" style={{ width: first ? 62 : 52, height: first ? 62 : 52 }}>
            ?
          </span>
        )}
        <span className="mt-1.5 max-w-full truncate text-xs font-semibold">
          {entry ? entry.name : "Open spot"}
          {entry?.isMe && <span className="ml-1 text-white/60">(you)</span>}
        </span>
        <span className="text-[11px] font-medium tabular-nums text-white/60">{entry ? <><AnimatedNumber value={entry.points} /> pts</> : "—"}</span>
      </motion.div>

      {/* the block rises out of the floor; first place gets a moving glint */}
      <motion.div className="relative w-full overflow-hidden" style={{ background: place.block }} initial={{ height: 0 }} animate={{ height: place.height }} transition={{ delay: place.delay, type: "spring", stiffness: 90, damping: 15 }}>
        {first && <span aria-hidden className="shine absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-black/20 to-transparent" />}
        <span className={`${poster} absolute inset-x-0 top-2 text-center text-2xl`} style={{ color: place.ink }}>
          {place.numeral}
        </span>
      </motion.div>
    </div>
  );
}

function Avatar({ entry, size, ring = false }: { entry: Entry; size: number; ring?: boolean }) {
  return <UserAvatar user={entry.avatar} size={size} className={`relative ${ring ? "border-2 border-black" : ""}`} />;
}

/**
 * A hooded knight, head bowed, both hands resting on a sword planted in the
 * ground. Drawn here as plain shapes: a silhouette with a few lighter edges.
 */
export function Knight() {
  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 300 330"
      className="absolute bottom-0 left-1/2 w-[62%] max-w-[240px] -translate-x-1/2"
      initial={{ y: 46, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, duration: 1.3, ease: [0.2, 0.7, 0.2, 1] }}
    >
      <defs>
        <linearGradient id="arc-blade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6f6f6f" />
          <stop offset="0.45" stopColor="#f2f2f2" />
          <stop offset="0.55" stopColor="#2b2b2b" />
          <stop offset="1" stopColor="#bdbdbd" />
        </linearGradient>
        <clipPath id="arc-blade-clip">
          <path d="M143 196 L158 194 L156 330 L146 330 Z" />
        </clipPath>
      </defs>

      {/* far ridge */}
      <path d="M0 330 V262 L22 250 L40 266 L58 244 L74 262 L74 330 Z M300 330 V236 L282 250 L270 232 L258 256 L246 244 L246 330 Z" fill="#161616" />

      {/* cloak: one mass from the shoulders to the ground */}
      <path d="M150 96 C112 96 84 116 70 150 C52 196 44 262 30 330 H270 C256 262 250 196 232 150 C218 116 188 96 150 96 Z" fill="#050505" />
      {/* hood, tipped forward */}
      <path d="M152 22 C118 20 98 48 98 84 C98 110 110 128 128 136 L176 134 C196 124 206 104 204 78 C202 46 184 24 152 22 Z" fill="#050505" />
      {/* the shadow under the hood, a shade lighter so the hood reads as hollow */}
      <path d="M150 58 C134 60 126 78 128 98 C130 114 138 124 150 126 C164 124 172 112 172 96 C172 76 164 60 150 58 Z" fill="#0d0d0d" />
      {/* rim of light along the hood */}
      <path d="M104 62 C108 40 128 26 152 26" stroke="#7a7a7a" strokeWidth="1.4" fill="none" />

      {/* pauldrons catching the light */}
      <path d="M84 134 C96 114 118 108 134 116 C128 132 112 146 92 150 Z" fill="#2c2c2c" />
      <path d="M216 132 C204 112 182 108 168 116 C174 132 190 146 208 148 Z" fill="#3a3a3a" />
      <path d="M90 136 C100 122 116 116 130 120" stroke="#8e8e8e" strokeWidth="1.5" fill="none" />
      <path d="M210 134 C200 120 186 116 172 120" stroke="#a8a8a8" strokeWidth="1.5" fill="none" />

      {/* folds of the cloak */}
      <g stroke="#262626" strokeWidth="1.4" fill="none">
        <path d="M96 160 C84 210 76 270 66 330" />
        <path d="M118 176 C110 226 106 280 100 330" />
        <path d="M204 160 C216 210 224 270 234 330" />
        <path d="M184 178 C192 226 196 280 200 330" />
      </g>

      {/* forearms meeting on the hilt */}
      <path d="M104 150 C122 150 140 158 148 172 L152 186 L138 190 C126 180 110 172 98 170 Z" fill="#101010" />
      <path d="M198 148 C180 150 162 158 154 172 L150 186 L164 190 C176 180 190 172 204 168 Z" fill="#101010" />

      {/* sword: pommel, grip, crossguard, blade */}
      <circle cx="150" cy="150" r="7" fill="#1c1c1c" stroke="#9a9a9a" strokeWidth="1.2" />
      <rect x="146" y="156" width="8" height="34" fill="#0c0c0c" />
      {/* gauntlets wrapped around the grip */}
      <path d="M132 166 C140 160 160 160 168 166 L170 184 C160 192 140 192 130 184 Z" fill="#1e1e1e" stroke="#6e6e6e" strokeWidth="1" />
      <path d="M136 172 H164 M135 178 H165" stroke="#5a5a5a" strokeWidth="1" />
      <path d="M108 198 L192 188 L194 196 L110 206 Z" fill="#2a2a2a" stroke="#a6a6a6" strokeWidth="1" />
      <path d="M143 196 L158 194 L156 330 L146 330 Z" fill="url(#arc-blade)" />
      <path d="M151 200 V330" stroke="#111" strokeWidth="1.4" />
      {/* a glint that runs down the blade every few seconds */}
      <g clipPath="url(#arc-blade-clip)">
        <rect className="glint" x="140" y="196" width="22" height="34" fill="#ffffff" opacity="0.9" />
      </g>
    </motion.svg>
  );
}

/**
 * Snow across the poster. `mix-blend-difference` makes each flake dark against
 * the pale sky and pale against the dark ground. Positions are fixed, not
 * random, so server and browser render the same thing.
 */
export function Snow() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 mix-blend-difference">
      {Array.from({ length: 26 }, (_, i) => (
        <span
          key={i}
          className="snow absolute top-0 rounded-full bg-white"
          style={{
            left: `${(i * 37 + 11) % 100}%`,
            width: 2 + (i % 3),
            height: 2 + (i % 3),
            ["--t" as string]: `${7 + (i % 5) * 1.4}s`,
            ["--delay" as string]: `${-((i * 1.7) % 11)}s`,
            ["--sway" as string]: `${i % 2 ? 22 : -16}px`,
            ["--o" as string]: 0.4 + (i % 4) * 0.15,
          }}
        />
      ))}
    </span>
  );
}
