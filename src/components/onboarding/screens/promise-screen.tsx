// B07 Promise (5 of 6). The promise is the line, "Show up. Be kind.", and the one button keeps it: "I promise" (a
// tap, never a hold; PB 3.5). The AI consent is its own row with a real switch, on by default and explicit (I #2;
// Apple 5.1.2(i)), so it never reads as part of the promise (QA round 1). The table closes: your disc takes its seat.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Line } from "@/components/brand/line";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useRepo } from "@/lib/db/hooks";
import type { User } from "@/lib/types";
import { FlowStep, Sub, useTableSize } from "../flow";
import { SeatTable } from "../objects";
import { useDraft } from "../draft";
import { Guarded } from "../guard";
import { DOT, STEP_ROUTE } from "../steps";

export function PromiseScreen() {
  return <Guarded need="me">{(me) => <PromiseStep me={me!} />}</Guarded>;
}

function PromiseStep({ me }: { me: User }) {
  const router = useRouter();
  const repo = useRepo();
  const { size } = useTableSize();
  const claudeOk = useDraft((s) => s.claudeOk);
  const set = useDraft((s) => s.set);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(false);

  const promise = async () => {
    setBusy(true);
    setErr(false);
    const r = await repo.acceptPledge();
    if (!r.ok) {
      setBusy(false);
      return setErr(true);
    }
    setDone(true);
    // let the seat close before the next step
    setTimeout(() => router.push(STEP_ROUTE.verify), 650);
  };

  return (
    <FlowStep
      screen="promise"
      back={false}
      label="Promise"
      head={
        <>
          <Line size="lg">
            <span className="whitespace-nowrap">Show up.</span> <span className="whitespace-nowrap">Be kind.</span>
          </Line>
          <Sub className="text-[17px]">Your promise to your pod.</Sub>
          <label className="pods-ob-consent">
            <span>
              AI plans your hangouts
              <small>From your free times</small>
            </span>
            <Switch checked={claudeOk} onCheckedChange={(v) => set({ claudeOk: v })} aria-label="AI plans your hangouts" />
          </label>
          <Sub live className="min-h-6 text-[15px]">
            {err ? "Not saved. Try again." : ""}
          </Sub>
        </>
      }
      object={<SeatTable size={size} initial={me.first_name.slice(0, 1).toUpperCase()} taken={done || busy} />}
      dot={DOT.promise}
      action={
        <Button size="xl" loading={busy && !done} onClick={promise}>
          I promise
        </Button>
      }
    />
  );
}
