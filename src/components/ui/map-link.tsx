// [U1] MapLink / MapTile: no map SDK (ARCHITECTURE §7). A stylised tile (grid streets + pin, procedural) with
// the address and "Open in Maps" (Apple Maps on Apple devices, Google Maps elsewhere; both URLs work anywhere).
"use client";

import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";

export function mapsUrl(q: string, provider: "apple" | "google" = "google") {
  const e = encodeURIComponent(q);
  return provider === "apple" ? `https://maps.apple.com/?q=${e}` : `https://www.google.com/maps/search/?api=1&query=${e}`;
}

export function MapLink({ query, label = "Open in Maps", className }: { query: string; label?: string; className?: string }) {
  return (
    <a
      href={mapsUrl(query)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("inline-flex items-center gap-1.5 rounded-sm text-label text-link outline-offset-2 hover:underline", className)}
    >
      {label}
      <Icon name="arrow" size={16} />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

export function MapTile({ name, address, query, className }: { name: string; address: string; query?: string; className?: string }) {
  return (
    <div data-allow-city className={cn("overflow-hidden rounded-[24px] bg-lit shadow-sm", className)}>
      <a href={mapsUrl(query ?? `${name}, ${address}`)} target="_blank" rel="noopener noreferrer" aria-label={`${name}, ${address}. Open in Maps`} className="group relative block aspect-[16/7] overflow-hidden outline-offset-[-2px]">
        <svg viewBox="0 0 320 140" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
          <rect width="320" height="140" fill="var(--color-sunken)" />
          <path d="M0 96 C80 80 140 120 220 92 S300 70 320 76 V140 H0Z" fill="var(--color-grove-soft)" />
          <circle cx="250" cy="34" r="26" fill="var(--color-info-soft)" />
          <g stroke="var(--color-surface)" strokeWidth="7" fill="none" strokeLinecap="round">
            <path d="M-10 52 L330 40" />
            <path d="M120 -10 L140 150" />
            <path d="M-10 118 L330 104" />
            <path d="M232 -10 L250 150" />
          </g>
          <g stroke="var(--color-border)" strokeWidth="1.5" fill="none">
            <path d="M40 -10 L52 150" />
            <path d="M-10 78 L330 70" />
          </g>
        </svg>
        <span className="absolute top-1/2 left-[43%] -translate-x-1/2 -translate-y-full transition-transform duration-base ease-spring group-hover:-translate-y-[110%]">
          <span className="grid size-10 place-items-center rounded-full rounded-br-none bg-signal-gloss text-white shadow-[var(--shadow-inset-gloss),var(--shadow-glow-signal)] rotate-45">
            <Icon name="place" size={18} />
          </span>
        </span>
      </a>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-fg">{name}</div>
          <div className="truncate text-body-sm text-fg-muted">{address}</div>
        </div>
        <MapLink query={query ?? `${name}, ${address}`} label="Open" />
      </div>
    </div>
  );
}
