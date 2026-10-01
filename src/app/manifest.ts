import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/constants";

// Makes the site installable: this is what the phone reads when you
// "Add to Home Screen" / "Install app".
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${APP_NAME} — Habit Tracker`,
    short_name: APP_NAME,
    description: "Simple habit tracking designed for clarity and focus.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#090c13",
    theme_color: "#2563eb",
    categories: ["productivity", "lifestyle", "health"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // long-press the app icon on Android to jump straight to these
    shortcuts: [
      { name: "Today's habits", short_name: "Today", url: "/dashboard" },
      { name: "Monthly view", short_name: "Month", url: "/monthly" },
      { name: "Analytics", short_name: "Stats", url: "/analytics" },
    ],
  };
}
