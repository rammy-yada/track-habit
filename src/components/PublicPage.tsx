import Link from "next/link";
import { Logo } from "@/components/Logo";
import { btnPrimary } from "@/components/ui/styles";
import { SiteFooter } from "@/components/SiteFooter";
import { currentUser } from "@/lib/auth";

const LINKS = [
  { href: "/blog", label: "Blog" },
  { href: "/winter-arc", label: "Winter Arc" },
];

/** The frame around the public pages that aren't the home page: blog, collaborate, brand deals. */
export async function PublicPage({ children, width = "max-w-3xl" }: { children: React.ReactNode; width?: string }) {
  const user = await currentUser().catch(() => null); // a database hiccup just shows the visitor's header
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
          {/* someone signed in is reading inside the app: the way out leads back to it, with no sign-up button */}
          {user ? (
            <Link href={user.role === "admin" ? "/sigmadev" : "/dashboard"} className={btnPrimary} data-back-to-app>
              Back to app
            </Link>
          ) : (
            <Link href="/register" className={btnPrimary}>
              Get Started
            </Link>
          )}
        </nav>
      </header>
      <main className={`mx-auto w-full flex-1 px-5 py-10 sm:py-14 ${width}`}>{children}</main>
      <SiteFooter />
    </div>
  );
}
