import type { Metadata } from "next";
import { ForgotForm } from "@/components/auth/ForgotForm";

export const metadata: Metadata = { title: "Forgot Password", robots: { index: false } };

export default function ForgotPage() {
  return <ForgotForm />;
}
