import { Suspense } from "react";
import { MobileBars, Sidebar } from "@/components/AppNav";
import { WelcomeGuide } from "@/components/guide/WelcomeGuide";
import { requireUser } from "@/lib/auth";

// Everything under (app) requires a signed-in user. The check runs on the
// server before any of the page is rendered or sent.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const navUser = { name: user.full_name, role: user.role, color: user.avatar_color };
  return (
    <div className="flex min-h-dvh">
      <Sidebar user={navUser} />
      <div className="min-w-0 flex-1 pb-20 md:pb-0">
        <MobileBars user={navUser} />
        {children}
      </div>
      {/* Suspense: the guide reads the URL's query string */}
      <Suspense>
        <WelcomeGuide firstName={user.full_name.split(" ")[0]} role={user.role} timezone={user.timezone} />
      </Suspense>
    </div>
  );
}
