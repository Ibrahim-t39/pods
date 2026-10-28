// Marketing group (V3_SPEC §6.1). No shared nav or footer: the Doorway brings its own chrome row (logo + Sign in) and
// the legal pages bring the back glyph. The OG image is drawn by src/app/opengraph-image.tsx.
import type { Metadata } from "next";
import "@/components/marketing/marketing.css";

// A nested openGraph object replaces the parent's, so the generated image is named here explicitly.
const OG = { url: "/opengraph-image", width: 1200, height: 630, alt: "Pods. Saved you a seat." };

export const metadata: Metadata = {
  openGraph: { title: "Pods", description: "Small friend groups that meet again.", siteName: "Pods", type: "website", images: [OG] },
  twitter: { card: "summary_large_image", title: "Pods", description: "Small friend groups that meet again.", images: [OG] },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh text-ink">{children}</div>;
}
