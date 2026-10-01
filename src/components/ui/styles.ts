// Shared class strings, so every button / input / card in the app matches.

export const card = "rounded-2xl border border-line bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]";

export const input =
  "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm text-ink outline-none transition-[border-color,box-shadow] placeholder:text-muted/70 focus:border-brand focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand)_14%,transparent)]";

export const label = "mb-1.5 block text-xs font-semibold text-muted";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-[background-color,border-color,color,box-shadow] disabled:cursor-not-allowed disabled:opacity-60";

export const btnPrimary = `${buttonBase} bg-brand-solid px-4 py-2.5 text-white hover:bg-brand-solid-hover shadow-[0_6px_18px_-8px_var(--brand-solid)]`;

export const btnGhost = `${buttonBase} border border-line bg-card px-4 py-2.5 text-ink hover:border-brand hover:text-brand`;

export const btnDanger = `${buttonBase} bg-bad px-4 py-2.5 text-white hover:opacity-90 dark:text-bg`;

export const btnSmall = `${buttonBase} border border-line bg-card px-3 py-1.5 text-xs text-muted hover:border-brand hover:text-brand`;

export const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted";
