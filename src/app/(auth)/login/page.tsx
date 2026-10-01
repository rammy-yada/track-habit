import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { googleEnabled } from "@/lib/google";

export const metadata: Metadata = { title: "Sign In" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <LoginForm google={googleEnabled()} notice={typeof error === "string" ? error : undefined} />;
}
