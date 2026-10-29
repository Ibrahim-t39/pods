// Z03 Offline (first load): one line, the empty table, one way to try again.
"use client";

import { useRouter } from "next/navigation";
import { Line } from "@/components/brand/line";
import { Button } from "@/components/ui";
import { Chrome } from "@/components/shell/chrome";
import { Page } from "@/components/shell/page";

export function OfflineScreen() {
  const router = useRouter();
  return (
    <Page
      chrome={<Chrome left="mark" />}
      head={
        <>
          <Line size="lg">Offline.</Line>
          <p className="mt-s4 text-body-lg text-ink-2">Your pods and plans are safe. We'll catch up when you're back online.</p>
        </>
      }
      object={<span aria-hidden className="block size-48 rounded-full border-[1.5px] border-dashed border-line-2 lg:size-80" />}
      foot={
        <>
          <span />
          <Button onClick={() => navigator.onLine && router.replace("/app")}>Try again</Button>
        </>
      }
    />
  );
}
