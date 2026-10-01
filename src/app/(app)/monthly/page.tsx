import type { Metadata } from "next";
import { MonthlyGrid } from "@/components/MonthlyGrid";
import { requireUser } from "@/lib/auth";
import { getMonthly } from "@/lib/data";

export const metadata: Metadata = { title: "Monthly View" };

export default async function MonthlyPage({ searchParams }: { searchParams: Promise<{ y?: string; m?: string }> }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  return <MonthlyGrid data={await getMonthly(user, params.y, params.m)} />;
}
