"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { NotificationToggle } from "@/components/NotificationToggle";
import { Burst } from "@/components/dashboard/effects";
import { Modal } from "@/components/ui/Modal";
import { btnGhost, btnPrimary } from "@/components/ui/styles";
import { addWorkoutHabit } from "@/lib/actions/arc";
import { detectDevice, guideSeen, markGuideSeen, onOpenGuide, promptInstall, useCanInstall, type Device } from "@/lib/pwa";
import { WORKOUTS } from "@/lib/workouts";

type Props = { firstName: string; pushKey: string | null; arc: { live: boolean; member: boolean } };

// offered as first habits: small, daily, hard to argue with
const STARTERS = ["water-3l", "steps-10k", "sleep-11", "wake-early", "cold-shower"].map((id) => WORKOUTS.find((w) => w.id === id)!).filter(Boolean);

/**
 * The first-run guide. Instead of explaining the app, it has the person use
 * it: tick a practice habit, add real first habits with a tap, switch
 * reminders on, and (in season) step into the Winter Arc. Four short steps;
 * each can be skipped. It opens by itself the first time, and again from
 * Profile → Welcome guide.
 */
export function WelcomeGuide({ firstName, pushKey, arc }: Props) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [device, setDevice] = useState<Device>({ platform: "desktop", installed: false, secure: true });
  const canInstall = useCanInstall();
  const pathname = usePathname();
  const router = useRouter();
  const justSignedUp = useSearchParams().get("welcome") === "1";

  // step 1: the practice habit
  const [ticked, setTicked] = useState(false);
  const [burst, setBurst] = useState(0);
  // step 2: which starter habits have been added (for real)
  const [added, setAdded] = useState<Set<string>>(() => new Set());
  const [adding, setAdding] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setDevice(detectDevice());
    return onOpenGuide(() => {
      setIndex(0);
      setTicked(false);
      setOpen(true);
    });
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/arc")) return; // in the Winter Arc (or joining it): don't interrupt
    if (justSignedUp || !guideSeen()) setOpen(true);
  }, [justSignedUp, pathname]);

  const close = useCallback(() => {
    markGuideSeen();
    setOpen(false);
    // drop ?welcome=1 so a refresh doesn't reopen the guide; refresh so habits added here show up
    if (justSignedUp) router.replace(pathname, { scroll: false });
    router.refresh();
  }, [justSignedUp, pathname, router]);

  function tick() {
    const next = !ticked;
    setTicked(next);
    if (next) {
      setBurst(Date.now());
      navigator.vibrate?.(30);
    }
  }

  function add(id: string) {
    if (added.has(id) || adding) return;
    setAdding(id);
    startTransition(async () => {
      // "already in your habits" is as good as added
      await addWorkoutHabit(id).catch(() => null);
      setAdded((current) => new Set(current).add(id));
      setAdding(null);
    });
  }

  const steps = [
    {
      key: "try",
      title: `Welcome, ${firstName}`,
      lead: "This is all HabitFlow asks of you each day. Try it:",
      done: ticked,
      body: (
        <div>
          <button type="button" onClick={tick} aria-pressed={ticked} className={`relative flex w-full items-center gap-3.5 overflow-hidden rounded-2xl border p-4 text-left transition-colors ${ticked ? "border-brand bg-brand-soft" : "border-line bg-card"}`} data-guide-tick>
            <span className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 text-lg font-bold transition-colors ${ticked ? "border-brand bg-brand-solid text-on-brand" : "border-line text-transparent"}`}>
              ✓{burst > 0 && ticked && <Burst key={burst} color="var(--brand)" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-[15px] font-semibold ${ticked ? "line-through opacity-70" : ""}`}>💧 Drink a glass of water</span>
              <span className="block text-xs text-muted">Practice habit · Daily</span>
            </span>
            <span className="text-right text-xs font-semibold text-muted">
              <motion.span key={String(ticked)} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className="block text-lg font-bold text-ink">
                {ticked ? 1 : 0} 🔥
              </motion.span>
              day streak
            </span>
          </button>
          <p className="mt-3 min-h-[2.5rem] text-sm leading-relaxed text-muted">{ticked ? "That's it. Tick a habit each day and the streak grows; miss a day and it starts again. Tap once more to undo." : "Tap the box when it's done."}</p>
        </div>
      ),
    },
    {
      key: "pick",
      title: "Pick your first habits",
      lead: "Tap any you'd like to do every day. They go straight onto your list, and you can change them later.",
      done: added.size > 0,
      body: (
        <ul className="space-y-2">
          {STARTERS.map((habit) => {
            const on = added.has(habit.id);
            return (
              <li key={habit.id}>
                <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => add(habit.id)} disabled={on || adding !== null} aria-pressed={on} className={`flex min-h-[52px] w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors ${on ? "border-brand bg-brand-soft" : "border-line bg-card"}`} data-guide-habit={habit.id}>
                  <span className="text-xl" aria-hidden>
                    {habit.icon}
                  </span>
                  <span className="flex-1 text-sm font-semibold">{habit.name}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${on ? "bg-brand-solid text-on-brand" : "border border-line text-muted"}`}>{adding === habit.id ? "Adding…" : on ? "Added ✓" : "+ Add"}</span>
                </motion.button>
              </li>
            );
          })}
        </ul>
      ),
    },
    {
      key: "remind",
      title: "Let it remind you",
      lead: "People who get a nudge at the right moment keep going. Switch reminders on, and put HabitFlow on your home screen so it opens like an app.",
      done: false,
      body: (
        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-card p-4">
            <NotificationToggle publicKey={pushKey} />
          </div>
          <div className="rounded-2xl border border-line bg-card p-4 text-sm leading-relaxed text-muted">
            <InstallStep device={device} canInstall={canInstall} />
          </div>
        </div>
      ),
    },
    {
      key: "go",
      title: arc.live && !arc.member ? "One more thing: the Winter Arc" : "You're ready",
      lead: arc.live && !arc.member ? "A 123-day challenge is running right now. Pick a pack of habits, earn points every day, and see where you stand on the leaderboard." : "Your list is waiting. Come back each day, tick what you did, and watch the streak grow.",
      done: true,
      body: (
        <div className="rounded-2xl bg-ink p-6 text-center text-bg">
          <p className="text-5xl" aria-hidden>
            {arc.live && !arc.member ? "❄" : "🚀"}
          </p>
          <p className="mt-3 font-display text-xl font-bold">{added.size > 0 ? `${added.size} habit${added.size === 1 ? "" : "s"} on your list` : "Add a habit any time with + Add Habit"}</p>
          {arc.live && !arc.member && (
            <button
              type="button"
              onClick={() => {
                close();
                router.push("/arc/start");
              }}
              className="mt-4 w-full rounded-xl bg-bg px-4 py-3 text-sm font-bold text-ink"
            >
              Join the Winter Arc →
            </button>
          )}
        </div>
      ),
    },
  ];

  const step = steps[index];
  const last = index === steps.length - 1;

  return (
    <Modal open={open} onClose={close} title={step.title}>
      {/* how far along: one segment per step */}
      <div className="mb-4 flex gap-1.5" aria-label={`Step ${index + 1} of ${steps.length}`}>
        {steps.map((s, i) => (
          <span key={s.key} className="h-1 flex-1 overflow-hidden rounded-full bg-line">
            <motion.span className="block h-full bg-brand-solid" initial={false} animate={{ width: i <= index ? "100%" : "0%" }} transition={{ duration: 0.3 }} />
          </span>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step.key} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }} data-guide-step={step.key}>
          <p className="mb-4 text-sm leading-relaxed text-muted">{step.lead}</p>
          <div className="min-h-[15rem]">{step.body}</div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-5 flex items-center justify-between gap-3">
        {index > 0 ? (
          <button type="button" className={btnGhost} onClick={() => setIndex(index - 1)}>
            Back
          </button>
        ) : (
          <button type="button" className={`${btnGhost} border-transparent text-muted`} onClick={close}>
            Skip guide
          </button>
        )}
        <motion.button type="button" className={`${btnPrimary} min-w-[8rem]`} whileTap={{ scale: 0.95 }} onClick={() => (last ? close() : setIndex(index + 1))} data-guide-next>
          {last ? "Start" : step.done ? "Next" : "Skip this"}
        </motion.button>
      </div>
    </Modal>
  );
}

function InstallStep({ device, canInstall }: { device: Device; canInstall: boolean }) {
  const [result, setResult] = useState<"idle" | "installed" | "dismissed">("idle");

  if (result === "installed") return <p>Installed. Look for the HabitFlow icon on your home screen or app list.</p>;
  if (device.installed) return <p>You opened HabitFlow from its own icon, so it&apos;s already installed on this device. Nothing more to do.</p>;

  const benefits = <p className="mt-3">Installed, it opens full screen from its own icon like any other app — and it works offline: ticks you make without a connection are kept on the device and sync when you&apos;re back online.</p>;

  if (canInstall) {
    return (
      <>
        <p>Your browser can install HabitFlow directly.</p>
        <motion.button type="button" className={`${btnPrimary} mt-3`} whileTap={{ scale: 0.95 }} onClick={async () => setResult((await promptInstall()) ? "installed" : "dismissed")}>
          Install app
        </motion.button>
        {benefits}
      </>
    );
  }

  const list = "list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-brand";
  return (
    <>
      {device.platform === "ios" && (
        <ol className={list}>
          <li>
            Tap the <b className="text-ink">Share</b> button <ShareIcon /> in the browser&apos;s toolbar.
          </li>
          <li>
            Scroll down and tap <b className="text-ink">Add to Home Screen</b>.
          </li>
          <li>
            Tap <b className="text-ink">Add</b>.
          </li>
        </ol>
      )}
      {device.platform === "android" && (
        <ol className={list}>
          <li>
            Open the browser menu <b className="text-ink">⋮</b> at the top right.
          </li>
          <li>
            Tap <b className="text-ink">Install app</b> (or <b className="text-ink">Add to Home screen</b>).
          </li>
          <li>
            Confirm with <b className="text-ink">Install</b>.
          </li>
        </ol>
      )}
      {device.platform === "desktop" && (
        <ol className={list}>
          <li>
            <b className="text-ink">Chrome or Edge:</b> click the install icon at the right end of the address bar.
          </li>
          <li>
            <b className="text-ink">Safari on Mac:</b> File → Add to Dock.
          </li>
          <li>On your phone, open this same address and tap the ? button for phone steps.</li>
        </ol>
      )}
      {result === "dismissed" && <p className="mt-3">No problem — you can install later from the browser menu.</p>}
      {device.secure ? benefits : <p className="mt-3 rounded-lg bg-warn-soft px-3 py-2 text-[13px] text-warn">This address isn&apos;t https, so the browser may only add a shortcut rather than a full app. A proper install needs the site served over https.</p>}
    </>
  );
}

function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="inline -translate-y-px text-brand" role="img" aria-label="(a square with an arrow pointing up)">
      <path d="M12 15V3m0 0L8 7m4-4l4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}
