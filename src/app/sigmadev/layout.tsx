import type { Metadata } from "next";
import { MobileBars, Sidebar } from "@/components/AppNav";
import { ArcTheme } from "@/components/ArcTheme";
import { SaveCredential } from "@/components/SaveCredential";
import { adminMetadata, requireAdmin } from "@/lib/auth";

export const generateMetadata = (): Promise<Metadata> => adminMetadata({ title: { default: "Admin", template: "%s — HabitFlow Admin" }, robots: { index: false, follow: false } });

// The admin area. requireAdmin() runs on the server for every page under
// this folder, before anything is rendered: anyone who isn't an administrator
// (signed in or not) gets "page not found". The folder's name is deliberately
// not "admin", and it is left out of robots.txt and the sitemap, so the
// address isn't advertised — but the check above is what protects it.
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
      <SaveCredential name={admin.full_name} username={admin.username} />
    </div>
  );
}
