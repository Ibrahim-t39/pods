// <Daypart />: writes html[data-daypart] = morning | day | evening | night from the local clock, after mount (never
// during prerender: cacheComponents). The paper light warms after 6pm (globals.css). Re-checks every 10 minutes and
// when the tab comes back. Renders nothing. COLOR_LIFE §12.5.
"use client";

import { useEffect } from "react";

export type Daypart = "morning" | "day" | "evening" | "night";

export function daypartOf(hour: number): Daypart {
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 18) return "day";
  if (hour >= 18 && hour < 23) return "evening";
  return "night";
}

export function Daypart() {
  useEffect(() => {
    const set = () => {
      const part = daypartOf(new Date().getHours());
      // night reads like evening on the page: the moment stays the only dark screen
      document.documentElement.dataset.daypart = part === "night" ? "evening" : part;
    };
    set();
    const t = window.setInterval(set, 10 * 60 * 1000);
    document.addEventListener("visibilitychange", set);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", set);
    };
  }, []);
  return null;
}
