// [U4] Calendar (.ics + Google link), share text and directions for a plan. Community pods share as "my community pod".
"use client";

import { toast } from "sonner";
import { mapsUrl } from "@/components/ui";
import type { Pod, Venue } from "@/lib/types";
import { formatSpan, formatWhen } from "@/lib/time/format";

const icsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

export function downloadIcs(p: { id: string; title: string; starts_at: string; ends_at: string; venue?: Venue | null; details?: string }) {
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pods//Hangout//EN", "BEGIN:VEVENT",
    `UID:${p.id}@pods.app`, `DTSTAMP:${icsDate(new Date().toISOString())}`, `DTSTART:${icsDate(p.starts_at)}`, `DTEND:${icsDate(p.ends_at)}`,
    `SUMMARY:${esc(p.title)}`, p.venue ? `LOCATION:${esc(`${p.venue.name}, ${p.venue.address}`)}` : "", p.details ? `DESCRIPTION:${esc(p.details)}` : "",
    "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", "DESCRIPTION:Hangout in 2 hours", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean);
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "pods-hangout.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast("Added to your calendar file");
}

export function googleCalUrl(p: { title: string; starts_at: string; ends_at: string; venue?: Venue | null }) {
  const q = new URLSearchParams({ action: "TEMPLATE", text: p.title, dates: `${icsDate(p.starts_at)}/${icsDate(p.ends_at)}`, location: p.venue ? `${p.venue.name}, ${p.venue.address}` : "" });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export function directionsUrl(v: Venue) {
  return mapsUrl(`${v.name}, ${v.address}`);
}

/** "Share plan": name, time and place only. Community pods say "my community pod" (D10). */
export async function sharePlan(p: { title: string; starts_at: string; ends_at: string; venue?: Venue | null; pod?: Pod | null }) {
  const who = p.pod?.type === "community" ? "my community pod" : p.pod?.name ?? "my pod";
  const text = `I'm meeting ${who} for "${p.title}", ${formatWhen(p.starts_at).split(" · ")[0]} · ${formatSpan(p.starts_at, p.ends_at)}${p.venue ? ` at ${p.venue.name}, ${p.venue.address}` : ""}.`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "My plan", text });
      return;
    }
  } catch {
    return; // user cancelled
  }
  try {
    await navigator.clipboard.writeText(text);
    toast("Plan copied. Paste it to someone you trust.");
  } catch {
    toast(text);
  }
}
