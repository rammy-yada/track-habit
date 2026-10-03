import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ProfileForms } from "@/components/ProfileForms";
import { BadgeShelf } from "@/components/BadgeShelf";
import { isArcMember } from "@/lib/arc";
import { arcNumbers, badgesFor } from "@/lib/badges";
import { todayIn } from "@/lib/dates";
import { countries } from "@/lib/people";
import { requireUser } from "@/lib/auth";
import { getProfileStats } from "@/lib/data";
import { formatTimestamp } from "@/lib/dates";
import { pushPublicKey } from "@/lib/push";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [stats, arcMember] = await Promise.all([getProfileStats(user.id), isArcMember(user)]);
  // Winter Arc badges: shown to members of the arc, once an admin has made some
  const badges = arcMember ? await badgesFor(user.id, await arcNumbers(user.id, todayIn(user.timezone))) : [];
  return (
    <>
      <PageHeader title="Profile" />
      {/* Only the fields the form needs cross to the browser — never the password hash. */}
      <ProfileForms
        stats={stats}
        badges={badges.length > 0 ? <BadgeShelf badges={badges} /> : undefined}
        badgeCount={badges.filter((b) => b.earned).length}
        user={{
          id: user.id,
          fullName: user.full_name,
          username: user.username,
          email: user.email,
          color: user.avatar_color,
          timezone: user.timezone,
          memberSince: formatTimestamp(user.created_at, user.timezone),
          google: Boolean(user.google_id),
          photo: user.avatar_version,
          emailLang: user.email_lang ?? "",
          reminders: user.email_reminders !== 0,
          pushKey: pushPublicKey(),
          prefs: { motivation: user.notify_motivation, comeback: user.notify_comeback === 1, appIcon: user.app_icon },
          arcMember,
          details: { gender: user.gender ?? "", birthDate: user.birth_date ?? "", country: user.country ?? "", showAge: user.show_age === 1, showGender: user.show_gender === 1, showCountry: user.show_country === 1, countries: countries() },
          admin: false,
        }}
      />
    </>
  );
}
