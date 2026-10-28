// Help rows (wireframe S11): call lines as plain rows, the way the Help sheet and the day's help glyph show them.
// Pods can't respond to emergencies, so 911 comes first and is always one tap.
"use client";

import { SheetRow } from "@/components/profile/kit";

export const EMERGENCY_LINE = "In danger now? Call 911";
export const WRITE_TO_US = "mailto:help@pods.example";

export function HelpLines() {
  return (
    <>
      <SheetRow icon="help" tone="danger" label="Call 911" href="tel:911" external />
      <SheetRow icon="talk" label="Call or text 988" href="tel:988" external />
    </>
  );
}
