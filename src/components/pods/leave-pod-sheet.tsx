// Leave a pod (OV-03, cut to labels). Quiet: nobody is told who left, and Pods finds the next pod.
//   ask      "Leave Hoopers?" / "Nobody is told." · Stay (quiet) · Leave (destructive)
//   finding  a dashed table breathing
//   done     "You're in Loop Room." · Open it   |   "You'll get a seat soon." · Your pods
// Stay holds the focus. A safety worry goes through "Report someone" in the same menu.
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { notify } from "@/components/ui/toast";
import { useRepo } from "@/lib/db/hooks";
import { sleep } from "@/lib/utils";
import type { Pod } from "@/lib/types";

type Phase = { kind: "ask" } | { kind: "finding" } | { kind: "done"; pod: Pod | null };

export function LeavePodSheet({ open, onOpenChange, podId, podName }: { open: boolean; onOpenChange: (o: boolean) => void; podId: string; podName: string }) {
  const repo = useRepo();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "ask" });
  const stayRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the flow each time the sheet opens
    setPhase({ kind: "ask" });
    const t = setTimeout(() => stayRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  async function leave() {
    setPhase({ kind: "finding" });
    const [r] = await Promise.all([repo.leavePod(podId), sleep(900)]);
    if (!r.ok) {
      setPhase({ kind: "ask" });
      notify.error("Couldn't leave. Try again.");
      return;
    }
    setPhase({ kind: "done", pod: r.data.rematchedInto });
  }

  const go = (href: string) => {
    onOpenChange(false);
    router.replace(href);
  };

  const title =
    phase.kind === "ask" ? `Leave ${podName}?` : phase.kind === "finding" ? "Finding your next pod." : phase.pod ? `You're in ${phase.pod.name}.` : "You'll get a seat soon.";

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(o) => {
        if (!o && phase.kind === "done") router.replace("/app/pods");
        onOpenChange(o);
      }}
      dismissible={phase.kind !== "finding"}
      title={title}
      description={phase.kind === "ask" ? "Nobody is told." : undefined}
      footer={
        phase.kind === "ask" ? (
          <>
            <Button ref={stayRef} variant="secondary" onClick={() => onOpenChange(false)}>
              Stay
            </Button>
            <Button variant="danger" onClick={() => void leave()}>
              Leave
            </Button>
          </>
        ) : phase.kind === "done" ? (
          <Button onClick={() => go(phase.pod ? `/app/pods/${phase.pod.id}` : "/app/pods")}>{phase.pod ? "Open it" : "Your pods"}</Button>
        ) : undefined
      }
    >
      {phase.kind === "finding" && (
        <div role="status" className="grid place-items-center py-s8">
          <span aria-hidden className="pods-breathe block size-24 rounded-full" style={{ border: "1.5px dashed var(--ink-3)" }} />
        </div>
      )}
    </ResponsiveSheet>
  );
}
