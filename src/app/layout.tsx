import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono, Italiana } from "next/font/google";
import { Providers } from "@/components/Providers";
import { APP_NAME, CREATOR } from "@/lib/constants";
import { headIcons } from "@/lib/manifest";
import { META_DESCRIPTION, SITE_URL } from "@/lib/site";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
// (the last two are used on few screens: not worth delaying the first paint to fetch them early)
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", preload: false });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" });
// thin, tall capitals — the Winter Arc poster lettering
const italiana = Italiana({ subsets: ["latin"], weight: "400", variable: "--font-italiana", preload: false });

export const metadata: Metadata = {
  // lets the relative addresses below (canonical links, share images) become full URLs
  metadataBase: new URL(SITE_URL),
  title: { default: `${APP_NAME} — Free Habit Tracker & Winter Arc Challenge`, template: `%s — ${APP_NAME}` },
  description: META_DESCRIPTION,
  applicationName: APP_NAME,
  // the standard icon and install manifest; signed-in pages may swap in the Winter Arc ones
  // (the manifest link is written out in <head> below: it has to send the cookie that says which icon this account uses)
  // plain files, not redirects: search engines show a site's icon next to its results only if they can fetch it directly
  icons: headIcons("classic"),
  keywords: ["habit tracker", "free habit tracker", "daily habit tracker", "streak tracker", "routine tracker", "offline habit tracker", "habit tracker app", "habit tracker online", "habit tracker for students", "winter arc", "winter arc challenge", "winter arc tracker"],
  authors: [{ name: CREATOR.handle }],
  creator: CREATOR.handle,
  category: "productivity",
  // what a shared link looks like on Facebook, WhatsApp, Messenger, X…
  // (the picture comes from opengraph-image.tsx)
  openGraph: { type: "website", siteName: APP_NAME, title: `${APP_NAME} — Free Habit Tracker & Winter Arc Challenge`, description: META_DESCRIPTION, url: "/", locale: "en_US" },
  twitter: { card: "summary_large_image", title: `${APP_NAME} — Free Habit Tracker & Winter Arc Challenge`, description: META_DESCRIPTION },
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
  interactiveWidget: "resizes-content", // when the keyboard opens the page shrinks to fit above it, instead of the keyboard covering the bottom
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#090c13" },
  ],
};

// Runs before first paint so the saved theme never flashes the wrong way.
// A saved choice wins; otherwise whatever the device prefers. (The Winter Arc
// look is offered to members once, see ArcTheme. "arc-auto" is from when it
// switched on by itself; it is honoured until ArcTheme turns it into a choice.)
const themeScript = `try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"&&t!=="arc")t=localStorage.getItem("arc-auto")==="1"?"arc":matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geist.variable} ${geistMono.variable} ${bricolage.variable} ${italiana.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
