import type { NextConfig } from "next";

// One id per build. The app compares the id it was built with against the
// id the server reports, and offers "Update & restart" when they differ.
const buildId = process.env.BUILD_ID ?? process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? Date.now().toString(36);

const nextConfig: NextConfig = {
  generateBuildId: async () => buildId,
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
  // The Docker image (deploy/Dockerfile) builds a self-contained server.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  // Lets a phone on the same Wi-Fi open the dev server by the computer's
  // LAN address (http://192.168.x.x:3000). Development only.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
  // The old PHP URLs keep working as bookmarks.
  async redirects() {
    return [
      { source: "/index.php", destination: "/", permanent: true },
      { source: "/:page(login|register|dashboard|analytics|monthly|profile).php", destination: "/:page", permanent: true },
      { source: "/:page(donate|donate.php)", destination: "/support", permanent: true },
      { source: "/admin/index.php", destination: "/admin", permanent: true },
    ];
  },
};

export default nextConfig;
