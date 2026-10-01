"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { PasswordField } from "@/components/ui/PasswordField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { input, label } from "@/components/ui/styles";
import { loginAction } from "@/lib/actions/auth";
import { LegalNote } from "@/components/LegalPage";
import { AuthCard } from "./AuthCard";
import { GoogleButton } from "./GoogleButton";

// Reasons /auth/google can send someone back here. Only these fixed messages
// are shown — nothing from the URL is rendered as text.
const NOTICES: Record<string, string> = {
  google_cancelled: "Google sign-in was cancelled.",
  google_failed: "Google sign-in didn't complete. Please try again.",
  google_unverified: "Your Google account's email address isn't verified, so it can't be used to sign in.",
  google_off: "Google sign-in isn't available right now.",
  email_exists: "That email already has an account with a password. Sign in with your password below.",
  disabled: "This account has been disabled.",
};

export function LoginForm({ google, notice }: { google: boolean; notice?: string }) {
  const [state, action, pending] = useActionState(loginAction, null);
  const message = state?.error ?? (notice ? NOTICES[notice] : undefined);
  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back. Enter your details to continue."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-brand hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <Alert kind="error" shakeKey={state ?? notice}>
        {message}
      </Alert>
      {google && <GoogleButton label="Continue with Google" />}
      <form action={action} className="space-y-4">
        <label className="block">
          <span className={label}>Email or username</span>
          <input name="identifier" className={input} placeholder="you@example.com" autoComplete="username" defaultValue={state?.fields?.identifier} required autoFocus />
        </label>
        <PasswordField name="password" label="Password" placeholder="Your password" autoComplete="current-password" />
        <SubmitButton pending={pending} pendingLabel="Signing in…">
          Sign In
        </SubmitButton>
      </form>
      <LegalNote />
    </AuthCard>
  );
}
