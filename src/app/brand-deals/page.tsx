import type { Metadata } from "next";
import { InquiryForm } from "@/components/InquiryForm";
import { PublicPage } from "@/components/PublicPage";
import { APP_NAME } from "@/lib/constants";

const description = `Partner with ${APP_NAME}: sponsor a Winter Arc challenge, a habit pack or prizes for the people who finish. Tell us about your brand and we'll reply with options.`;
export const metadata: Metadata = {
  title: "Brand Deals & Sponsorship",
  description,
  alternates: { canonical: "/brand-deals" },
  openGraph: { type: "website", siteName: APP_NAME, title: `Brand deals — ${APP_NAME}`, description, url: "/brand-deals", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: APP_NAME }] },
};

const OPTIONS = [
  { icon: "❄️", title: "Sponsor a Winter Arc challenge", body: "Your brand alongside the season's challenge, in front of people who open the app every day from October to January." },
  { icon: "📦", title: "A habit pack from your brand", body: "A ready-made set of habits with your name on it that members add in one tap: a hydration pack, a study pack, a training plan." },
  { icon: "🏆", title: "Prizes for the people who finish", body: "Reward the top of the leaderboard, or everyone who completes the arc. The people who win are the ones who showed up." },
  { icon: "✍️", title: "A feature on the blog", body: "A useful article written with you, clearly marked as sponsored." },
];

const STEPS = ["You send the form below.", "We reply by email with current numbers and what would fit.", "We agree the details in writing before anything goes live."];

export default function BrandDealsPage() {
  return (
    <PublicPage width="max-w-5xl">
      <header className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">Brand deals</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Reach people who show up every day</h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          {APP_NAME} is used by people who are actively trying to get better: training, studying, sleeping and eating well. If your brand helps with that, there is a natural place for it here.
        </p>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <div className="space-y-8">
          <section aria-label="What a partnership can look like">
            <h2 className="font-display text-xl font-bold tracking-tight">What a partnership can look like</h2>
            <ul className="mt-4 space-y-3">
              {OPTIONS.map((option) => (
                <li key={option.title} className="flex gap-4 rounded-2xl border border-line bg-card p-4">
                  <span className="text-2xl" aria-hidden>
                    {option.icon}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold">{option.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{option.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="How it works">
            <h2 className="font-display text-xl font-bold tracking-tight">How it works</h2>
            <ol className="mt-4 space-y-2.5">
              {STEPS.map((step, i) => (
                <li key={step} className="flex items-start gap-3 text-sm leading-relaxed text-muted">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </section>

          <section aria-label="What we won't do" className="rounded-2xl bg-raised p-5 text-sm leading-relaxed text-muted">
            <h2 className="mb-1 text-sm font-bold text-ink">What we won&apos;t do</h2>
            We never sell or share members&apos; data, and sponsored content is always marked as such. We only take partners we would be comfortable recommending to a friend.
          </section>
        </div>

        <section aria-label="Send a message">
          <h2 className="mb-4 font-display text-xl font-bold tracking-tight">Tell us about your brand</h2>
          <InquiryForm kind="brand" companyLabel="Brand or company" companyPlaceholder="Your brand's name" messagePlaceholder="What does your brand do, and what would you like to achieve?" />
        </section>
      </div>
    </PublicPage>
  );
}
