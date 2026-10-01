import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ProfileForms } from "@/components/ProfileForms";
import { requireAdmin } from "@/lib/auth";
import { formatTimestamp } from "@/lib/dates";

export const metadata: Metadata = { title: "My Account" };

export default async function AdminAccountPage() {
  const admin = await requireAdmin();
  return (
    <>
      <PageHeader title="My Account" />
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
          admin: true,
        }}
      />
    </>
  );
}
