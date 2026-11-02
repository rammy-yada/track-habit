import Link from "next/link";
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
    <footer className="h-card border-t border-line px-5 py-8 text-sm text-muted sm:px-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <a href="/" className="p-name u-url block font-display text-base font-bold text-ink">
            {APP_NAME}
          </a>
          <p className="mt-1 text-xs">
            Small steps, better flow. Made by{" "}
            <a href={CREATOR.supportUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
              {CREATOR.handle}
            </a>
            .
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] font-medium">
          {[...LINKS, { href: "/privacy", label: "Privacy" }, { href: "/terms", label: "Terms" }].map((link) => (
            <Link key={link.href} href={link.href} className="-mx-1 px-1 py-1.5 hover:text-ink hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
