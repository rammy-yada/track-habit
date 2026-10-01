import type { Metadata } from "next";
import { HabitBoard } from "@/components/dashboard/HabitBoard";
import { requireUser } from "@/lib/auth";
import { getDashboard } from "@/lib/data";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  return <HabitBoard data={await getDashboard(user)} />;
}
