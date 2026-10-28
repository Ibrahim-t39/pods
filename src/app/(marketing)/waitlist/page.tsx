// [U10] MK-07 Waitlist `/waitlist` (outside the metro, or over 29 via ?reason=age). Thin server file; the screen reads
// search params on the client inside Suspense (cacheComponents).
import type { Metadata } from "next";
import { Suspense } from "react";
import { WaitlistScreen } from "@/components/marketing/waitlist-screen";

export const metadata: Metadata = { title: "Waitlist", description: "We will text you when a seat opens." };

export default function WaitlistPage() {
  return (
    <Suspense fallback={<div className="min-h-[70dvh]" />}>
      <WaitlistScreen />
    </Suspense>
  );
}
