"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { logoutAction } from "@/lib/actions/auth";
import { clearOfflineData } from "@/lib/offline";
import { openGuide } from "@/lib/pwa";
import { initial } from "@/lib/text";

type NavUser = { name: string; role: "user" | "admin"; color: string };

const ICONS: Record<string, React.ReactNode> = {
  dashboard: <path d="M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6v-9h-6v9zm0-16v5h6V4h-6z" />,
  analytics: <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />,
  monthly: <path d="M4 6h16v14H4zM4 10h16M9 3v4m6-4v4" />,
  profile: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0" />,
  arc: <path d="M12 2v20M3.3 7l17.4 10M20.7 7L3.3 17M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5" />,
  donate: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  admin: <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z" />,
};

function links(role: NavUser["role"]) {
  return [
    { href: "/dashboard", label: "Dashboard", short: "Today", icon: "dashboard" },
    { href: "/analytics", label: "Analytics", short: "Stats", icon: "analytics" },
    { href: "/arc", label: "Winter Arc", short: "Arc", icon: "arc" },
    { href: "/monthly", label: "Monthly View", short: "Month", icon: "monthly" },
    { href: "/profile", label: "Profile", short: "Profile", icon: "profile" },
    role === "admin"
      ? { href: "/admin", label: "Management", short: "Admin", icon: "admin" }
      : { href: "/support", label: "Support Us", short: "Support", icon: "donate" },
  ];
}

function Icon({ name }: { name: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      {ICONS[name]}
    </svg>
  );
}

export function Sidebar({ user }: { user: NavUser }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-card md:flex">
      <div className="flex items-center justify-between border-b border-line px-5 py-5">
        <Logo href="/dashboard" />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main">
        {links(user.role).map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${active ? "text-brand" : "text-muted hover:text-ink"}`}
            >
              {/* one shared pill that glides between items instead of each item toggling its own background */}
              {active && <motion.span layoutId="sidebar-pill" className="absolute inset-0 rounded-xl bg-brand-soft" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span className="relative flex items-center gap-3">
                <Icon name={link.icon} />
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="space-y-3 border-t border-line p-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-raised px-3 py-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white" style={{ background: user.color }}>
            {initial(user.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold">{user.name}</span>
            <span className="block text-[11px] capitalize text-muted">{user.role}</span>
          </span>
          <ThemeToggle className="h-8 w-8 rounded-lg" />
        </div>
        <button type="button" onClick={openGuide} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-raised hover:text-ink">
          <GuideIcon />
          Guide
        </button>
        <LogoutButton className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-bad-soft hover:text-bad" />
      </div>
    </aside>
  );
}

function GuideIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.2a2.6 2.6 0 1 1 3.7 2.4c-.8.4-1.2 1-1.2 1.9M12 17h.01" />
    </svg>
  );
}

function LogoutButton({ className, compact = false }: { className: string; compact?: boolean }) {
  return (
    <form action={logoutAction} onSubmit={() => navigator.onLine && clearOfflineData()}>
      <button type="submit" className={className} aria-label="Log out">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14l5-5-5-5m5 5H9" />
        </svg>
        {!compact && "Log out"}
      </button>
    </form>
  );
}

/** Phones get a top bar and a bottom tab bar instead of the sidebar. */
export function MobileBars({ user }: { user: NavUser }) {
  const pathname = usePathname();
  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-card/85 px-4 py-3 backdrop-blur md:hidden">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2">
          <button type="button" onClick={openGuide} aria-label="Open the welcome guide" className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-card text-muted hover:border-brand hover:text-brand">
            <GuideIcon />
          </button>
          <ThemeToggle />
          <LogoutButton compact className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-card text-muted hover:border-bad hover:text-bad" />
        </div>
      </header>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-line bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {links(user.role).map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-w-0 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold ${active ? "text-brand" : "text-muted"}`}
            >
              {active && <motion.span layoutId="tab-pill" className="absolute top-0 h-0.5 w-9 rounded-full bg-brand" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <Icon name={link.icon} />
              {link.short}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
