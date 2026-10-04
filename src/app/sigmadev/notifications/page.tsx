import type { Metadata } from "next";
import { AdminMessages } from "@/components/sigmadev/AdminMessages";
import { adminMetadata, requireAdmin } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { getMessages, iconVersions } from "@/lib/messages";
import { pushProblem } from "@/lib/push";
import { BUILT_IN } from "@/lib/quotes";

export const generateMetadata = (): Promise<Metadata> => adminMetadata({ title: "Notifications" });

export default async function AdminNotificationsPage() {
  await requireAdmin();
  const [messages, icons, devices] = await Promise.all([getMessages(), iconVersions(), queryOne<{ devices: number | string; people: number | string }>("SELECT COUNT(*) AS devices, COUNT(DISTINCT user_id) AS people FROM push_subscriptions")]);
  return <AdminMessages messages={messages} icons={icons} builtIn={BUILT_IN} problem={pushProblem()} devices={Number(devices?.devices ?? 0)} people={Number(devices?.people ?? 0)} />;
}
