import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono, Italiana } from "next/font/google";
import { Providers } from "@/components/Providers";
import { APP_NAME, CREATOR } from "@/lib/constants";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" });
// thin, tall capitals — the Winter Arc poster lettering
const italiana = Italiana({ subsets: ["latin"], weight: "400", variable: "--font-italiana" });

export const metadata: Metadata = {
  // lets the relative addresses below (canonical links, share images) become full URLs
  metadataBase: new URL(SITE_URL),
  title: { default: `${APP_NAME} — Free Habit Tracker & Winter Arc Challenge`, template: `%s — ${APP_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: APP_NAME,
  keywords: ["habit tracker", "free habit tracker", "daily habit tracker", "streak tracker", "routine tracker", "offline habit tracker", "habit tracker app", "winter arc", "winter arc challenge", "habit tracker Nepal"],
  authors: [{ name: CREATOR.handle }],
  creator: CREATOR.handle,
  category: "productivity",
  // what a shared link looks like on Facebook, WhatsApp, Messenger, X…
  // (the picture comes from opengraph-image.tsx)
  openGraph: { type: "website", siteName: APP_NAME, title: `${APP_NAME} — Free Habit Tracker & Winter Arc Challenge`, description: SITE_DESCRIPTION, url: "/", locale: "en_US" },
  twitter: { card: "summary_large_image", title: `${APP_NAME} — Free Habit Tracker & Winter Arc Challenge`, description: SITE_DESCRIPTION },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  // Proves to Google Search Console that this site is yours: paste the code
  // from its "HTML tag" method into GOOGLE_SITE_VERIFICATION.
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  // iPhone: open full screen, without Safari's bars, when launched from the home screen
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // lets the bottom tab bar pad itself above the home indicator
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#090c13" },
  ],
};

// Runs before first paint so the saved theme never flashes the wrong way.
// A saved choice wins; otherwise whatever the device prefers. (The Winter Arc
// look is not a default — it is switched on for accounts that have joined the
// arc, see ArcTheme.) "arc-auto" remembers that so the right look is there
// from the first paint on later visits.
const themeScript = `try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"&&t!=="arc")t=localStorage.getItem("arc-auto")==="1"?"arc":matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geist.variable} ${geistMono.variable} ${bricolage.variable} ${italiana.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
