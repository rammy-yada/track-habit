"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { UserAvatar, type AvatarInfo } from "./ui/UserAvatar";
import { logoutAction } from "@/lib/actions/auth";
import { clearOfflineData } from "@/lib/offline";
import { openGuide } from "@/lib/pwa";

type NavUser = AvatarInfo & { role: "user" | "admin" };
type NavLink = { href: string; label: string; short: string; icon: string; desktopOnly?: boolean };

const ICONS: Record<string, React.ReactNode> = {
  dashboard: <path d="M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6v-9h-6v9zm0-16v5h6V4h-6z" />,
  analytics: <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />,
  monthly: <path d="M4 6h16v14H4zM4 10h16M9 3v4m6-4v4" />,
  profile: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0" />,
  arc: <path d="M12 2v20M3.3 7l17.4 10M20.7 7L3.3 17M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5" />,
  donate: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  users: <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 10a7 7 0 0 1 14 0m1-10a3.5 3.5 0 1 0-1.5-6.7M18 14.5a6 6 0 0 1 4 6.5" />,
  tags: <path d="M3 12V4h8l10 10-8 8L3 12zm4.5-4.5h.01" />,
};

// A member and an admin get entirely different menus: an admin account
// manages the site and has no habit screens of its own.
const MEMBER: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", short: "Today", icon: "dashboard" },
  { href: "/analytics", label: "Analytics", short: "Stats", icon: "analytics" },
  { href: "/arc", label: "Winter Arc", short: "Arc", icon: "arc" },
  { href: "/monthly", label: "Monthly View", short: "Month", icon: "monthly" },
  { href: "/profile", label: "Profile", short: "Profile", icon: "profile" },
  { href: "/support", label: "Support Us", short: "Support", icon: "donate", desktopOnly: true }, // on phones it lives in Profile
];
const ADMIN: NavLink[] = [
  { href: "/admin", label: "Overview", short: "Overview", icon: "dashboard" },
  { href: "/admin/users", label: "Users", short: "Users", icon: "users" },
  { href: "/admin/categories", label: "Categories", short: "Categories", icon: "tags" },
  { href: "/admin/arc", label: "Winter Arc", short: "Arc", icon: "arc" },
  { href: "/admin/account", label: "My Account", short: "Account", icon: "profile" },
];

const isActive = (pathname: string, href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

function Icon({ name }: { name: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      {ICONS[name]}
    </svg>
  );
}

function AdminBadge() {
  return <span className="rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-bg">Admin</span>;
}

export function Sidebar({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const admin = user.role === "admin";
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-card md:flex">
      <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-5">
        <Logo href={admin ? "/admin" : "/dashboard"} />
        {admin && <AdminBadge />}
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main">
        {(admin ? ADMIN : MEMBER).map((link) => {
          const active = isActive(pathname, link.href);
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
      <div className="space-y-1 border-t border-line p-3">
        <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-raised px-3 py-2.5">
          <UserAvatar user={user} size={32} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold">{user.name}</span>
            <span className="block text-[11px] capitalize text-muted">{admin ? "Administrator" : "Member"}</span>
          </span>
          <ThemeToggle className="h-8 w-8 rounded-lg" />
        </div>
        {!admin && (
          <button type="button" onClick={openGuide} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-raised hover:text-ink">
            <GuideIcon />
            Guide
          </button>
        )}
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
  const admin = user.role === "admin";
  const tabs = (admin ? ADMIN : MEMBER).filter((link) => !link.desktopOnly);
  const iconButton = "grid h-10 w-10 place-items-center rounded-xl border border-line bg-card text-muted";
  return (
    <>
      <header className="sticky top-0 z-30 flex h-[61px] items-center justify-between border-b border-line bg-card/85 px-4 backdrop-blur md:hidden">
        <span className="flex items-center gap-2">
          <Logo href={admin ? "/admin" : "/dashboard"} />
          {admin && <AdminBadge />}
        </span>
        <div className="flex items-center gap-2">
          {!admin && (
            <button type="button" onClick={openGuide} aria-label="Open the welcome guide" className={`${iconButton} hover:border-brand hover:text-brand`}>
              <GuideIcon />
            </button>
          )}
          <ThemeToggle className="h-10 w-10" />
          <LogoutButton compact className={`${iconButton} hover:border-bad hover:text-bad`} />
        </div>
      </header>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 text-[10.5px] font-semibold ${active ? "text-brand" : "text-muted"}`}
            >
              {active && <motion.span layoutId="tab-pill" className="absolute top-0 h-0.5 w-10 rounded-full bg-brand" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <motion.span animate={{ y: active ? -1 : 0, scale: active ? 1.12 : 1 }} transition={{ type: "spring", stiffness: 400, damping: 22 }}>
                <Icon name={link.icon} />
              </motion.span>
              <span className="max-w-full truncate px-0.5">{link.short}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
