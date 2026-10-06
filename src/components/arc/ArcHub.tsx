"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Modal } from "@/components/ui/Modal";
import { replayArcIntro } from "./ArcIntro";

const TABS = [
  { id: "pack", label: "My pack", icon: <path d="M21 8l-9-5-9 5m18 0v8l-9 5m9-13l-9 5m0 8l-9-5V8m9 13V13M3 8l9 5" /> },
  { id: "tips", label: "Tips", icon: <path d="M9 18h6m-5 3h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.3 1.1 2.2h5c0-.9.5-1.7 1.1-2.2A6 6 0 0 0 12 3z" /> },
  { id: "quote", label: "Quote", icon: <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3zM14 7l3 3" /> },
  { id: "leaderboard", label: "Ranks", icon: <path d="M8 21h8m-4-4v4M7 4h10v5a5 5 0 0 1-10 0V4zm0 2H4a3 3 0 0 0 3 4m10-4h3a3 3 0 0 1-3 4" /> },
] as const;
type Tab = (typeof TABS)[number]["id"];

type Props = {
  /** "Day 12 of 123" or "Starts in 5 days" */
  status: string;
  leaderboard: React.ReactNode;
  pack: React.ReactNode;
  tips: React.ReactNode;
  quote: React.ReactNode;
  /** Opened from the ⋯ menu. */
  goals: React.ReactNode;
};

const round = "grid h-10 w-10 place-items-center rounded-full border border-line bg-card text-ink shadow-sm";

/**
 * The Winter Arc as a place of its own: it covers the whole screen, opens on
 * your pack, and has its sections along the bottom. At the top there is
 * only a way back and a ⋯ menu, which holds the things used less often — your
 * goals, and playing the intro again.
 */
export function ArcHub({ status, leaderboard, pack, tips, quote, goals }: Props) {
  const [tab, setTab] = useState<Tab>("pack");
  const [menu, setMenu] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const panels: Record<Tab, React.ReactNode> = { leaderboard, pack, tips, quote };

  // the address remembers the section (#tips), so a reloaded link lands on it
  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.slice(1);
      if (TABS.some((t) => t.id === id)) setTab(id as Tab);
      if (id === "goals") setShowGoals(true);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);
  const choose = (id: Tab) => {
    setTab(id);
    history.replaceState(null, "", `#${id}`);
  };

  const items = [
    { label: "My goals", note: "What you want to have done by the end", icon: "🎯", run: () => setShowGoals(true) },
    { label: "Play the intro again", note: "The opening scene", icon: "▶", run: replayArcIntro },
  ];

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg" data-arc-hub>
      <header className="flex items-center justify-between px-3 pb-1 pt-[calc(10px+env(safe-area-inset-top))] sm:px-6">
        <Link href="/dashboard" aria-label="Back to Today" className={round}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <h1 className="sr-only">Winter Arc — {status}</h1>
        <div className="relative">
          <button type="button" aria-label="More" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((v) => !v)} className={round} data-arc-menu>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="12" cy="5" r="1.9" />
              <circle cx="12" cy="12" r="1.9" />
              <circle cx="12" cy="19" r="1.9" />
            </svg>
          </button>
          {menu && (
            <>
              {/* a tap anywhere else closes the menu */}
              <button type="button" aria-label="Close menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenu(false)} />
              <motion.div role="menu" initial={{ opacity: 0, scale: 0.92, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.14 }} className="absolute right-0 top-12 z-20 w-64 origin-top-right overflow-hidden rounded-2xl border border-line bg-card shadow-2xl">
                {items.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenu(false);
                      item.run();
                    }}
                    className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-raised"
                  >
                    <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-raised text-sm">
                      {item.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className="block truncate text-xs text-muted">{item.note}</span>
                    </span>
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* every section stays mounted, so what was typed in one is still there after visiting another */}
        {TABS.map((t) => (
          <section key={t.id} role="tabpanel" id={`arc-panel-${t.id}`} aria-labelledby={`arc-tab-${t.id}`} hidden={tab !== t.id} className="mx-auto w-full max-w-3xl px-4 pb-8 pt-3 sm:px-6">
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
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {t.icon}
              </svg>
              <span className="max-w-full truncate">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <Modal open={showGoals} onClose={() => setShowGoals(false)} title="My goals">
        {goals}
      </Modal>
    </div>
  );
}
