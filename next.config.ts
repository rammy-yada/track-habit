import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
