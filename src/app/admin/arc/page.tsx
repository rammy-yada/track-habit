import type { Metadata } from "next";
import { AdminArc } from "@/components/admin/AdminArc";
import { getAdminArc } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { formatTimestamp } from "@/lib/dates";
import { getIntroImages } from "@/lib/intro";

export const metadata: Metadata = { title: "Winter Arc" };

export default async function AdminArcPage() {
  const admin = await requireAdmin();
  const [data, images] = await Promise.all([getAdminArc(), getIntroImages()]);
  return <AdminArc data={data} images={images} adminName={admin.full_name.split(" ")[0]} joined={Object.fromEntries(data.members.map((m) => [m.id, formatTimestamp(m.joined_at, admin.timezone)]))} />;
}
