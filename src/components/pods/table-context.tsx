// The table page's seams (V3_SPEC §6.3). Core owns the page (chrome, swipe, Talk, the menu); anything that renders
// inside it (planner_loop's plan, lock and repeat pieces) opens those through this context instead of owning them.
//   openTalk()   the Talk sheet (S03): tapping the table or its centre cue
//   openMenu()   the one menu sheet (M01)
//   unread       Talk messages since this device last read the pod
"use client";

import { createContext, useContext } from "react";

export interface PodTableApi {
  podId: string;
  openTalk: () => void;
  openMenu: () => void;
  unread: number;
}

export const PodTableContext = createContext<PodTableApi | null>(null);

/** The table page's seams. Null outside a table page (planner pieces rendered elsewhere fall back to links). */
export function usePodTable(): PodTableApi | null {
  return useContext(PodTableContext);
}

/** Room → table hand-off: the Room names the table it grew, and that table's page settles it (scale 1.3 → 1) instead
 *  of fading up from nothing, so one object carries the zoom across the route change (V3_SPEC §3). */
export const zoomHandoff: { podId: string | null } = { podId: null };
