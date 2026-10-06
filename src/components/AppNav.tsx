"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { motion } from "motion/react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { UserAvatar, type AvatarInfo } from "./ui/UserAvatar";
import { logoutAction } from "@/lib/actions/auth";
import { clearOfflineData } from "@/lib/offline";

type NavUser = AvatarInfo & { role: "user" | "admin" };
/** Is the Winter Arc season running, and is this person in it? Decides how the Arc entry is dressed. */
type ArcState = { live: boolean; member: boolean };
// The menu's links are not fetched ahead of time (prefetch={false}): on a
// serverless host every prefetch can wake another copy of the app, each
// holding a database connection, and a menu of nine links would use up a
// small database's whole allowance just by being looked at.
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
  shield: <path d="M12 3l8 3v6c0 4.5-3.2 7.9-8 9-4.8-1.1-8-4.5-8-9V6l8-3zm-3 9l2 2 4-4" />,
  bell: <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6zm4 9a2 2 0 0 0 4 0" />,
  blog: <path d="M5 4h11l3 3v13H5zM9 9h6M9 13h6M9 17h4" />,
  inbox: <path d="M3 13l3-8h12l3 8v6H3zM3 13h5l1.5 3h5L16 13h5" />,
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
  { href: "/sigmadev", label: "Overview", short: "Overview", icon: "dashboard" },
  { href: "/sigmadev/users", label: "Users", short: "Users", icon: "users" },
  { href: "/sigmadev/admins", label: "Administrators", short: "Admins", icon: "shield", desktopOnly: true },
  { href: "/sigmadev/categories", label: "Categories", short: "Categories", icon: "tags" },
  { href: "/sigmadev/arc", label: "Winter Arc", short: "Arc", icon: "arc" },
  // on phones these two are reached from the Overview screen: five tabs is all a phone's bar holds
  { href: "/sigmadev/blog", label: "Blog", short: "Blog", icon: "blog", desktopOnly: true },
  { href: "/sigmadev/inbox", label: "Inbox", short: "Inbox", icon: "inbox", desktopOnly: true },
  { href: "/sigmadev/notifications", label: "Notifications", short: "Notify", icon: "bell", desktopOnly: true },
  { href: "/sigmadev/account", label: "My Account", short: "Account", icon: "profile" },
];

const isActive = (pathname: string, href: string) => (href === "/sigmadev" ? pathname === "/sigmadev" : pathname.startsWith(href));

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

