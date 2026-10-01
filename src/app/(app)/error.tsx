"use client";

import { btnPrimary } from "@/components/ui/styles";

// Shown when a page throws — most often because MySQL isn't running.
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-[70dvh] place-items-center px-5 text-center">
      <div className="max-w-sm">
        <h1 className="font-display text-2xl font-bold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">We couldn&apos;t load this page. If you&apos;re running locally, check that XAMPP&apos;s MySQL is started, then try again.</p>
        <button type="button" onClick={reset} className={`${btnPrimary} mt-6`}>
          Try again
        </button>
      </div>
    </div>
  );
}
