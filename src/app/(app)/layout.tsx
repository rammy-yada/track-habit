import { Suspense } from "react";
import { MobileBars, Sidebar } from "@/components/AppNav";
import { AppStatus } from "@/components/AppStatus";
import { WelcomeGuide } from "@/components/guide/WelcomeGuide";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

// Everything under (app) requires a signed-in user. The check runs on the
// server before any of the page is rendered or sent.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // An admin account manages the site; it has its own area and no habit screens.
  if (user.role === "admin") redirect("/admin");
  const navUser = { id: user.id, name: user.full_name, role: user.role, color: user.avatar_color, version: user.avatar_version };
  return (
    <div className="flex min-h-dvh">
      <Sidebar user={navUser} />
      <div className="min-w-0 flex-1 pb-20 md:pb-0">
        <MobileBars user={navUser} />
        {children}
      </div>
      <AppStatus userId={user.id} />
      {/* Suspense: the guide reads the URL's query string */}
      <Suspense>
        <WelcomeGuide firstName={user.full_name.split(" ")[0]} timezone={user.timezone} />
      </Suspense>
    </div>
  );
}
