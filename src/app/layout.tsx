import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono, Italiana } from "next/font/google";
import { Providers } from "@/components/Providers";
import { APP_NAME } from "@/lib/constants";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" });
// thin, tall capitals — the Winter Arc poster lettering
const italiana = Italiana({ subsets: ["latin"], weight: "400", variable: "--font-italiana" });

export const metadata: Metadata = {
  title: { default: `${APP_NAME} — Master Your Routine`, template: `%s — ${APP_NAME}` },
  description: "Simple habit tracking designed for clarity and focus. No clutter, just your progress.",
  applicationName: APP_NAME,
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
// With no saved choice: the Winter Arc theme during the season (Oct–Dec),
// otherwise whatever the device prefers.
const themeScript = `try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"&&t!=="arc")t=new Date().getMonth()>=9?"arc":matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;

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
