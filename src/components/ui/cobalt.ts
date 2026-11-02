// The product's own colours: cobalt, and marigold for "today". Inside a block
// painted with one of these the site's colour names are redefined, so the logo
// and the shared buttons read correctly there in any theme.
export const COBALT = "#1B34E0";
export const MARIGOLD = "#FFC400";

export const ON_COBALT = {
  background: COBALT,
  "--ink": "#ffffff",
  "--muted": "rgba(255,255,255,0.82)",
  "--line": "rgba(255,255,255,0.4)",
  "--card": "transparent",
  "--raised": "rgba(255,255,255,0.14)",
  "--brand": "#ffffff",
  "--brand-solid": "#ffffff",
  "--brand-solid-hover": "#e6e9ff",
  "--on-brand": COBALT,
  "--brand-soft": "rgba(255,255,255,0.16)",
  color: "#ffffff",
} as React.CSSProperties;

export const ON_MARIGOLD = {
  ...ON_COBALT,
  background: MARIGOLD,
  "--ink": "#000000",
  "--muted": "rgba(0,0,0,0.72)",
  "--line": "rgba(0,0,0,0.35)",
  "--brand": "#000000",
  "--brand-solid": "#000000",
  "--brand-solid-hover": "#222222",
  "--on-brand": MARIGOLD,
  "--brand-soft": "rgba(0,0,0,0.12)",
  color: "#000000",
} as React.CSSProperties;
