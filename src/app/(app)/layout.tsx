import type { Metadata } from "next";
import { Suspense } from "react";
import { MobileBars, Sidebar } from "@/components/AppNav";
import { AppStatus } from "@/components/AppStatus";
import { ArcTheme } from "@/components/ArcTheme";
import { WelcomeGuide } from "@/components/guide/WelcomeGuide";
import { redirect } from "next/navigation";
import { arcSeason, isArcMember } from "@/lib/arc";
import { currentUser } from "@/lib/auth";
import { todayIn } from "@/lib/dates";
import { headIcons, iconFor } from "@/lib/manifest";
import { IconCookie } from "@/components/IconCookie";
import { pushPublicKey } from "@/lib/push";
import { NotifyPrompt } from "@/components/NotifyPrompt";
import { SaveCredential } from "@/components/SaveCredential";
import { cache } from "react";
import { requireUser } from "@/lib/auth";

// asked for by both the layout and its metadata: one query per request
const arcMember = cache(isArcMember);

// Private screens: nothing for a search engine. The app icon follows the
// account — the Winter Arc one for people in the arc, unless they chose otherwise.
export async function generateMetadata(): Promise<Metadata> {
  const user = await currentUser();
  const icon = user ? iconFor(user.app_icon, await arcMember(user)) : "classic";
  return { robots: { index: false, follow: false }, icons: headIcons(icon) };
}

// Everything under (app) requires a signed-in user. The check runs on the
// server before any of the page is rendered or sent.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // An admin account manages the site; it has its own area and no habit screens.
  if (user.role === "admin") redirect("/sigmadev");
  const navUser = { id: user.id, name: user.full_name, role: user.role, color: user.avatar_color, version: user.avatar_version };
  const member = await arcMember(user);
  const arc = { live: arcSeason(todayIn(user.timezone)).live, member };
  return (
    <div className="flex min-h-dvh">
      <Sidebar user={navUser} arc={arc} />
      <div className="min-w-0 flex-1 pb-20 md:pb-0">
        <MobileBars user={navUser} arc={arc} />
        {children}
      </div>
      <AppStatus userId={user.id} />
      <ArcTheme member={member} />
      <NotifyPrompt publicKey={pushPublicKey()} />
      <IconCookie icon={iconFor(user.app_icon, member)} />
      <SaveCredential name={user.full_name} username={user.username} />
      {/* Suspense: the guide reads the URL's query string */}
      <Suspense>
        <WelcomeGuide firstName={user.full_name.split(" ")[0]} timezone={user.timezone} />
      </Suspense>
    </div>
  );
}
