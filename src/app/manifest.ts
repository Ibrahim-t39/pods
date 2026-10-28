// Web app manifest (V3_SPEC §6.1.5: real-platform signals, no fake proof). Icons come from public/icons (drawn from
// the fixed logo in public/brand). Theme and background are the cool paper token (#F7F9FB); one theme only.
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "Pods",
    short_name: "Pods",
    description: "Small friend groups that meet again.",
    start_url: "/app?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7F9FB",
    theme_color: "#F7F9FB",
    categories: ["social", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/brand/app-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [{ name: "Your pods", short_name: "Your pods", url: "/app/pods?source=shortcut", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] }],
  };
}
