"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { replayArcStory } from "./ArcStory";

const TABS = [
  { id: "goals", label: "Goals", icon: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" /> },
  { id: "tips", label: "Tips", icon: <path d="M9 18h6m-5 3h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.3 1.1 2.2h5c0-.9.5-1.7 1.1-2.2A6 6 0 0 0 12 3z" /> },
  { id: "quote", label: "Quote", icon: <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3zM14 7l3 3" /> },
  { id: "leaderboard", label: "Ranks", icon: <path d="M8 21h8m-4-4v4M7 4h10v5a5 5 0 0 1-10 0V4zm0 2H4a3 3 0 0 0 3 4m10-4h3a3 3 0 0 1-3 4" /> },
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
      <header className="flex items-center gap-3 border-b border-line bg-card px-3 pb-3 pt-[calc(12px+env(safe-area-inset-top))] sm:px-6">
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

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* every section stays mounted, so what was typed in one is still there after visiting another */}
        {TABS.map((t) => (
          <section key={t.id} role="tabpanel" id={`arc-panel-${t.id}`} aria-labelledby={`arc-tab-${t.id}`} hidden={tab !== t.id} className="mx-auto w-full max-w-3xl px-4 pb-8 pt-5 sm:px-6">
            {panels[t.id]}
          </section>
        ))}
      </div>

      {/* the sections, within reach of a thumb at the bottom of the screen */}
      <nav aria-label="Winter Arc sections" className="border-t border-line bg-card pb-[env(safe-area-inset-bottom)]">
        <div role="tablist" className="mx-auto grid max-w-3xl grid-cols-4">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" id={`arc-tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`arc-panel-${t.id}`} onClick={() => choose(t.id)} className={`relative flex min-h-[60px] flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold ${tab === t.id ? "text-brand" : "text-muted hover:text-ink"}`}>
              {tab === t.id && <motion.span layoutId="arc-tab-line" className="absolute top-0 h-0.5 w-10 rounded-full bg-brand" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <motion.svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden animate={{ y: tab === t.id ? -1 : 0, scale: tab === t.id ? 1.12 : 1 }} transition={{ type: "spring", stiffness: 400, damping: 22 }}>
                {t.icon}
              </motion.svg>
              <span className="max-w-full truncate">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
