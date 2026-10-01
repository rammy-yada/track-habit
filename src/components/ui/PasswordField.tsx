"use client";

import { useState } from "react";
import { input, label as labelClass } from "./styles";

export function PasswordField({ name, label, placeholder, autoComplete, minLength, onChange }: { name: string; label: string; placeholder?: string; autoComplete?: string; minLength?: number; onChange?: (value: string) => void }) {
  const [shown, setShown] = useState(false);
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <span className="relative block">
        <input
          type={shown ? "text" : "password"}
          name={name}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          maxLength={72}
          onChange={(e) => onChange?.(e.target.value)}
          className={`${input} pr-16`}
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
    </label>
  );
}
