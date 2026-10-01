import type { MetadataRoute } from "next";
import { APP_NAME } from "./constants";

export type AppIcon = "classic" | "arc";

/** Which icon an account gets: its own choice, or — on "auto" — the Winter Arc one while it is in the arc. */
export const iconFor = (choice: string, arcMember: boolean): AppIcon => (choice === "arc" || (choice !== "classic" && arcMember) ? "arc" : "classic");

/** The browser-tab and iPhone home-screen icons for a page's <head>. */
export const headIcons = (icon: AppIcon) =>
  icon === "arc"
    ? // through /app-icon, so an icon an admin has uploaded is used (it falls back to the built-in snowflake)
      { icon: [{ url: "/app-icon/arc?s=192", type: "image/png", sizes: "192x192" }], apple: [{ url: "/app-icon/arc?s=180", sizes: "180x180", type: "image/png" }] }
    : { icon: [{ url: "/icon.svg", type: "image/svg+xml", sizes: "any" }], apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }] };

export const manifestUrl = (icon: AppIcon) => (icon === "arc" ? "/manifest-arc.webmanifest" : "/manifest.webmanifest");

/**
 * What a phone reads when you "Add to Home Screen" / "Install app". There are
 * two versions that differ only in the icon; both describe the same app (same
 * id), so switching icon never creates a second install.
 */
export function buildManifest(icon: AppIcon): MetadataRoute.Manifest {
  const icons =
    icon === "arc"
      ? [
          { src: "/app-icon/arc?s=192", sizes: "192x192", type: "image/png", purpose: "any" as const },
          { src: "/app-icon/arc?s=512", sizes: "512x512", type: "image/png", purpose: "any" as const },
          { src: "/app-icon/arc?s=512&m=1", sizes: "512x512", type: "image/png", purpose: "maskable" as const },
        ]
      : [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" as const },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" as const },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" as const },
        ];
  return {
    id: "/",
    name: `${APP_NAME} — Habit Tracker`,
    short_name: APP_NAME,
    description: "Simple habit tracking designed for clarity and focus. Works offline.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#090c13",
    theme_color: icon === "arc" ? "#050505" : "#2563eb",
    lang: "en",
    categories: ["productivity", "lifestyle", "health"],
    prefer_related_applications: false,
    icons,
    // long-press the app icon on Android to jump straight to these
    shortcuts: [
      { name: "Today's habits", short_name: "Today", url: "/dashboard", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Winter Arc", short_name: "Arc", url: "/arc", icons: [{ src: "/app-icon/arc?s=192", sizes: "192x192" }] },
      { name: "Monthly view", short_name: "Month", url: "/monthly" },
      { name: "Analytics", short_name: "Stats", url: "/analytics" },
    ],
  };
}
