"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Magnetic } from "@/components/landing/Magnetic";
import { Reveal } from "@/components/ui/Reveal";
import { btnGhost, btnPrimary, card } from "@/components/ui/styles";
import { CREATOR } from "@/lib/constants";

const HEARTS = [8, 22, 37, 55, 71, 86];

export function SupportPanel() {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  // The system share sheet exists on phones (and a few desktop browsers).
  useEffect(() => setCanShare(typeof navigator.share === "function"), []);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(timer);
  }, [copied]);

  async function share() {
    if (canShare) {
      try {
        await navigator.share({ title: `Support ${CREATOR.handle}`, text: "Support the creator of HabitFlow", url: CREATOR.supportUrl });
      } catch {
        // closing the share sheet is not an error
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(CREATOR.supportUrl);
      setCopied(true);
    } catch {
      window.prompt("Copy this link", CREATOR.supportUrl);
    }
  }

  return (
    <div className="max-w-2xl space-y-5 px-4 py-6 md:px-8 md:py-7">
      <motion.section className={`${card} relative overflow-hidden p-6 text-center sm:p-10`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* hearts drift up behind the card, forever */}
        <span aria-hidden className="pointer-events-none absolute inset-0">
          {HEARTS.map((left, i) => (
            <motion.span
              key={left}
              className="absolute bottom-0 text-brand"
              style={{ left: `${left}%`, fontSize: 12 + (i % 3) * 5 }}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: -340, opacity: [0, 0.35, 0.35, 0], x: [0, i % 2 ? 14 : -14, 0] }}
              transition={{ duration: 6 + (i % 3), delay: i * 0.9, repeat: Infinity, ease: "easeOut" }}
            >
              ♥
            </motion.span>
          ))}
        </span>

        <div className="relative">
          <div className="relative mx-auto mb-5 h-24 w-24">
            <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,var(--brand),transparent_55%,var(--brand))] [animation:spin-slow_5s_linear_infinite]" />
            <motion.span
              className="absolute inset-[3px] grid place-items-center rounded-full bg-brand-solid font-display text-4xl font-extrabold text-white"
              initial={{ scale: 0.5, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 14 }}
            >
              {CREATOR.handle[0].toUpperCase()}
            </motion.span>
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Creator of HabitFlow</p>
          <h2 className="font-display text-3xl font-bold tracking-tight">@{CREATOR.handle}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
            HabitFlow is made by {CREATOR.handle}. If it helps you stay consistent, you can say thanks with a tip.
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Magnetic>
              <motion.a href={CREATOR.supportUrl} target="_blank" rel="noopener noreferrer" className={`${btnPrimary} px-7 py-3.5 text-base`} whileTap={{ scale: 0.96 }}>
                <motion.span aria-hidden animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}>
                  ♥
                </motion.span>
                Support {CREATOR.handle}
                <span aria-hidden>↗</span>
              </motion.a>
            </Magnetic>
            <button type="button" onClick={share} className={`${btnGhost} min-w-[8.5rem] px-5 py-3.5`}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={copied ? "copied" : "idle"} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ duration: 0.15 }}>
                  {copied ? "Link copied ✓" : canShare ? "Share link" : "Copy link"}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>

          <p className="mt-5 break-all font-mono text-xs text-muted">{CREATOR.supportUrl.replace("https://", "")}</p>
        </div>
      </motion.section>

      <Reveal>
        <section className={`${card} p-6 text-[13px] leading-relaxed text-muted sm:p-7`}>
          <h2 className="mb-2 text-[15px] font-bold text-ink">How it works</h2>
          <p>
            The button opens {CREATOR.handle}&apos;s tip page on Kamaucha in a new tab, and you finish there. HabitFlow itself doesn&apos;t take payments or see any payment details, and every feature stays free whether you tip or not.
          </p>
        </section>
      </Reveal>
    </div>
  );
}
