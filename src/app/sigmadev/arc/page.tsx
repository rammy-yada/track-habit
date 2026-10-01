import type { Metadata } from "next";
import { AdminArc } from "@/components/sigmadev/AdminArc";
import { getAdminArc } from "@/lib/admin-data";
import { adminMetadata, requireAdmin } from "@/lib/auth";
import { formatTimestamp } from "@/lib/dates";
import { getPacks } from "@/lib/arc-packs";
import { getArcSettings } from "@/lib/arc-settings";
import { getBadges } from "@/lib/badges";
import { getIntroImages } from "@/lib/intro";

export const generateMetadata = (): Promise<Metadata> => adminMetadata({ title: "Winter Arc" });

export default async function AdminArcPage() {
  const admin = await requireAdmin();
  const [data, images, settings] = await Promise.all([getAdminArc(), getIntroImages(), getArcSettings()]);
  const [packs, badges] = await Promise.all([getPacks({ season: data.season.year }), getBadges()]);
  return <AdminArc data={data} images={images} intro={settings.intro} surprises={settings.customSurprises} packs={packs} badges={badges} adminName={admin.full_name.split(" ")[0]} joined={Object.fromEntries(data.members.map((m) => [m.id, formatTimestamp(m.joined_at, admin.timezone)]))} />;
}
