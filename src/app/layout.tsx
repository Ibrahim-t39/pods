// Root layout: one voice (Archivo, the logo's wordmark font, via next/font; PODS/brand/BRAND.md §2, DESIGN.md §3), the stage light
// script before paint, providers, metadata.
import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { THEME_SCRIPT } from "@/lib/theme";
import { APP } from "@/config/app";
import { Providers } from "./providers";
import "./globals.css";

const sans = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"], display: "swap" });

/** Absolute base for og:image and other metadata URLs, so link previews (iMessage, Slack) find the image. */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pods-lac.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: APP.title, template: "%s · Pods" },
  description: APP.description,
  applicationName: "Pods",
  icons: {
    icon: [
      { url: "/icons/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "Pods", statusBarStyle: "default" },
  openGraph: { title: APP.title, description: APP.description, images: ["/brand/og-image-1200x630.png"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F9FB" },
    { media: "(prefers-color-scheme: dark)", color: "#F7F9FB" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="light"
      data-light="paper"
      suppressHydrationWarning
      className={sans.variable}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

