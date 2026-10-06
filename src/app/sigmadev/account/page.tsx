import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ProfileForms } from "@/components/ProfileForms";
import { adminMetadata, requireAdmin } from "@/lib/auth";
import { formatTimestamp } from "@/lib/dates";

export const generateMetadata = (): Promise<Metadata> => adminMetadata({ title: "My Account" });

export default async function AdminAccountPage() {
  const admin = await requireAdmin();
  return (
    <>
      {/* a computer keeps the title bar; a phone shows only the back button (see MobileBars) */}
      <div className="hidden md:block">
        <PageHeader title="My Account" />
      </div>
      <h1 className="sr-only md:hidden">My Account</h1>
      <ProfileForms
        stats={{ habits: 0, checkins: 0 }}
        user={{
          id: admin.id,
          fullName: admin.full_name,
          username: admin.username,
          email: admin.email,
          color: admin.avatar_color,
          timezone: admin.timezone,
          memberSince: formatTimestamp(admin.created_at, admin.timezone),
          google: Boolean(admin.google_id),
          photo: admin.avatar_version,
          emailLang: admin.email_lang ?? "",
          reminders: admin.email_reminders !== 0,
          pushKey: null,
          admin: true,
        }}
      />
    </>
  );
}
