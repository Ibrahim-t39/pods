// planner_loop · E03/E04 (kept name for core's table stage): waiting and the reveal are states of the table now.
"use client";

import { InlineStage } from "@/components/planner/table/inline-stage";
import { usePodTable } from "./table-context";

export function RunItBackCard(_: { revealed: { yes: number; answered: number } | null; compact?: boolean; planning?: boolean }) {
  const api = usePodTable();
  return api ? <InlineStage podId={api.podId} /> : null;
}
