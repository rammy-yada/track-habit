// The site's public address, used wherever a full URL has to be written out:
// the sitemap, robots.txt, canonical links and social-share previews.
// APP_URL (see .env.example) overrides it, e.g. after moving to another domain.
export const SITE_URL = (process.env.APP_URL ?? "https://habitflow.hellnah.dev").replace(/\/$/, "");

export const SITE_DESCRIPTION =
  "HabitFlow is a free habit tracker that works offline, in any country and any timezone. Build daily routines, keep streaks, see your progress in charts, and take on the Winter Arc challenge with a live leaderboard.";

// Pages a search engine should list. Everything else is either private
// (needs sign-in) or a step in a flow (verify, reset), and is marked noindex.
export const PUBLIC_PAGES: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" | "yearly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/winter-arc", priority: 0.9, changeFrequency: "daily" },
  { path: "/blog", priority: 0.8, changeFrequency: "weekly" },
  { path: "/collaborate", priority: 0.5, changeFrequency: "monthly" },
  { path: "/brand-deals", priority: 0.5, changeFrequency: "monthly" },
  { path: "/register", priority: 0.7, changeFrequency: "monthly" },
  { path: "/login", priority: 0.5, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
];
