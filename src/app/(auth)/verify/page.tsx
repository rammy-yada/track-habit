import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VerifyForm } from "@/components/auth/VerifyForm";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Verify Your Email", robots: { index: false } };

export default async function VerifyPage() {
  const session = await getSession();
  // Only reachable mid-registration; otherwise there is nothing to verify.
  if (!session.pendingReg) redirect("/register");
  return <VerifyForm email={session.pendingReg.email} devCode={session.devOtp ?? null} />;
}
