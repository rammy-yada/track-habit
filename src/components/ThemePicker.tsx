"use client";

import { useTheme, type Theme } from "@/components/ThemeToggle";

const OPTIONS: { value: Theme; label: string; swatch: string }[] = [
  { value: "light", label: "Light", swatch: "bg-white border-neutral-300" },
  { value: "dark", label: "Dark", swatch: "bg-[#090c13] border-neutral-600" },
  { value: "arc", label: "Winter Arc", swatch: "bg-[linear-gradient(135deg,#f4f4f4_50%,#050505_50%)] border-neutral-500" },
];

/** Profile → Appearance: the one place the look of the app is chosen. */
export function ThemePicker() {
  const theme = useTheme();
  function choose(next: Theme) {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme" data-true-color>
      {OPTIONS.map((option) => (
        <button key={option.value} type="button" role="radio" aria-checked={theme === option.value} onClick={() => choose(option.value)} className={`rounded-xl border p-3 text-center transition-colors ${theme === option.value ? "border-brand bg-brand-soft" : "border-line"}`}>
          <span aria-hidden className={`mx-auto block h-9 w-9 rounded-full border ${option.swatch}`} />
          <span className="mt-2 block text-xs font-bold">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
