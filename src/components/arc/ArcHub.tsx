"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { replayArcStory } from "./ArcStory";

const TABS = [
  { id: "goals", label: "Goals", icon: "🎯" },
  { id: "tips", label: "Tips", icon: "💡" },
  { id: "quote", label: "Quote", icon: "✍️" },
  { id: "leaderboard", label: "Leaderboard", icon: "🏆" },
] as const;
type Tab = (typeof TABS)[number]["id"];

type Props = {
  /** "Day 12 of 123" or "Starts in 5 days" */
  status: string;
  member: boolean;
  goals: React.ReactNode;
  tips: React.ReactNode;
  quote: React.ReactNode;
  leaderboard: React.ReactNode;
};

/**
 * The Winter Arc as a place of its own: it covers the whole screen — the
 * app's menu and tab bar are out of the way — with its own bar across the top
 * and four sections. The story plays over it each time it is opened.
 */
export function ArcHub({ status, member, goals, tips, quote, leaderboard }: Props) {
  const [tab, setTab] = useState<Tab>(member ? "goals" : "leaderboard");
  const panels: Record<Tab, React.ReactNode> = { goals, tips, quote, leaderboard };

  // the address remembers the section (#tips), so a shared or reloaded link lands on it
  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.slice(1);
      if (TABS.some((t) => t.id === id)) setTab(id as Tab);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);
  const choose = (id: Tab) => {
    setTab(id);
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg" data-arc-hub>
      <header className="flex items-center gap-3 border-b border-line bg-card/90 px-3 pb-3 pt-[calc(12px+env(safe-area-inset-top))] backdrop-blur sm:px-6">
        <Link href="/dashboard" aria-label="Back to Today" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-lg text-muted hover:border-brand hover:text-brand">
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-bold leading-tight tracking-tight">❄ Winter Arc</h1>
          <p className="truncate text-xs font-medium text-muted">{status}</p>
        </div>
        <motion.button type="button" onClick={replayArcStory} whileTap={{ scale: 0.95 }} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-line bg-card px-3.5 py-2 text-[13px] font-semibold hover:border-brand hover:text-brand" data-story-button>
          <span aria-hidden>▶</span> Story
        </motion.button>
      </header>

      <nav aria-label="Winter Arc sections" className="border-b border-line bg-card/90 backdrop-blur">
        <div role="tablist" className="mx-auto grid max-w-3xl grid-cols-4">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" id={`arc-tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`arc-panel-${t.id}`} onClick={() => choose(t.id)} className={`relative flex min-h-[54px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold sm:flex-row sm:gap-2 sm:text-sm ${tab === t.id ? "text-brand" : "text-muted hover:text-ink"}`}>
              <span aria-hidden className="text-base leading-none">
                {t.icon}
              </span>
              <span className="max-w-full truncate">{t.label}</span>
              {tab === t.id && <motion.span layoutId="arc-tab-line" className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            </button>
          ))}
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* every section stays mounted, so what was typed in one is still there after visiting another */}
        {TABS.map((t) => (
          <section key={t.id} role="tabpanel" id={`arc-panel-${t.id}`} aria-labelledby={`arc-tab-${t.id}`} hidden={tab !== t.id} className="mx-auto w-full max-w-3xl px-4 pb-[calc(32px+env(safe-area-inset-bottom))] pt-6 sm:px-6">
            {panels[t.id]}
          </section>
        ))}
      </div>
    </div>
  );
}
