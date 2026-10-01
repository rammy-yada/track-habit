"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { input, label } from "@/components/ui/styles";
import { updateDetailsAction } from "@/lib/actions/profile";
import { GENDERS } from "@/lib/people";

export type Details = { gender: string; birthDate: string; country: string; showAge: boolean; showGender: boolean; showCountry: boolean; countries: { code: string; name: string }[] };

/** Profile → About you: gender, date of birth and country, and which of them other members may see. */
export function AboutYou({ details }: { details: Details }) {
  const [state, action, pending] = useActionState(updateDetailsAction, null);
  const [gender, setGender] = useState(details.gender);
  return (
    <form action={action} className="space-y-5" data-about-you>
      <Alert kind={state?.error ? "error" : "success"} shakeKey={state}>
        {state?.error ?? state?.message}
      </Alert>
      <fieldset>
        <legend className={label}>Gender</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Gender">
          {GENDERS.map((option) => (
            <button key={option.value} type="button" role="radio" aria-checked={gender === option.value} onClick={() => setGender(option.value)} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${gender === option.value ? "border-brand bg-brand-soft text-brand" : "border-line"}`}>
              {option.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="gender" value={gender} />
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Date of birth</span>
          <input className={input} type="date" name="birth_date" defaultValue={details.birthDate} required min="1905-01-01" autoComplete="bday" />
        </label>
        <label className="block">
          <span className={label}>Country</span>
          <select className={input} name="country" defaultValue={details.country} required autoComplete="country">
            {details.countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className="rounded-xl bg-raised p-4">
        <legend className="sr-only">Privacy</legend>
        <p className="text-[13px] font-bold">On my leaderboard profile, show my…</p>
        <p className="mt-0.5 text-xs text-muted">Other Winter Arc members can open your profile from the leaderboard. Untick anything you&apos;d rather keep to yourself. Your date of birth is never shown — only your age.</p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {(
            [
              ["show_age", "Age", details.showAge],
              ["show_gender", "Gender", details.showGender],
              ["show_country", "Country", details.showCountry],
            ] as const
          ).map(([name, text, on]) => (
            <label key={name} className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input type="checkbox" name={name} defaultChecked={on} className="h-5 w-5 accent-[var(--brand-solid)]" />
              {text}
            </label>
          ))}
        </div>
      </fieldset>
      <SubmitButton pending={pending} pendingLabel="Saving…">
        Save
      </SubmitButton>
    </form>
  );
}
