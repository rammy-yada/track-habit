"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { PasswordField } from "@/components/ui/PasswordField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { input, label } from "@/components/ui/styles";
import { requestPasswordReset, resetPasswordAction } from "@/lib/actions/auth";
import { AuthCard } from "./AuthCard";

const back = (
  <>
    Remembered it?{" "}
    <Link href="/login" className="font-semibold text-brand hover:underline">
      Back to sign in
    </Link>
  </>
);

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  return (
    <AuthCard title="Forgot password" subtitle="Enter your email and we'll send you a link to choose a new one." footer={back}>
      <Alert kind={state?.error ? "error" : "success"} shakeKey={state}>
        {state?.error ?? state?.message}
      </Alert>
      <form action={action} className="space-y-4">
        <label className="block">
          <span className={label}>Email</span>
          <input type="email" name="email" className={input} placeholder="you@example.com" autoComplete="email" required autoFocus />
        </label>
        <SubmitButton pending={pending} pendingLabel="Sending…">
          Send reset link
        </SubmitButton>
        <p className="text-center text-xs leading-relaxed text-muted">The email can take a minute or two. If it isn&apos;t in your inbox, look in your Spam or Junk folder — and mark it “Not spam” so the next one arrives.</p>
      </form>
    </AuthCard>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, null);
  return (
    <AuthCard title="New password" subtitle="Choose a password you don't use anywhere else." footer={back}>
      <Alert kind="error" shakeKey={state}>
        {state?.error}
      </Alert>
      <form action={action} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <PasswordField name="password" label="New password" placeholder="At least 8 characters" minLength={8} autoComplete="new-password" />
        <PasswordField name="confirm_password" label="Confirm new password" placeholder="Repeat it" autoComplete="new-password" />
        <SubmitButton pending={pending} pendingLabel="Saving…">
          Save new password
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
