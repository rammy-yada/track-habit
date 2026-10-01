"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Modal } from "@/components/ui/Modal";
import { btnGhost, btnPrimary } from "@/components/ui/styles";
import { detectDevice, guideSeen, markGuideSeen, onOpenGuide, promptInstall, useCanInstall, type Device } from "@/lib/pwa";
import { AddArt, InstallArt, NavArt, TickArt, WelcomeArt } from "./illustrations";

type Props = { firstName: string; timezone: string };

/**
 * First-run walkthrough. Opens by itself the first time someone reaches the
 * app (and right after sign-up); the "Guide" button in the nav reopens it.
 * The wording and pictures switch between phone and desktop, and the last
 * step explains installing HabitFlow as an app on *this* device.
 */
export function WelcomeGuide({ firstName, timezone }: Props) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [phone, setPhone] = useState(false);
  const [device, setDevice] = useState<Device>({ platform: "desktop", installed: false, secure: true });
  const canInstall = useCanInstall();
  const pathname = usePathname();
  const router = useRouter();
  const justSignedUp = useSearchParams().get("welcome") === "1";

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)"); // same breakpoint the bottom tab bar uses
    const sync = () => setPhone(query.matches);
    sync();
    setDevice(detectDevice());
    query.addEventListener("change", sync);
    const stop = onOpenGuide(() => {
      setIndex(0);
      setDirection(1);
      setOpen(true);
    });
    return () => {
      query.removeEventListener("change", sync);
      stop();
    };
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/arc/start")) return; // mid-way through joining the arc: don't interrupt
    if (justSignedUp || !guideSeen()) setOpen(true);
  }, [justSignedUp, pathname]);

  const close = useCallback(() => {
    markGuideSeen();
    setOpen(false);
    // drop ?welcome=1 so a refresh doesn't reopen the guide
    if (justSignedUp) router.replace(pathname, { scroll: false });
  }, [justSignedUp, pathname, router]);

  const tap = phone ? "Tap" : "Click";
  const tabs = phone ? ["Today", "Stats", "Arc", "Month", "Profile"] : ["Dashboard", "Analytics", "Winter Arc", "Monthly View", "Profile"];

  const steps = [
    {
      title: `Welcome, ${firstName}`,
      art: <WelcomeArt />,
      body: (
        <p>
          HabitFlow keeps one short list: the habits you want to do today. Tick them off and it keeps the streaks, charts and monthly grid for you. This guide takes about half a minute{phone ? " — swipe, or tap Next." : "."}
        </p>
      ),
    },
    {
      title: "Add your first habit",
      art: <AddArt />,
      body: (
        <p>
          {tap} <b className="text-ink">+ Add Habit</b> at the top of {phone ? "the Today screen" : "the Dashboard"}. Give it a name, an icon and a colour — everything else is optional. Start with one or two; you can have up to 50.
        </p>
      ),
    },
    {
      title: "Tick it off each day",
      art: <TickArt />,
      body: (
        <p>
          {tap} the square beside a habit when it&apos;s done, and {tap.toLowerCase()} again to undo. Days in a row build a streak. The list resets at midnight in your timezone (<b className="text-ink">{timezone}</b> — change it in Profile). The pencil button adds a note and mood for the day.
        </p>
      ),
    },
    {
      title: "Find your way around",
      art: <NavArt phone={phone} tabs={tabs} />,
      body: phone ? (
        <p>
          The bar at the bottom of the screen switches between <b className="text-ink">{tabs.join(", ")}</b>. In Month, swipe the grid sideways to see every day, and tap any past day to fix a tick you missed. <b className="text-ink">Arc</b> is the Winter Arc challenge: a leaderboard and workout ideas.
        </p>
      ) : (
        <p>
          The sidebar switches between <b className="text-ink">{tabs.join(", ")}</b>. Analytics shows your weekly pattern; Monthly View is a full grid where you can click any past day to fix a tick you missed. The round button by your name switches between light, dark and the Winter Arc theme. <b className="text-ink">Winter Arc</b> is the seasonal challenge, with a leaderboard and workout ideas.
        </p>
      ),
    },
    {
      title: device.installed ? "You're in the app" : phone ? "Put HabitFlow on your home screen" : "Install HabitFlow as an app",
      art: <InstallArt />,
      body: <InstallStep device={device} canInstall={canInstall} />,
    },
  ];

  const last = index === steps.length - 1;
  const go = (to: number) => {
    if (to < 0 || to >= steps.length) return;
    setDirection(to > index ? 1 : -1);
    setIndex(to);
  };
  const step = steps[index];

  return (
    <Modal open={open} onClose={close} title={step.title}>
      <div className="overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={index}
            custom={direction}
            variants={{
              enter: (dir: number) => ({ x: dir * 60, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (dir: number) => ({ x: dir * -60, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
            // on a phone the steps can be swiped like cards
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) go(index + 1);
              else if (info.offset.x > 60) go(index - 1);
            }}
            className="touch-pan-y"
          >
            <div className="mb-5 h-40 rounded-2xl bg-raised p-4">{step.art}</div>
            <div className="min-h-[8.5rem] text-sm leading-relaxed text-muted">{step.body}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex gap-1.5" role="tablist" aria-label="Guide steps">
          {steps.map((s, i) => (
            <button key={i} type="button" role="tab" aria-selected={i === index} aria-label={`Step ${i + 1}: ${s.title}`} onClick={() => go(i)} className="grid h-6 place-items-center">
              <motion.span className="block h-1.5 rounded-full" animate={{ width: i === index ? 22 : 6, backgroundColor: i === index ? "var(--brand)" : "var(--line)" }} transition={{ type: "spring", stiffness: 400, damping: 30 }} />
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {index > 0 ? (
            <button type="button" className={btnGhost} onClick={() => go(index - 1)}>
              Back
            </button>
          ) : (
            <button type="button" className={`${btnGhost} border-transparent text-muted`} onClick={close}>
              Skip
            </button>
          )}
          <motion.button type="button" className={btnPrimary} whileTap={{ scale: 0.95 }} onClick={() => (last ? close() : go(index + 1))} data-autofocus>
            {last ? "Get started" : "Next"}
          </motion.button>
        </div>
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
