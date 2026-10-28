// planner_loop · E05 (kept name): the vote is a state of the table (OptionRing, components/planner/table).
"use client";

import { InlineStage } from "@/components/planner/table/inline-stage";
import type { NextHangoutVote as Vote } from "@/lib/types";

export function NextHangoutVote({ vote }: { vote: Vote; now?: Date }) {
  return <InlineStage podId={vote.pod_id} />;
}
