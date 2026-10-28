// Platform §F4: directions for a venue. Coordinates when we have them (exact pin), else the address.
import type { Venue } from "@/lib/types";

export function directionsUrl(v: Pick<Venue, "lat" | "lng" | "name" | "address">, provider: "google" | "apple" = "google"): string {
  const hasPin = Number.isFinite(v.lat) && Number.isFinite(v.lng) && !(v.lat === 0 && v.lng === 0);
  const dest = hasPin ? `${v.lat},${v.lng}` : `${v.name}, ${v.address}`;
  return provider === "apple"
    ? `https://maps.apple.com/?daddr=${encodeURIComponent(dest)}&q=${encodeURIComponent(v.name)}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}
