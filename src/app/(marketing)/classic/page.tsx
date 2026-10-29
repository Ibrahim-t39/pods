// The classic landing (/classic): the previous product-site landing, kept so the team can compare it with the film at /.
import type { Metadata } from "next";
import { Landing } from "@/components/marketing/landing";
import { LandingSwitch } from "@/components/marketing/landing-switch";

export const metadata: Metadata = {
  title: { absolute: "Pods" },
  description: "Small friend groups that meet again.",
};

export default function ClassicLandingPage() {
  return (
    <>
      <Landing />
      <LandingSwitch />
    </>
  );
}
