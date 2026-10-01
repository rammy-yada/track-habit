import type { Metadata } from "next";
import { MobileBars, Sidebar } from "@/components/AppNav";
import { ArcTheme } from "@/components/ArcTheme";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Admin", template: "%s — HabitFlow Admin" } };

// The admin area. requireAdmin() runs on the server for every page under
// /admin, before anything is rendered: a member is sent to their dashboard,
// a signed-out visitor to the login page.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const navUser = { id: admin.id, name: admin.full_name, role: admin.role, color: admin.avatar_color, version: admin.avatar_version };
  return (
    <div className="flex min-h-dvh">
      <Sidebar user={navUser} />
      <div className="min-w-0 flex-1 pb-24 md:pb-0">
        <MobileBars user={navUser} />
        {children}
      </div>
      <ArcTheme member={false} />
    </div>
  );
}
