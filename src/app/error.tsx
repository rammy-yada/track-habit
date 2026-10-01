"use client";

import { btnGhost, btnPrimary } from "@/components/ui/styles";

// Last-resort error page for anything the (app) error boundary doesn't catch —
// in practice: the database or SESSION_SECRET being unavailable.
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center px-5 text-center">
      <div className="max-w-sm">
        <h1 className="font-display text-2xl font-bold tracking-tight">HabitFlow can&apos;t load right now</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">The server hit a problem, most likely reaching its database. Your habits are safe — please try again in a moment.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" onClick={reset} className={btnPrimary}>
            Try again
          </button>
          <a href="/api/health" className={btnGhost}>
            Status
          </a>
        </div>
        {error.digest && <p className="mt-5 font-mono text-[11px] text-muted">Error {error.digest}</p>}
      </div>
    </main>
  );
}
