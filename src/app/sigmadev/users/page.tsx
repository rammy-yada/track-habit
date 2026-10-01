import type { Metadata } from "next";
import { AdminUsers } from "@/components/sigmadev/AdminUsers";
import { getAdminUsers } from "@/lib/admin-data";
import { adminMetadata, requireAdmin } from "@/lib/auth";
import { formatTimestamp } from "@/lib/dates";
import { clean } from "@/lib/text";

export const generateMetadata = (): Promise<Metadata> => adminMetadata({ title: "Users" });

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const [admin, params] = await Promise.all([requireAdmin(), searchParams]);
  const search = clean(params.search, 100);
  const users = await getAdminUsers(search);
  // Dates are formatted here, on the server, so server and browser can't disagree.
  const dates = Object.fromEntries(users.map((u) => [u.id, { joined: formatTimestamp(u.created_at, admin.timezone), seen: u.last_login ? formatTimestamp(u.last_login, admin.timezone) : "Never" }]));
  return <AdminUsers users={users} selfId={admin.id} search={search} dates={dates} />;
}
