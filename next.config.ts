import type { NextConfig } from "next";

// One id per build. The app compares the id it was built with against the
// id the server reports, and offers "Update & restart" when they differ.
const buildId = process.env.BUILD_ID ?? process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? Date.now().toString(36);

const nextConfig: NextConfig = {
  generateBuildId: async () => buildId,
  poweredByHeader: false, // one header fewer, and no need to advertise what the site runs on
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
  // The Docker image (deploy/Dockerfile) builds a self-contained server.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  // Lets a phone on the same Wi-Fi open the dev server by the computer's
  // LAN address (http://192.168.x.x:3000). Development only.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
  // Sent with every response. They tell the browser: never show this site
  // inside another site's frame (clickjacking), never guess file types, keep
  // full addresses out of Referer headers sent elsewhere, and always use HTTPS.
  async headers() {
    return [
      // icons never change under the same name: let browsers keep them for a month
      { source: "/icons/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=2592000" }] },
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
  // The old PHP URLs keep working as bookmarks.
  async redirects() {
    return [
      { source: "/index.php", destination: "/", permanent: true },
      { source: "/:page(login|register|dashboard|analytics|monthly|profile).php", destination: "/:page", permanent: true },
      { source: "/:page(donate|donate.php)", destination: "/support", permanent: true },
    ];
  },
};

export default nextConfig;
