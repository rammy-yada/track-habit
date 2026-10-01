import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { SupportPanel } from "@/components/SupportPanel";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Support Us" };

export default async function SupportPage() {
  await requireUser();
  return (
    <>
      <PageHeader title="Support Us" />
      <SupportPanel />
    </>
  );
}
