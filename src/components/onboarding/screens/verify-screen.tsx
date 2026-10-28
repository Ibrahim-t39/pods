// Check it's you (/app/verify; V3_SPEC §6.2, one flow step). "Check it's you." Your seat, large, is the object;
// "Start" turns the camera on inside it, the ring sweeps once, the seat fills ink and Finding begins.
// Rules: placement never runs before the code and this check pass (the repo refuses too); no images are stored
// (B #4); a non-biometric path sits beside it ("Use a code instead"); no claim that other members are verified
// (B #3); no disclaimer words anywhere.
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Line } from "@/components/brand/line";
import { Button } from "@/components/ui/button";
import { useRepo } from "@/lib/db/hooks";
import type { User } from "@/lib/types";
import { FlowStep, GoLink, Sub, useTableSize } from "../flow";
import { CheckSeat } from "../objects";
import { Guarded } from "../guard";
import { DOT, STEP_ROUTE } from "../steps";
import { CameraView } from "../camera-capture";
import { CONTACT_HREF } from "@/components/legal/contact";

export function VerifyScreen() {
  return <Guarded need="promise">{(me) => <Verify me={me!} />}</Guarded>;
}

const SWEEP_MS = 2400;

function Verify({ me }: { me: User }) {
  const router = useRouter();
  const repo = useRepo();
  const { size, wide } = useTableSize();
  const [state, setState] = useState<"idle" | "checking" | "done" | "failed">(me.verified ? "done" : "idle");
  const [cam, setCam] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true; // StrictMode re-mounts effects: without this the ref stays false and "done" never lands
    return () => {
      alive.current = false;
    };
  }, []);
  // Hand off only once the seat has closed ("That's you."): me.verified flips as soon as the repo answers, which is
  // before the sweep ends, so keying on it alone skipped the ring closing green and the seat filling ember.
  useEffect(() => {
    if (state === "done") {
      const t = setTimeout(() => router.replace(STEP_ROUTE.placing), 1100);
      return () => clearTimeout(t);
    }
  }, [state, router]);

  const check = async (camera: boolean) => {
    setState("checking");
    setCam(camera);
    const t0 = Date.now();
    const r = await repo.submitVerification({});
    await new Promise((res) => setTimeout(res, Math.max(0, SWEEP_MS - (Date.now() - t0))));
    if (!alive.current) return;
    setCam(false);
    if (!r.ok) return setState("failed");
    setState("done");
  };

  const line = state === "done" ? "That's you." : state === "failed" ? "Not quite." : state === "checking" ? "Hold still." : "Check it's you.";
  const objSize = wide ? 320 : Math.round(size * 1.05);

  return (
    <FlowStep
      screen={`verify-${state}`}
      back={false}
      label="Check it's you"
      head={
        <>
          <Line size="lg" className="max-w-[8ch]">
            {line}
          </Line>
          <Sub live className="min-h-6 max-w-[30ch] text-[17px]">
            {state === "failed" ? "Your answers are kept." : state === "idle" ? "A live look confirms it's you. No photo is saved." : ""}
          </Sub>
          {state === "idle" && (
            <Button size="lg" variant="secondary" onClick={() => check(false)} className="mt-s4">
              Without the camera
            </Button>
          )}
        </>
      }
      object={
        <CheckSeat size={objSize} initial={me.first_name.slice(0, 1).toUpperCase()} state={state === "failed" ? "idle" : state}>
          {cam ? <CameraView facing="user" mirror on onError={() => setCam(false)} /> : null}
        </CheckSeat>
      }
      dot={DOT.verify}
      status={
        state === "failed" ? (
          <GoLink href={CONTACT_HREF}>Write to us</GoLink>
        ) : undefined
      }
      action={
        state === "idle" || state === "failed" ? (
          <Button size="xl" onClick={() => check(state === "idle")}>
            {state === "failed" ? "Try again" : "Use the camera"}
          </Button>
        ) : undefined
      }
    />
  );
}
