import type { Metadata } from "next";
import { AdminConsole } from "@/components/AdminConsole";
import { requireAdmin } from "@/lib/auth";
import { MOTTOS } from "@/lib/constants";
import { getAdminOverview } from "@/lib/data";
import { formatTimestamp } from "@/lib/dates";
import { clean } from "@/lib/text";

export const metadata: Metadata = { title: "Admin Panel" };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const [admin, params] = await Promise.all([requireAdmin(), searchParams]);
  const search = clean(params.search, 100);
  const data = await getAdminOverview(search);
  // Dates are formatted here, on the server, so server and browser can't disagree.
  return (
    <AdminConsole
      data={data}
      selfId={admin.id}
      search={search}
      motto={MOTTOS[new Date().getDate() % MOTTOS.length]}
      joined={Object.fromEntries(data.users.map((u) => [u.id, formatTimestamp(u.created_at)]))}
    />
  );
}
