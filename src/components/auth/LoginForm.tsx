"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { PasswordField } from "@/components/ui/PasswordField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { input, label } from "@/components/ui/styles";
import { loginAction } from "@/lib/actions/auth";
import { AuthCard } from "./AuthCard";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
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
      <Alert kind="error" shakeKey={state}>
        {state?.error}
      </Alert>
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
    </AuthCard>
  );
}
