// planner_loop · HangoutCard (kept name for older call sites: core's table stage, the dev lab). The pinned v2 card is
// gone; a pod's plan is now the table itself (V3_SPEC §6.4), so this renders the plan stage in one column.
"use client";

import { InlineStage } from "./table/inline-stage";

export interface HangoutCardProps {
  podId: string;
  collapsed?: boolean;
  onOpenDetails?: (suggestionId: string) => void;
  className?: string;
}

export function HangoutCard({ podId, className }: HangoutCardProps) {
  return <InlineStage podId={podId} className={className} />;
}
