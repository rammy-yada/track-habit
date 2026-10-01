import type { Metadata } from "next";
import { AdminOverview } from "@/components/sigmadev/AdminOverview";
import { getAdminOverview } from "@/lib/admin-data";
import { adminMetadata, requireAdmin } from "@/lib/auth";
import { formatTimestamp } from "@/lib/dates";
import { StorageCard } from "@/components/sigmadev/StorageCard";
import { queryOne } from "@/lib/db";
import { formatBytes, getStorage, storageBreakdown } from "@/lib/storage";

export const generateMetadata = (): Promise<Metadata> => adminMetadata({ title: "Overview" });

export default async function AdminHome() {
  const admin = await requireAdmin();
  const [data, storage, tables, photo] = await Promise.all([getAdminOverview(), getStorage(), storageBreakdown(), queryOne<{ avg: number | string | null }>("SELECT AVG(octet_length(image)) AS avg FROM avatars")]);
  return (
    <>
      <AdminOverview
        data={data}
        joined={Object.fromEntries(data.recent.map((u) => [u.id, formatTimestamp(u.created_at, admin.timezone)]))}
        status={{ build: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev", database: "Connected" }}
      />
      <div className="px-4 pb-8 md:px-8">
        <StorageCard used={formatBytes(storage.usedBytes)} limitGb={storage.limitGb} share={storage.share} state={storage.state} tables={tables.map((t) => ({ name: t.name, size: formatBytes(t.bytes), rows: t.rows }))} photo={photo?.avg ? formatBytes(Number(photo.avg)) : null} />
      </div>
    </>
  );
}
