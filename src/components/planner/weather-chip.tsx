// [U4] WeatherChip: sky/rain glyph + "64°F · 10% rain", tooltip "Open-Meteo · updated 3h ago". Renders NOTHING when there
// is no live forecast (never an empty "forecast" chip, never invented). The forecast is fetched in the browser after
// mount (venue lat/lng + date only), cached per date for the session.
"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Tooltip } from "@/components/ui";
import { cn } from "@/lib/cn";
import { getForecast } from "@/lib/planner/weather";
import type { Forecast } from "@/lib/planner/types";

const cache = new Map<string, Promise<Forecast | null>>();

export function useForecast(date: string | null | undefined, lat?: number, lng?: number): Forecast | null {
  const [f, setF] = useState<Forecast | null>(null);
  useEffect(() => {
    if (!date) return;
    let live = true;
    const key = `${date}:${lat?.toFixed(2)}:${lng?.toFixed(2)}`;
    if (!cache.has(key)) cache.set(key, typeof navigator !== "undefined" && navigator.onLine === false ? Promise.resolve(null) : getForecast(date, { lat, lng, timeoutMs: 3000 }));
    cache.get(key)!.then((x) => live && setF(x));
    return () => { live = false; };
  }, [date, lat, lng]);
  return f;
}

export function weatherIcon(f: Forecast, size = 14) {
  return <Icon name={f.precipChance >= 50 ? "rain" : "sky"} size={size} aria-hidden />;
}

function ago(iso: string): string {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  return m < 2 ? "just now" : m < 60 ? `${m} min ago` : `${Math.round(m / 60)}h ago`;
}

export function WeatherChip({ forecast, className }: { forecast: Forecast | null; className?: string }) {
  if (!forecast) return null;
  const rainy = forecast.precipChance >= 50;
  return (
    <Tooltip content={`${forecast.provider} · updated ${ago(forecast.fetchedAt)}`}>
      <span
        tabIndex={0}
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-pill border px-2.5 text-caption tabular whitespace-nowrap outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus-ring",
          rainy ? "border-info-border bg-info-soft text-info-text" : "border-border bg-surface text-fg",
          className,
        )}
        aria-label={`Forecast: ${forecast.highF} degrees, ${forecast.precipChance}% chance of rain, from ${forecast.provider}`}
      >
        {weatherIcon(forecast)}
        {forecast.highF}°F · {forecast.precipChance}% rain
      </span>
    </Tooltip>
  );
}
