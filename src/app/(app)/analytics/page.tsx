import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { AnalyticsView } from "@/components/AnalyticsView";
import { requireUser } from "@/lib/auth";
import { getAnalytics } from "@/lib/data";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const user = await requireUser();
  const data = await getAnalytics(user);
  return (
    <>
      <PageHeader title="Analytics">
        <span className="text-[13px] font-medium text-muted">Data up to {data.todayLabel}</span>
      </PageHeader>
      <AnalyticsView data={data} />
    </>
  );
}
