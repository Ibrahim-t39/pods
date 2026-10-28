// planner_loop · <InlineStage>: the plan stage stacked in one column (head, object, foot), for places that frame it
// themselves (core's table page, before it calls usePlanStage directly; the dev lab). Light and the moment overlay
// still come from the stage.
"use client";

import { usePodTable } from "@/components/pods/table-context";
import { usePlanStage } from "./pod-table";

export function InlineStage({ podId, className }: { podId: string; className?: string }) {
  const api = usePodTable();
  const st = usePlanStage(podId, { onTalk: api?.openTalk, unread: api?.unread, inline: true });
  return (
    <div className={`pt-inline ${className ?? ""}`} data-moment={st.moment}>
      {st.head && <div className="pt-inline-head">{st.head}</div>}
      <div className="pt-inline-obj">{st.object}</div>
      {st.foot && <div className="pt-inline-foot">{st.foot}</div>}
      {st.overlay}
    </div>
  );
}
