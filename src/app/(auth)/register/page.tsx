import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { googleEnabled } from "@/lib/google";

export const metadata: Metadata = { title: "Create a Free Account", description: "Create a free HabitFlow account in a minute. Track daily habits, build streaks and join the Winter Arc.", alternates: { canonical: "/register" } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ join?: string }> }) {
  return <RegisterForm google={googleEnabled()} join={(await searchParams).join === "arc"} />;
}
