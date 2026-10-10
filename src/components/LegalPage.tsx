import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SiteFooter } from "@/components/PublicPage";
import { CONTACT_EMAIL, CREATOR } from "@/lib/constants";

/** Shared frame for the Privacy Policy and Terms pages. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-10">
        <Logo />
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10 sm:py-14">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated {updated}</p>
        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-muted [&_a]:font-semibold [&_a]:text-brand [&_a:hover]:underline [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink [&_ul]:space-y-1.5">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/** How to reach whoever runs this site. */
export function Contact() {
  return CONTACT_EMAIL ? (
    <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
  ) : (
    <>
      the creator,{" "}
      <a href={CREATOR.supportUrl} target="_blank" rel="noopener noreferrer">
        {CREATOR.handle}
      </a>
    </>
  );
}

/** "By continuing you agree…" line under the sign-in and sign-up forms. */
export function LegalNote() {
  return (
    <p className="mt-5 text-center text-xs leading-relaxed text-muted">
      By continuing you agree to the{" "}
      <Link href="/terms" className="font-semibold text-brand hover:underline">
        Terms
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className="font-semibold text-brand hover:underline">
        Privacy Policy
      </Link>
      .
    </p>
  );
}
