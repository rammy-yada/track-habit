import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { btnPrimary } from "@/components/ui/styles";
import { APP_NAME, CREATOR } from "@/lib/constants";

const LINKS = [
  { href: "/blog", label: "Blog" },
  { href: "/winter-arc", label: "Winter Arc" },
  { href: "/collaborate", label: "Collaborate" },
  { href: "/brand-deals", label: "Brand deals" },
];

/** The links at the bottom of every public page. */
export function SiteFooter() {
  return (
    <footer className="border-t border-line px-5 py-8 text-sm text-muted sm:px-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-display text-base font-bold text-ink">{APP_NAME}</div>
          <p className="mt-1 text-xs">
            Small steps, better flow. Made by{" "}
            <a href={CREATOR.supportUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
              {CREATOR.handle}
            </a>
            .
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] font-medium">
          {[...LINKS, { href: "/privacy", label: "Privacy" }, { href: "/terms", label: "Terms" }].map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-ink hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

/** The frame around the public pages that aren't the home page: blog, collaborate, brand deals. */
export function PublicPage({ children, width = "max-w-3xl" }: { children: React.ReactNode; width?: string }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-10">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          {LINKS.slice(0, 2).map((link) => (
            <Link key={link.href} href={link.href} className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:text-ink sm:block">
              {link.label}
            </Link>
          ))}
          <ThemeToggle />
          <Link href="/register" className={btnPrimary}>
            Get Started
          </Link>
        </nav>
      </header>
      <main className={`mx-auto w-full flex-1 px-5 py-10 sm:py-14 ${width}`}>{children}</main>
      <SiteFooter />
    </div>
  );
}
