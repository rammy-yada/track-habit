import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { SupportPanel } from "@/components/SupportPanel";

export const metadata: Metadata = { title: "Support Us" };

export default function SupportPage() {
  return (
    <>
      <PageHeader title="Support Us" />
      <SupportPanel />
    </>
  );
}
