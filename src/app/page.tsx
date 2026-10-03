import { redirect } from "next/navigation";
import { Landing } from "@/components/landing/Landing";
import type { Metadata } from "next";
import { currentUser } from "@/lib/auth";
import { APP_NAME, CREATOR } from "@/lib/constants";
import { FAQ } from "@/lib/faq";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site";

// One site for every country: search engines are told this page is the version for all regions.
export const metadata: Metadata = { alternates: { canonical: "/", languages: { en: "/", "x-default": "/" } } };

// Structured data: tells search engines in their own vocabulary what this
// site is (a free web app), so results can show it as one.
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: APP_NAME, description: SITE_DESCRIPTION, inLanguage: "en", publisher: { "@id": `${SITE_URL}/#org` } },
    { "@type": "Organization", "@id": `${SITE_URL}/#org`, name: APP_NAME, url: SITE_URL, logo: `${SITE_URL}/icons/icon-512.png` },
    { "@type": "FAQPage", "@id": `${SITE_URL}/#faq`, mainEntity: FAQ.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: APP_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Any (web, Android, iOS)",
      inLanguage: ["en", "ne"],
      areaServed: "Worldwide",
      isAccessibleForFree: true,
      browserRequirements: "Requires a modern web browser",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: ["Daily, weekly and monthly habits", "Streaks and progress charts", "Works offline and syncs later", "Reminders and notifications", "Winter Arc challenge with a leaderboard", "Installable on phone and desktop"],
      author: { "@type": "Person", name: CREATOR.handle },
    },
  ],
};

export default async function HomePage() {
  const user = await currentUser();
  if (user) redirect(user.role === "admin" ? "/sigmadev" : "/dashboard");
  return (
    <>
      {/* "<" is escaped so nothing in the data could ever close the script tag */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <Landing />
    </>
  );
}
