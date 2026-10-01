import type { Metadata } from "next";
import { InquiryForm } from "@/components/InquiryForm";
import { PublicPage } from "@/components/PublicPage";
import { APP_NAME } from "@/lib/constants";

const description = `Work with ${APP_NAME}: creators, communities, colleges, gyms and developers. Run a habit challenge with your people, or build something with us.`;
export const metadata: Metadata = {
  title: "Collaborate",
  description,
  alternates: { canonical: "/collaborate" },
  openGraph: { type: "website", siteName: APP_NAME, title: `Collaborate with ${APP_NAME}`, description, url: "/collaborate", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: APP_NAME }] },
};

const WAYS = [
  { icon: "🎥", title: "Creators", body: "Run a habit challenge with your audience. We can set up a pack of habits with your name on it that your followers add in one tap." },
  { icon: "🏫", title: "Colleges and clubs", body: "A shared challenge for a class, a hostel or a club: everyone on the same pack, with a leaderboard to keep it friendly." },
  { icon: "🏋️", title: "Gyms and coaches", body: "Give your members a daily checklist that matches your programme, and see who is showing up." },
  { icon: "🧑‍💻", title: "Developers and designers", body: `${APP_NAME} is a small, independent project. If you want to improve it, translate it or design for it, say hello.` },
];

export default function CollaboratePage() {
  return (
    <PublicPage width="max-w-5xl">
      <header className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">Collaborate</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Let&apos;s build better habits together</h1>
        <p className="mt-3 text-base leading-relaxed text-muted">If you lead a group of people who want to get better at something — an audience, a class, a team, a gym — we&apos;d like to hear from you. Tell us what you have in mind and we&apos;ll work out the rest together.</p>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <section aria-label="Ways to work together">
          <h2 className="font-display text-xl font-bold tracking-tight">Ways to work together</h2>
          <ul className="mt-4 space-y-3">
            {WAYS.map((way) => (
              <li key={way.title} className="flex gap-4 rounded-2xl border border-line bg-card p-4">
                <span className="text-2xl" aria-hidden>
                  {way.icon}
                </span>
                <div>
                  <h3 className="text-sm font-bold">{way.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{way.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm leading-relaxed text-muted">Something else in mind? Use the form anyway. Every message is read by a person.</p>
        </section>

        <section aria-label="Send a message">
          <h2 className="mb-4 font-display text-xl font-bold tracking-tight">Tell us about it</h2>
          <InquiryForm kind="collab" companyLabel="Channel, community or organisation" companyPlaceholder="e.g. your channel or college" messagePlaceholder="Who are your people, and what would you like to do together?" />
        </section>
      </div>
    </PublicPage>
  );
}
