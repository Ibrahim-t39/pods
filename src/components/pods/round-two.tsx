// planner_loop · E06 (kept name). "#2 is on." is the table's lock moment (components/planner/table/lock-moment.tsx),
// fired by the stage when the vote locks hangout #2, so this renders nothing.
"use client";

export function RoundTwo(_: { open: boolean; onClose: () => void; startsAt: string; going: number; hours: number; round: number }) {
  return null;
}
