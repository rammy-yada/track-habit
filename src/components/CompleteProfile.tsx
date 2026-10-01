"use client";

import { useActionState, useState } from "react";
import { motion } from "motion/react";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { card, input, label } from "@/components/ui/styles";
import { logoutAction } from "@/lib/actions/auth";
import { completeProfileAction } from "@/lib/actions/profile";
import { GENDERS, MIN_AGE } from "@/lib/people";

type Props = { firstName: string; username: string; suggested: boolean; gender: string; birthDate: string; country: string; countries: { code: string; name: string }[] };

/** One short form, asked once: username, gender, date of birth, country — and who may see them. */
export function CompleteProfile({ firstName, username, suggested, gender: savedGender, birthDate, country, countries }: Props) {
  const [state, action, pending] = useActionState(completeProfileAction, null);
  const f = state?.fields;
  const [gender, setGender] = useState(f?.gender ?? savedGender);
  // nobody using this was born after this date
  const latest = new Date(Date.now() - MIN_AGE * 365.25 * 86_400_000).toISOString().slice(0, 10);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">One last step</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">Nice to meet you, {firstName}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">Four quick things before you start. You can change any of them later in Profile.</p>

      <form action={action} className={`${card} mt-6 space-y-5 p-5 sm:p-6`} data-complete-profile>
        <Alert kind="error" shakeKey={state}>
          {state?.error}
        </Alert>

        <label className="block">
          <span className={label}>Username</span>
          <span className="relative block">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">@</span>
            <input className={`${input} pl-8`} name="username" defaultValue={f?.username ?? username} required minLength={3} maxLength={20} pattern="[a-zA-Z0-9_]{3,20}" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          </span>
          <span className="mt-1.5 block text-[11px] text-muted">{suggested ? "We made this one up from your email. Change it to whatever you like." : "This is how you appear on the leaderboard."} Letters, numbers and _ only.</span>
        </label>

        <fieldset>
          <legend className={label}>Gender</legend>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Gender">
            {GENDERS.map((option) => (
              <button key={option.value} type="button" role="radio" aria-checked={gender === option.value} onClick={() => setGender(option.value)} className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition-colors ${gender === option.value ? "border-brand bg-brand-soft text-brand" : "border-line text-ink"}`}>
                <span aria-hidden className="text-base">
                  {option.icon}
                </span>
                {option.label}
              </button>
            ))}
          </div>
          <input type="hidden" name="gender" value={gender} />
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Date of birth</span>
            <input className={input} type="date" name="birth_date" defaultValue={f?.birth_date ?? birthDate} required max={latest} min="1905-01-01" autoComplete="bday" />
          </label>
          <label className="block">
            <span className={label}>Country</span>
            <select className={input} name="country" defaultValue={f?.country ?? country} required autoComplete="country">
              <option value="">Choose…</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="rounded-xl bg-raised p-4">
          <legend className="sr-only">Who can see these</legend>
          <p className="text-[13px] font-bold">On my leaderboard profile, show my…</p>
          <p className="mt-0.5 text-xs text-muted">If you join the Winter Arc, other members can open your profile from the leaderboard. Only your age is ever shown, never your date of birth.</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {[
              ["show_age", "Age"],
              ["show_gender", "Gender"],
              ["show_country", "Country"],
            ].map(([name, text]) => (
              <label key={name} className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input type="checkbox" name={name} defaultChecked className="h-5 w-5 accent-[var(--brand-solid)]" />
                {text}
              </label>
            ))}
          </div>
        </fieldset>

        <SubmitButton pending={pending} pendingLabel="Saving…">
          Start using HabitFlow
        </SubmitButton>
      </form>

      <form action={logoutAction} className="mt-5 text-center">
        <button type="submit" className="text-xs font-medium text-muted underline-offset-2 hover:text-ink hover:underline">
          Sign out instead
        </button>
      </form>
    </motion.div>
  );
}
