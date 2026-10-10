"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Alert } from "@/components/ui/Alert";
import { PasswordField } from "@/components/ui/PasswordField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { input, label } from "@/components/ui/styles";
import { registerAction } from "@/lib/actions/auth";
import { TimezoneOptions } from "@/components/TimezoneOptions";
import { rememberTyped } from "@/lib/credentials";
import { LegalNote } from "@/components/LegalPage";
import { AuthCard } from "./AuthCard";
import { GoogleButton } from "./GoogleButton";

function strength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^a-zA-Z0-9]/.test(password)) score++;
  return score;
}

const STRENGTH_LABEL = ["Too short", "Okay", "Good", "Strong", "Excellent"];
const STRENGTH_COLOR = ["var(--bad)", "var(--warn)", "var(--warn)", "var(--good)", "var(--good)"];

export function RegisterForm({ google, join = false }: { google: boolean; join?: boolean }) {
  const [state, action, pending] = useActionState(registerAction, null);
  const [password, setPassword] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const score = strength(password);

  // The form (and its password fields) resets after each submit; keep the meter in step.
  useEffect(() => setPassword(""), [state]);

  // Pre-select the device's own timezone, wherever in the world that is.
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected) setTimezone(detected);
  }, []);

  return (
    <AuthCard
      title={join ? "Join the Winter Arc" : "Create account"}
      subtitle={join ? "First, an account. Then you'll choose your habits." : "Start tracking your habits today."}
      footer={
        <>
          Already have an account?{" "}
          <Link href={join ? "/login?join=arc" : "/login"} className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <Alert kind="error" shakeKey={state}>
        {state?.error}
      </Alert>
      {google && <GoogleButton label="Sign up with Google" join={join} />}
      <form
        action={action}
        className="space-y-4"
        onSubmit={(e) => {
          const data = new FormData(e.currentTarget);
          rememberTyped(String(data.get("username") ?? ""), String(data.get("password") ?? "")); // offered to the password manager once the account exists
        }}
      >
        {join && <input type="hidden" name="join" value="arc" />}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Full name</span>
            <input name="full_name" className={input} placeholder="John Doe" defaultValue={state?.fields?.full_name} required minLength={2} maxLength={100} autoFocus />
          </label>
          <label className="block">
            <span className={label}>Username</span>
            <input name="username" className={input} placeholder="john_doe" defaultValue={state?.fields?.username} required pattern="[a-zA-Z0-9_]{3,20}" title="3-20 characters: letters, numbers, underscore" />
          </label>
        </div>
        <label className="block">
          <span className={label}>Email</span>
          <input type="email" name="email" className={input} placeholder="you@example.com" defaultValue={state?.fields?.email} required maxLength={100} />
        </label>
        <div>
          <PasswordField name="password" label="Password" placeholder="At least 8 characters" minLength={8} autoComplete="new-password" onChange={setPassword} />
          <div className="mt-2 flex items-center gap-2.5" aria-live="polite">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-raised">
              <motion.div className="h-full rounded-full" animate={{ width: password ? `${Math.max(12, score * 25)}%` : "0%", backgroundColor: STRENGTH_COLOR[score] }} transition={{ type: "spring", stiffness: 200, damping: 24 }} />
            </div>
            <span className="w-16 text-right text-[11px] font-medium text-muted">{password ? STRENGTH_LABEL[score] : ""}</span>
          </div>
        </div>
        <PasswordField name="confirm_password" match="password" label="Confirm password" placeholder="Repeat password" autoComplete="new-password" />
        <label className="block">
          <span className={label}>Timezone</span>
          <select name="timezone" className={input} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            <TimezoneOptions current={timezone} />
          </select>
          <span className="mt-1.5 block text-[11px] text-muted">Habits reset at midnight in your timezone.</span>
        </label>
        <SubmitButton pending={pending} pendingLabel="Creating account…">
          Create Account
        </SubmitButton>
      </form>
      <LegalNote />
    </AuthCard>
  );
}
