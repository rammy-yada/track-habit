import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ProfileForms } from "@/components/ProfileForms";
import { requireUser } from "@/lib/auth";
import { getProfileStats } from "@/lib/data";
import { formatTimestamp } from "@/lib/dates";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const stats = await getProfileStats(user.id);
  return (
    <>
      <PageHeader title="Profile" />
      {/* Only the fields the form needs cross to the browser — never the password hash. */}
      <ProfileForms
        stats={stats}
        user={{
          fullName: user.full_name,
          username: user.username,
          email: user.email,
          color: user.avatar_color,
          timezone: user.timezone,
          memberSince: formatTimestamp(user.created_at),
        }}
      />
    </>
  );
}
