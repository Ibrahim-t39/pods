// /i/[code] (marketing/onboarding area): keeps the code on this device and sends the visitor into first run.
// The placing screen redeems it (repo.redeemInvite(takePendingInvite())).
"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { savePendingInvite } from "@/lib/platform/invite";

export function InviteLanding() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  useEffect(() => {
    if (code) savePendingInvite(code);
    router.replace("/app");
  }, [code, router]);
  return null;
}
