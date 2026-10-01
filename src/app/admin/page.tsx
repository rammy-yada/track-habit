import type { Metadata } from "next";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { getAdminOverview } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { formatTimestamp } from "@/lib/dates";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminHome() {
  const admin = await requireAdmin();
  const data = await getAdminOverview();
  return (
    <AdminOverview
      data={data}
      joined={Object.fromEntries(data.recent.map((u) => [u.id, formatTimestamp(u.created_at, admin.timezone)]))}
      status={{ build: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev", database: "Connected" }}
    />
  );
}
