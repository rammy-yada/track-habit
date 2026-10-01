import type { Metadata } from "next";
import { AdminInbox } from "@/components/sigmadev/AdminInbox";
import { adminMetadata, requireAdmin } from "@/lib/auth";
import { formatTimestamp } from "@/lib/dates";
import { query } from "@/lib/db";

export const generateMetadata = (): Promise<Metadata> => adminMetadata({ title: "Inbox" });

export type InquiryRow = { id: number; kind: "collab" | "brand"; name: string; email: string; company: string; website: string; topic: string; budget: string; message: string; status: "new" | "read"; created_at: string };

export default async function AdminInboxPage() {
  const admin = await requireAdmin();
  const rows = await query<InquiryRow>("SELECT id, kind, name, email, company, website, topic, budget, message, status, created_at FROM inquiries ORDER BY created_at DESC, id DESC LIMIT 300");
  return <AdminInbox inquiries={rows.map((r) => ({ ...r, sent: formatTimestamp(r.created_at, admin.timezone, true) }))} />;
}
