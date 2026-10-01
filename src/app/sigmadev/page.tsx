import type { Metadata } from "next";
import { AdminOverview } from "@/components/sigmadev/AdminOverview";
import { getAdminOverview } from "@/lib/admin-data";
import { adminMetadata, requireAdmin } from "@/lib/auth";
import { formatTimestamp } from "@/lib/dates";

export const generateMetadata = (): Promise<Metadata> => adminMetadata({ title: "Overview" });

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