export function Sidebar({ user, arc }: { user: NavUser; arc?: ArcState }) {
  const pathname = usePathname();
  const admin = user.role === "admin";
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-card md:flex">
      <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-5">
        <Logo href={admin ? "/sigmadev" : "/dashboard"} />
        {admin && <AdminBadge />}
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main">
        {(admin ? ADMIN : MEMBER).map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              aria-current={active ? "page" : undefined}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${active ? "text-brand" : link.icon === "arc" && !admin ? "text-ink" : "text-muted hover:text-ink"}`}
            >
              {/* the Winter Arc stands out from the rest of the menu: an outline that breathes */}
              {link.icon === "arc" && !admin && !active && <motion.span aria-hidden className="absolute inset-0 rounded-xl border border-brand/50" animate={{ opacity: [0.35, 1, 0.35] }} transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }} />}
              {/* one shared pill that glides between items instead of each item toggling its own background */}
              {active && <motion.span layoutId="sidebar-pill" className="absolute inset-0 rounded-xl bg-brand-soft" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span className="relative flex flex-1 items-center gap-3">
                <Icon name={link.icon} />
                {link.label}
                {link.icon === "arc" && !admin && arc?.live && <span className="ml-auto rounded-md bg-brand-solid px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-on-brand">{arc.member ? "Live" : "Join"}</span>}
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
        <LogoutButton className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-bad-soft hover:text-bad" />
      </div>
    </aside>
  );
}

/** "Log out", asked about first: one stray tap shouldn't sign anyone out. */
export function LogoutButton({ className, children }: { className: string; children?: React.ReactNode }) {
  const [asking, setAsking] = useState(false);
  const [, startTransition] = useTransition();
  return (
    <>
      <button type="button" className={className} onClick={() => setAsking(true)} data-logout>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14l5-5-5-5m5 5H9" />
        </svg>
        {children ?? "Log out"}
      </button>
      <ConfirmDialog
        open={asking}
        title="Log out?"
        body="You'll need your password (or Google) to sign in again. Anything ticked offline that hasn't synced yet stays on this device until you're back."
        confirmLabel="Log out"
        onConfirm={() =>
          startTransition(async () => {
            if (navigator.onLine) clearOfflineData();
            await logoutAction();
          })
        }
        onClose={() => setAsking(false)}
      />
    </>
  );
}

/** Phones get a top bar and a bottom tab bar instead of the sidebar. */
export function MobileBars({ user, arc }: { user: NavUser; arc?: ArcState }) {
  const pathname = usePathname();
  const admin = user.role === "admin";
  const tabs = (admin ? ADMIN : MEMBER).filter((link) => !link.desktopOnly);
  // Profile is a screen of its own on a phone, like an app's settings: no
  // title bar and no tab bar, just a way back.
  if (pathname === "/profile" || pathname === "/sigmadev/account")
    return (
      <div className="sticky top-0 z-30 flex items-center px-3 pb-1 pt-[calc(10px+env(safe-area-inset-top))] md:hidden">
        <Link href={admin ? "/sigmadev" : "/dashboard"} prefetch={false} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full border border-line bg-card text-ink shadow-sm" data-back>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
      </div>
    );
  return (
    <>
      <header className="sticky top-0 z-30 flex h-[61px] items-center justify-between border-b border-line bg-card/85 px-4 backdrop-blur md:hidden">
        <span className="flex items-center gap-2">
          <Logo href={admin ? "/sigmadev" : "/dashboard"} />
          {admin && <AdminBadge />}
        </span>
        {/* just the theme switch up here: logging out and the guide live in Profile, where a thumb doesn't hit them by accident */}
        <ThemeToggle className="h-10 w-10" />
      </header>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((link) => {
          const active = isActive(pathname, link.href);
          // The Winter Arc is the middle tab, and it is the one that stands
          // up out of the bar: a raised round button with a ring that pulses.
          if (link.icon === "arc" && !admin)
            return (
              <Link key={link.href} href={link.href} prefetch={false} aria-current={active ? "page" : undefined} aria-label={arc?.live ? "Winter Arc (live now)" : "Winter Arc"} className="relative flex min-h-[58px] min-w-0 flex-col items-center justify-end gap-1 pb-[7px] text-[10.5px] font-bold text-ink" data-arc-tab>
                <motion.span whileTap={{ scale: 0.9 }} className="absolute -top-[22px] grid h-14 w-14 place-items-center rounded-full bg-card shadow-[0_-3px_10px_-4px_rgb(0_0_0/0.35)]">
                  {/* a soft ring that breathes while the season is on; a plain one otherwise */}
                  <span aria-hidden className={`absolute inset-[3px] rounded-full border-2 border-brand ${arc?.live && !active ? "arc-breathe [animation:arc-breathe_2.8s_ease-in-out_infinite]" : active ? "opacity-100" : "opacity-30"}`} />
                  <span className={`grid h-[42px] w-[42px] place-items-center rounded-full transition-colors ${active ? "bg-brand-solid text-on-brand" : "bg-ink text-bg"}`}>
                    <span className="arc-turn grid place-items-center [animation:arc-turn_14s_linear_infinite]">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        {ICONS.arc}
                      </svg>
                    </span>
                  </span>
                </motion.span>
                <span className={`max-w-full truncate px-0.5 ${active ? "text-brand" : ""}`}>{link.short}</span>
              </Link>
            );
          return (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
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
