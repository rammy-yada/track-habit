"use client";

import { useEffect, useRef, useState } from "react";
import { input, label as labelClass } from "./styles";

/**
 * `match` is the name of another password field in the same form. When given,
 * this field says while it is being typed whether the two are the same, and
 * the form cannot be sent until they are.
 */
export function PasswordField({ name, label, placeholder, autoComplete, minLength, match, onChange }: { name: string; label: string; placeholder?: string; autoComplete?: string; minLength?: number; match?: string; onChange?: (value: string) => void }) {
  const [shown, setShown] = useState(false);
  const [value, setValue] = useState("");
  const [other, setOther] = useState("");
  const field = useRef<HTMLInputElement>(null);

  // Follow both fields from the form itself, so it also works when the other
  // one is edited afterwards, and clears when the form is reset after saving.
  useEffect(() => {
    const form = field.current?.form;
    if (!form) return;
    const read = () => {
      setValue(field.current?.value ?? "");
      if (match) setOther((form.elements.namedItem(match) as HTMLInputElement | null)?.value ?? "");
    };
    const cleared = () => setTimeout(read, 0); // the values are emptied just after the event
    form.addEventListener("input", read);
    form.addEventListener("reset", cleared);
    return () => {
      form.removeEventListener("input", read);
      form.removeEventListener("reset", cleared);
    };
  }, [match]);

  const tooShort = minLength !== undefined && value.length > 0 && value.length < minLength;
  const differs = match !== undefined && value.length > 0 && value !== other;
  const same = match !== undefined && value.length > 0 && value === other;
  useEffect(() => {
    field.current?.setCustomValidity(differs ? "Passwords do not match." : "");
  }, [differs]);
  const problem = tooShort ? `${minLength! - value.length} more character${minLength! - value.length === 1 ? "" : "s"} needed (at least ${minLength}).` : differs ? "Passwords do not match." : null;

  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <span className="relative block">
        <input
          ref={field}
          type={shown ? "text" : "password"}
          name={name}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          maxLength={72}
          aria-invalid={problem ? true : undefined}
          onChange={(e) => onChange?.(e.target.value)}
          className={`${input} pr-16 ${problem ? "border-bad" : ""}`}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? "Hide password" : "Show password"}
          className="absolute right-1.5 top-1/2 grid h-8 min-w-12 -translate-y-1/2 place-items-center rounded-md px-2 text-[11px] font-semibold uppercase tracking-wide text-muted hover:bg-raised hover:text-ink"
        >
          {shown ? "Hide" : "Show"}
        </button>
      </span>
      {/* said as it is typed, before anything is sent */}
      <span aria-live="polite" data-password-hint className={`mt-1 block min-h-[1rem] text-xs font-medium ${problem ? "text-bad" : "text-good"}`}>
        {problem ?? (same ? "✓ Passwords match." : "")}
      </span>
    </label>
  );
}
