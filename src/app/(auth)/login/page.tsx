import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { googleEnabled } from "@/lib/google";

export const metadata: Metadata = { title: "Sign In", description: "Sign in to HabitFlow to tick off today's habits and see your streaks.", alternates: { canonical: "/login" } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string; join?: string }> }) {
  const { error, notice, join } = await searchParams;
  return <LoginForm google={googleEnabled()} join={join === "arc"} notice={typeof error === "string" ? error : undefined} success={typeof notice === "string" ? notice : undefined} />;
}
