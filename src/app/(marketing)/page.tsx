// The landing (/): a real product site. See components/marketing/landing.tsx.
import type { Metadata } from "next";
import { Landing } from "@/components/marketing/landing";

export const metadata: Metadata = {
  title: { absolute: "Pods" },
  description: "Small friend groups that meet again.",
};

export default function LandingPage() {
  return <Landing />;
}
