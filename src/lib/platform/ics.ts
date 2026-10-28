// Platform §F4: "Add to calendar". RFC 5545 VEVENT for a hangout or a plan. Pure; the browser download lives in
// downloadIcs() (client only). Times are written in UTC (Z) so every calendar app agrees.
import type { Hangout, HangoutSuggestion, Venue } from "@/lib/types";

const CRLF = "\r\n";

/** Escape TEXT values (RFC 5545 §3.3.11). */
export function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** UTC basic format: 20261108T190000Z. */
export function icsDate(iso: string): string {
  return new Date(Date.parse(iso)).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Fold lines longer than 75 octets (RFC 5545 §3.1). */
export function icsFold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let curLen = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    const limit = out.length ? 74 : 75; // continuation lines start with one space
    if (curLen + n > limit) {
      out.push(cur);
      cur = "";
      curLen = 0;
    }
    cur += ch;
    curLen += n;
  }
  out.push(cur);
  return out.join(`${CRLF} `);
}

export interface IcsInput {
  uid: string;
  title: string;
  starts_at: string;
  ends_at: string;
  venue: Pick<Venue, "name" | "address"> | null;
  description?: string;
  url?: string;
  /** DTSTAMP; pass the clock's now (never Date.now during render). */
  stamp: string;
}

export function buildIcs(e: IcsInput): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pods//Hangouts//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}@pods.app`,
    `DTSTAMP:${icsDate(e.stamp)}`,
    `DTSTART:${icsDate(e.starts_at)}`,
    `DTEND:${icsDate(e.ends_at)}`,
    `SUMMARY:${icsEscape(e.title)}`,
    ...(e.venue ? [`LOCATION:${icsEscape(`${e.venue.name}, ${e.venue.address}`)}`] : []),
    ...(e.description ? [`DESCRIPTION:${icsEscape(e.description)}`] : []),
    ...(e.url ? [`URL:${e.url}`] : []),
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(e.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(icsFold).join(CRLF) + CRLF;
}

/** ICS for a locked hangout or an unlocked plan. Rain plan and what to bring go in the description. */
export function icsForPlan(
  target: Hangout | HangoutSuggestion,
  venue: Venue | null,
  stamp: string,
  origin?: string,
): string {
  const isHangout = "plan_text" in target;
  const plan = isHangout ? null : target.plan_json;
  const title = isHangout ? target.title : target.summary;
  const ends = isHangout ? target.ends_at : target.plan_json.ends_at;
  const desc = [plan?.bring.length ? `Bring: ${plan.bring.join(", ")}` : null, plan?.rain_plan ? `Rain: ${plan.rain_plan}` : null, isHangout ? target.plan_text : null]
    .filter(Boolean)
    .join("\n");
  return buildIcs({
    uid: target.id,
    title,
    starts_at: target.starts_at,
    ends_at: ends,
    venue: venue ? { name: venue.short_name ?? venue.name, address: venue.address } : null,
    description: desc || undefined,
    url: origin ? `${origin}/app/pods/${target.pod_id}` : undefined,
    stamp,
  });
}

export function icsFilename(title: string): string {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "hangout"}.ics`;
}

/** Client only: download the file (iOS Safari opens it straight in Calendar). */
export function downloadIcs(ics: string, filename: string): void {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
