"use client";

import { useActionState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { card, input, label } from "@/components/ui/styles";
import { sendInquiry } from "@/lib/actions/inquiries";
import { INQUIRY_KINDS, type InquiryKind } from "@/lib/inquiries";

type Props = {
  kind: InquiryKind;
  /** What the "company" box is called on this form. */
  companyLabel: string;
  companyPlaceholder: string;
  messagePlaceholder: string;
};

/** The form on the Collaborate and Brand deals pages. What is sent lands in the admin's inbox. */
export function InquiryForm({ kind, companyLabel, companyPlaceholder, messagePlaceholder }: Props) {
  const [state, action, pending] = useActionState(sendInquiry, null);
  const options = INQUIRY_KINDS[kind];
  const f = state?.fields ?? {};

  if (state?.sent) {
    return (
      <motion.div className={`${card} p-8 text-center`} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} role="status" data-inquiry-sent>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-good-soft text-2xl text-good" aria-hidden>
          ✓
        </div>
        <h2 className="mt-4 font-display text-2xl font-bold tracking-tight">Message sent</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">Thank you. It has reached us, and we&apos;ll reply to the email address you gave, usually within a few days.</p>
      </motion.div>
    );
  }

  return (
    <form action={action} className={`${card} space-y-4 p-5 sm:p-7`} data-inquiry-form={kind}>
      <input type="hidden" name="kind" value={kind} />
      {/* Not for people: left empty by a real visitor, filled in by form-spamming programs. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Leave this empty
          <input type="text" name="fax" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Alert kind="error" shakeKey={state}>
        {state?.error}
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Your name</span>
          <input className={input} name="name" defaultValue={f.name} required minLength={2} maxLength={100} autoComplete="name" />
        </label>
        <label className="block">
          <span className={label}>Email to reply to</span>
          <input className={input} type="email" name="email" defaultValue={f.email} required maxLength={100} autoComplete="email" />
        </label>
        <label className="block">
          <span className={label}>
            {companyLabel}
            {kind === "collab" && <span className="font-normal"> · optional</span>}
          </span>
          <input className={input} name="company" defaultValue={f.company} required={kind === "brand"} maxLength={120} placeholder={companyPlaceholder} autoComplete="organization" />
        </label>
        <label className="block">
          <span className={label}>
            Website or social link <span className="font-normal">· optional</span>
          </span>
          <input className={input} name="website" defaultValue={f.website} maxLength={200} placeholder="https://" inputMode="url" autoComplete="url" />
        </label>
        <label className="block">
          <span className={label}>What is it about?</span>
          <select className={input} name="topic" defaultValue={f.topic ?? options.topics[0]}>
            {options.topics.map((topic) => (
              <option key={topic}>{topic}</option>
            ))}
          </select>
        </label>
        {options.budgets.length > 0 && (
          <label className="block">
            <span className={label}>Rough budget</span>
            <select className={input} name="budget" defaultValue={f.budget ?? options.budgets[0]}>
              {options.budgets.map((budget) => (
                <option key={budget}>{budget}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <label className="block">
        <span className={label}>Your message</span>
        <textarea className={`${input} min-h-[150px]`} name="message" defaultValue={f.message} required minLength={20} maxLength={4000} placeholder={messagePlaceholder} />
      </label>

      <SubmitButton pending={pending} pendingLabel="Sending…">
        Send message
      </SubmitButton>
      <p className="text-center text-xs leading-relaxed text-muted">
        We use what you send only to reply to you. See the{" "}
        <Link href="/privacy" className="font-semibold text-brand hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}
