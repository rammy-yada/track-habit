import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { googleEnabled } from "@/lib/google";

export const metadata: Metadata = { title: "Create Account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ join?: string }> }) {
  return <RegisterForm google={googleEnabled()} join={(await searchParams).join === "arc"} />;
}
