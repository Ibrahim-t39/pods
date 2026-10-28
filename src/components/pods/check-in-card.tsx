// planner_loop · E01/E02 (kept names for core's table stage). "Everything okay?" and "Run it back?" are states of the
// table now (components/planner/table), so these render the plan stage for the hangout's pod.
"use client";

import { InlineStage } from "@/components/planner/table/inline-stage";
import type { Hangout } from "@/lib/types";

export function CheckInCard({ hangout }: { hangout: Hangout; podName?: string; ended?: boolean; onWent?: () => void }) {
  return <InlineStage podId={hangout.pod_id} />;
}

export function BallotCard({ hangout }: { hangout: Hangout }) {
  return <InlineStage podId={hangout.pod_id} />;
}

/** The v2 check-in sheet is folded into E01 ("Everything okay?" · Yes checks you in). */
export function CheckInSheet(_: { hangout: Hangout; mode: null | "went" | "missed"; onClose: () => void; onMissed: () => void }) {
  return null;
}
