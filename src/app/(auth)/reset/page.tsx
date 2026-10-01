import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResetForm } from "@/components/auth/ForgotForm";

export const metadata: Metadata = { title: "New Password", referrer: "no-referrer" }; // keep the token out of Referer headers

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (typeof token !== "string" || token.length < 20) redirect("/forgot");
  return <ResetForm token={token} />;
}
