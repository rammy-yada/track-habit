import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Knight, Snow } from "@/components/arc/ArcScreen";
import { Reveal } from "@/components/ui/Reveal";
import { ARC_HABITS_PER_DAY, ARC_POINTS_PER_HABIT, arcSeason, isArcMember } from "@/lib/arc";
import { currentUser } from "@/lib/auth";
import { todayIn } from "@/lib/dates";

export const metadata: Metadata = { title: "Winter Arc", description: "Oct 1 to Jan 31. Choose your habits, show up every day, and finish the year stronger than you started it." };

const poster = "font-[family-name:var(--font-poster)]";

// The public front door to the Winter Arc. The rest of the site keeps its
// normal look; this one page (and, later, the accounts of people who join)
// wears the poster.
export default async function WinterArcPage() {
  const user = await currentUser();
  const season = arcSeason(todayIn(user?.timezone ?? "UTC"));
  const member = user ? await isArcMember(user) : false;

  const primary = !user
    ? { href: "/register?join=arc", label: "Join — create your account" }
    : user.role === "admin"
      ? { href: "/admin/arc", label: "Open the admin view" }
      : member
        ? { href: "/arc", label: "Open your Winter Arc" }
        : { href: "/arc/start", label: "Choose your habits and begin" };

  const steps = [
    { n: "I", title: "Make an account", body: "With an email and password, or with Google. It takes a minute." },
    { n: "II", title: "Choose your habits", body: "Pick from the arc essentials — wake early, walk, water, train — or add your own." },
    { n: "III", title: "Begin", body: "Tick them off each day. Every tick earns points and moves you up the leaderboard." },
  ];

  return (
    <div className="min-h-dvh bg-[#050505] text-white">
      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-10">
        <Link href="/" className="font-display text-lg font-bold tracking-tight text-white">
          HabitFlow
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {!user && (
            <Link href="/login?join=arc" className="rounded-xl px-3 py-2 text-sm font-semibold text-white/80 hover:text-white">
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* ── the poster ── */}
      <section className="relative mx-auto h-[620px] max-w-3xl overflow-hidden bg-[linear-gradient(180deg,#f4f4f4_0%,#dcdcdc_30%,#9b9b9b_58%,#3a3a3a_80%,#050505_100%)] text-black grayscale sm:rounded-[36px]">
        <span aria-hidden className="aurora absolute -left-24 top-32 h-48 w-96 rounded-full bg-white/80 blur-[52px]" />
        <span aria-hidden className="aurora absolute -right-28 top-56 h-40 w-80 rounded-full bg-[#5c5c5c]/70 blur-[56px] [animation-delay:-4s]" />
        <Snow />
        <p className="relative pt-12 text-center text-[11px] font-semibold uppercase tracking-[0.34em] text-black/70">{season.range}</p>
        <h1 className={`${poster} relative mt-4 text-center text-[clamp(4.2rem,17vw,7.5rem)] leading-[0.86] tracking-[-0.04em]`}>
          WINTER
          <br />
          ARC
        </h1>
        <Knight />
        <span aria-hidden className="grain pointer-events-none absolute inset-0 opacity-70" />
      </section>

      <main className="mx-auto max-w-3xl px-5 pb-20 sm:px-0">
        <section className="mt-10 text-center">
          <p className={`${poster} text-3xl tracking-[0.08em] sm:text-4xl`}>{season.totalDays} DAYS. BECOME BETTER.</p>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/65">
            While everyone else waits for January, you start now. Choose a few habits, show up every day from October to the end of January, and finish the year stronger than you started it.
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-white/50">
            {season.live ? `Day ${season.day} of ${season.totalDays} — it has begun` : `Starts in ${season.startsIn} days`}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <Link href={primary.href} className="relative w-full max-w-sm overflow-hidden rounded-xl bg-white py-4 text-sm font-bold uppercase tracking-[0.16em] text-black">
              <span aria-hidden className="shine absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-black/15 to-transparent" />
              <span className="relative">{primary.label}</span>
            </Link>
            {!user && (
              <Link href="/login?join=arc" className="text-sm font-semibold text-white/70 underline-offset-4 hover:text-white hover:underline">
                I already have an account
              </Link>
            )}
          </div>
        </section>

        <section aria-label="How it works" className="mt-16 grid gap-3 sm:grid-cols-3">
          {steps.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-white/12 p-5">
                <div className={`${poster} text-4xl text-white/80`}>{step.n}</div>
                <h2 className="mt-3 text-[15px] font-bold">{step.title}</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </section>

        <Reveal>
          <section className="mt-3 rounded-2xl border border-white/12 p-5 text-[13px] leading-relaxed text-white/65">
            <h2 className="mb-2 text-[15px] font-bold text-white">The rules</h2>
            <ul className="space-y-1.5">
              <li>
                • {ARC_POINTS_PER_HABIT} points for each habit you tick, up to {ARC_HABITS_PER_DAY} habits a day.
              </li>
              <li>• Only ticks made on the day count — you can&apos;t fill in last week.</li>
              <li>• Joining puts your first name, last initial, username and photo on the leaderboard. You can leave at any time.</li>
              <li>• Reminders and a daily line of motivation, if you turn notifications on.</li>
            </ul>
          </section>
        </Reveal>

        <p className="mt-10 text-center text-xs text-white/40">
          <Link href="/" className="hover:text-white/70">
            HabitFlow
          </Link>{" "}
          ·{" "}
          <Link href="/privacy" className="hover:text-white/70">
            Privacy
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="hover:text-white/70">
            Terms
          </Link>
        </p>
      </main>
    </div>
  );
}
