// B07 Promise (4 of 4). "Show up. Be kind." and one ring toggle, "Let Claude plan from free times.", on by default
// and explicit (I #2; Apple 5.1.2(i)): this is the only consent line before the first plan. "I promise" is a tap,
// never a hold (PB 3.5). The table on the right closes: your disc takes its seat and the ring fills, 4 of 4.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Line } from "@/components/brand/line";
import { Button } from "@/components/ui/button";
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
          <Line size="lg" className="max-w-[7ch]">
            Show up. Be kind.
          </Line>
          <button type="button" role="switch" aria-checked={claudeOk} onClick={() => set({ claudeOk: !claudeOk })} className="pods-ob-toggle pressable mt-s8">
            <i aria-hidden />
            Let Claude plan from free times.
          </button>
          <Sub live className="min-h-6 text-label">
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
