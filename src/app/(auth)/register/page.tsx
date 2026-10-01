import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { googleEnabled } from "@/lib/google";

export const metadata: Metadata = { title: "Create Account" };

export default function RegisterPage() {
  return <RegisterForm google={googleEnabled()} />;
}
