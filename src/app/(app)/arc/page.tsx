import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ArcIntro } from "@/components/arc/ArcIntro";
import { ArcScreen } from "@/components/arc/ArcScreen";
import { WorkoutPicker } from "@/components/arc/WorkoutPicker";
import { getArc } from "@/lib/arc";
import { requireUser } from "@/lib/auth";
import { getIntroImages } from "@/lib/intro";
import { query } from "@/lib/db";
import { decodeEntities } from "@/lib/text";

export const metadata: Metadata = { title: "Winter Arc" };

export default async function ArcPage() {
  const user = await requireUser();
  const [arc, habits, images] = await Promise.all([getArc(user), query<{ name: string }>("SELECT name FROM habits WHERE user_id = ? AND is_active = 1", [user.id]), getIntroImages()]);
  return (
    <>
      {arc.me && <ArcIntro firstName={user.full_name.split(" ")[0]} images={images} totalDays={arc.season.totalDays} />}
      <PageHeader title="Winter Arc">
        <span className="text-[13px] font-medium text-muted">{arc.season.live ? `Day ${arc.season.day} of ${arc.season.totalDays}` : `Starts in ${arc.season.startsIn} days`}</span>
      </PageHeader>
      <div className="grid grid-cols-1 items-start gap-8 px-4 py-6 md:px-8 md:py-7 xl:grid-cols-[392px_minmax(0,1fr)]">
        <div className="min-w-0 xl:sticky xl:top-24">
          <ArcScreen arc={arc} />
        </div>
        <div className="min-w-0">
          <WorkoutPicker existing={habits.map((h) => decodeEntities(h.name))} />
        </div>
      </div>
    </>
  );
}
