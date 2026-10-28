// [U4] Open-Meteo daily forecast (free, keyless, ~16-day horizon). Returns null on any failure or when the date is
// outside the horizon: the UI then hides the weather chip entirely (never invents a forecast).
import type { Forecast } from "./types";

// Huntsville, AL.
const HSV = { lat: 34.7304, lng: -86.5861 };

const WMO: Record<number, string> = {
  0: "clear", 1: "mostly clear", 2: "partly cloudy", 3: "overcast", 45: "foggy", 48: "foggy",
  51: "light drizzle", 53: "drizzle", 55: "drizzle", 61: "light rain", 63: "rain", 65: "heavy rain",
  71: "snow", 80: "showers", 81: "showers", 82: "heavy showers", 95: "thunderstorms",
};

export async function getForecast(
  date: string,
  opts: { lat?: number; lng?: number; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<Forecast | null> {
  // Open-Meteo's horizon is ~16 days; outside it there is no forecast (and no request).
  const days = (Date.parse(`${date}T12:00:00Z`) - Date.now()) / 86_400_000;
  if (!(days > -1 && days < 15.5)) return null;
  const lat = opts.lat ?? HSV.lat;
  const lng = opts.lng ?? HSV.lng;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code` +
    `&temperature_unit=fahrenheit&timezone=America%2FChicago&start_date=${date}&end_date=${date}`;
  try {
    const signals = [AbortSignal.timeout(opts.timeoutMs ?? 2500), opts.signal].filter(Boolean) as AbortSignal[];
    const res = await fetch(url, { signal: signals.length > 1 ? AbortSignal.any(signals) : signals[0], cache: "no-store" });
    if (!res.ok) return null;
    const j = await res.json();
    const d = j?.daily;
    if (!d?.time?.length || d.temperature_2m_max?.[0] == null) return null;
    return {
      date,
      highF: Math.round(d.temperature_2m_max[0]),
      lowF: Math.round(d.temperature_2m_min[0]),
      precipChance: Math.round(d.precipitation_probability_max?.[0] ?? 0),
      summary: WMO[d.weather_code?.[0]] ?? "mixed",
      provider: "Open-Meteo",
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
