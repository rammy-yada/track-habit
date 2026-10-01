import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArcStart } from "@/components/arc/ArcStart";
import { arcSeason, isArcMember } from "@/lib/arc";
import { requireUser } from "@/lib/auth";
import { todayIn } from "@/lib/dates";
import { query } from "@/lib/db";
import { getIntroImages } from "@/lib/intro";
import { pushPublicKey } from "@/lib/push";
import { decodeEntities } from "@/lib/text";

export const metadata: Metadata = { title: "Join the Winter Arc" };

export default async function ArcStartPage() {
  const user = await requireUser();
  if (await isArcMember(user)) redirect("/arc"); // already in
  const [habits, images] = await Promise.all([query<{ name: string }>("SELECT name FROM habits WHERE user_id = ? AND is_active = 1 ORDER BY id", [user.id]), getIntroImages()]);
  const season = arcSeason(todayIn(user.timezone));
  return (
    <ArcStart
      firstName={user.full_name.split(" ")[0]}
      season={{ range: season.range, totalDays: season.totalDays, day: season.day, live: season.live, startsIn: season.startsIn }}
      existing={habits.map((h) => decodeEntities(h.name))}
      images={images}
      pushKey={pushPublicKey()}
    />
  );
}
