"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { resendOtpAction, verifyOtpAction } from "@/lib/actions/auth";
import { AuthCard } from "./AuthCard";

const LENGTH = 6;

export function VerifyForm({ email, devCode }: { email: string; devCode: string | null }) {
  const [state, action, pending] = useActionState(verifyOtpAction, null);
  // Whichever happened last — a rejected code or a fresh one — is what's shown.
  const [notice, setNotice] = useState<{ kind: "error" | "success"; text: string; id: number } | null>(null);
  const [resending, startResend] = useTransition();
  const [digits, setDigits] = useState<string[]>(() => Array(LENGTH).fill(""));
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  // There's no mail server in this project, so the code is shown on screen and
  // typed in for you, one digit at a time.
  useEffect(() => {
    if (!devCode) return;
    setDigits(Array(LENGTH).fill(""));
    const timers = [...devCode].map((ch, i) => setTimeout(() => setDigits((d) => d.map((v, j) => (j === i ? ch : v))), 500 + i * 110));
    return () => timers.forEach(clearTimeout);
  }, [devCode]);

  useEffect(() => {
    if (state?.error) setNotice({ kind: "error", text: state.error, id: Date.now() });
  }, [state]);

  function resend() {
    startResend(async () => {
      const result = await resendOtpAction();
      if (result?.message) setNotice({ kind: "success", text: result.message, id: Date.now() });
      else if (result?.error) setNotice({ kind: "error", text: result.error, id: Date.now() });
    });
  }

  function setAt(index: number, raw: string) {
    const clean = raw.replace(/\D/g, "");
    if (clean.length > 1) {
      // a pasted code fills every box from here on
      setDigits((d) => d.map((v, j) => (j >= index && j - index < clean.length ? clean[j - index] : v)));
      boxes.current[Math.min(LENGTH - 1, index + clean.length)]?.focus();
      return;
    }
    setDigits((d) => d.map((v, j) => (j === index ? clean : v)));
    if (clean) boxes.current[index + 1]?.focus();
  }

  return (
    <AuthCard title="Verify your email" subtitle={devCode ? `Confirm the account for ${email}.` : `We sent a 6-digit code to ${email}. Enter it below. It can take a minute — if it isn't in your inbox, look in Spam or Junk.`}>
      <Link href="/register" className="mb-5 inline-block text-[13px] font-medium text-muted hover:text-brand">
        ← Change sign-up details
      </Link>

      {devCode && (
        <div className="mb-6 rounded-2xl border border-dashed border-brand bg-brand-soft p-4 text-center">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-brand">Your verification code</span>
          <span className="mt-1 flex justify-center gap-2 font-mono text-3xl font-bold text-brand" aria-label={devCode.split("").join(" ")}>
            {[...devCode].map((ch, i) => (
              <motion.span key={`${devCode}-${i}`} initial={{ rotateX: -90, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} transition={{ delay: 0.1 + i * 0.08, type: "spring", stiffness: 240, damping: 16 }} className="inline-block">
                {ch}
              </motion.span>
            ))}
          </span>
          <span className="mt-1.5 block text-[11px] text-muted">Shown here because this demo has no mail server. Valid for 10 minutes.</span>
        </div>
      )}

      <Alert kind={notice?.kind ?? "success"} shakeKey={notice?.id}>
        {notice?.text}
      </Alert>

      <form action={action}>
        <input type="hidden" name="code" value={digits.join("")} />
        {/* the row of boxes shakes when a code is rejected */}
        <motion.div key={notice?.id ?? 0} className="mb-6 flex justify-center gap-2" animate={notice?.kind === "error" ? { x: [0, -10, 10, -6, 6, 0] } : {}} transition={{ duration: 0.4 }}>
          {digits.map((digit, i) => (
            <motion.input
              key={i}
              ref={(el) => {
                boxes.current[i] = el;
              }}
              value={digit}
              onChange={(e) => setAt(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !digit) boxes.current[i - 1]?.focus();
              }}
              onFocus={(e) => e.target.select()}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={LENGTH}
              aria-label={`Digit ${i + 1}`}
              animate={{ scale: digit ? [1, 1.12, 1] : 1, borderColor: digit ? "var(--brand)" : "var(--line)" }}
              transition={{ duration: 0.22 }}
              className="h-14 w-12 rounded-xl border bg-card text-center font-mono text-xl font-bold outline-none focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand)_14%,transparent)]"
            />
          ))}
        </motion.div>
        <SubmitButton pending={pending} pendingLabel="Verifying…">
          Verify &amp; Continue
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted">
        {devCode ? "Didn't receive it?" : "Nothing in your inbox? Check spam, or"}{" "}
        <button type="button" disabled={resending} onClick={resend} className="font-semibold text-brand underline disabled:opacity-60">
          {resending ? "Sending…" : devCode ? "Regenerate code" : "send a new code"}
        </button>
      </p>
    </AuthCard>
  );
}
