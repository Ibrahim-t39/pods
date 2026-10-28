// Invite link landing (marketing/onboarding area). PLATFORM_SPEC §F7.
import { Suspense } from "react";
import { InviteLanding } from "@/components/platform/invite-landing";

export default function Page() {
  return (
    <Suspense>
      <InviteLanding />
    </Suspense>
  );
}
