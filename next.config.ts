// [U0] Next config. cacheComponents stays on (ARCHITECTURE §0): never read Date.now()/localStorage during prerender.
import path from "node:path";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), geolocation=()" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  // QA r1: the dev badge sat on the nav and the progress dots in every recording.
  devIndicators: false,
  partialPrefetching: true,
  turbopack: {
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // QA r1: reference prototypes (/concepts) and dev pages (/dev) are never served by a production build.
  async redirects() {
    if (process.env.NODE_ENV !== "production") return [];
    return [
      { source: "/concepts/:path*", destination: "/", permanent: false },
      { source: "/dev/:path*", destination: "/", permanent: false },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // U11's hand-written service worker: always revalidate, scope the whole site (ARCHITECTURE §13, §17).
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
