import type { Metadata } from "next";
import { AdminArc } from "@/components/admin/AdminArc";
import { getAdminArc } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { formatTimestamp } from "@/lib/dates";

export const metadata: Metadata = { title: "Winter Arc" };

export default async function AdminArcPage() {
  const admin = await requireAdmin();
  const data = await getAdminArc();
  return <AdminArc data={data} joined={Object.fromEntries(data.members.map((m) => [m.id, formatTimestamp(m.joined_at, admin.timezone)]))} />;
}
