// <Shared name="pod-hoopers">: shared-element continuity between screens (COLOR_LIFE §12.2). Wrap the SAME object on
// both screens with the same name and the browser carries it across the navigation (React <ViewTransition>, which
// Next's App Router activates on every route change; node_modules/next/dist/docs/01-app/02-guides/view-transitions.md).
//   Room circle -> table:      <Shared name={`pod-${pod.id}`}>  on the room's circle AND the table's top
//   Plan card -> lock:         <Shared name={`plan-${hangout.id}`}>
//   Your disc (seat glyph -> Your seat): <Shared name="you">
// `share="pod-morph"` + `default="none"`: only the pair animates (CSS in globals.css), nothing else cross-fades on
// unrelated transitions. Browsers without the API simply navigate. Reduced motion: 160 ms (globals.css).
import { ViewTransition, type ReactNode } from "react";

export function Shared({ name, children }: { name: string; children: ReactNode }) {
  return (
    <ViewTransition name={name} share="pod-morph" default="none">
      {children}
    </ViewTransition>
  );
}

/** Stable view-transition names (one place, so both screens agree). */
export const sharedName = {
  pod: (podId: string) => `pod-${podId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
  plan: (hangoutId: string) => `plan-${hangoutId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
  you: "you",
} as const;
