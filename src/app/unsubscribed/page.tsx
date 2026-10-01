import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { btnPrimary } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Reminders", robots: { index: false } };

export default async function UnsubscribedPage({ searchParams }: { searchParams: Promise<{ invalid?: string }> }) {
  const invalid = (await searchParams).invalid === "1";
  return (
    <main className="grid min-h-dvh place-items-center px-5 text-center">
      <div className="max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{invalid ? "That link didn't work" : "Reminders are off"}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {invalid ? "The unsubscribe link is incomplete or out of date. You can turn reminders off from Profile after signing in." : "You won't get Winter Arc reminder emails any more. रिमाइन्डर इमेल बन्द गरियो। You can turn them back on any time from Profile."}
        </p>
        <Link href="/profile" className={`${btnPrimary} mt-6`}>
          Open Profile
        </Link>
      </div>
    </main>
  );
}
