// <Stage light="dawn" /> sets the light of the whole page (DESIGN.md §2; PB 4.4). State changes the surface, not words:
//   paper  default (Your pods, settings, legal)
//   dawn   something is being planned or chosen (planning, first run, vote)
//   clear  locked and settled
//   rain   the plan moved indoors
//   night  the lock moment only (the room goes dark, one lamp)
//   dusk   after a hangout: "Everything okay?", "Run it back?"
// It writes <html data-light>, so the body background cross-fades over --dur-light. On unmount the light returns to
// paper, so a page never leaks its light into the next one. Renders nothing.
"use client";

import { useEffect } from "react";

export type StageLight = "paper" | "dawn" | "clear" | "rain" | "night" | "dusk";

export function setStageLight(light: StageLight) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.light = light;
}

export function Stage({ light = "paper" }: { light?: StageLight }) {
  useEffect(() => {
    setStageLight(light);
    return () => setStageLight("paper");
  }, [light]);
  return null;
}

/** The stage's foreground (ink on paper, lamp at night): for things drawn in SVG. */
export const STAGE_FG = "var(--stage-fg)";
