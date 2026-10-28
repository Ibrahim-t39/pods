// planner_loop · /app/pods/[podId]/plan/[id] (V3_SPEC §2; video beat 5): the plan's details, opened from its card.
// Core's [podId] layout keeps the pod mounted underneath; this route only adds the details sheet (with "Why this plan"
// inside it), and closing it returns to the pod without a re-mount.
"use client";

import { useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useHydrated } from "@/lib/db/hooks";
import { PlanDetails } from "./plan-details";
import { useTable } from "./model";
import { PodTable } from "./pod-table";

export function PlanRoute() {
  const { podId } = useParams<{ podId: string }>();
  const router = useRouter();
  const hydrated = useHydrated();
  const m = useTable(podId);
  // ?table=1: planner_loop's own table over the page (usePlanStage framed by <PodTable>), until core's page uses it.
  const own = useSearchParams().get("table") === "1";
  const close = useCallback(() => router.replace(`/app/pods/${podId}`, { scroll: false }), [router, podId]);
  if (own)
    return (
      <div className="fixed inset-0 z-overlay overflow-hidden" style={{ background: "var(--stage)", transition: "background-color var(--dur-light) var(--ease-paper)" }}>
        <PodTable podId={podId} />
      </div>
    );
  if (!hydrated || !m) return null;
  return <PlanDetails m={m} onClose={close} />;
}
