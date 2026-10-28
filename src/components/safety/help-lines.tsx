// Help rows (wireframe S11): call lines as plain rows, the way the Help sheet and the day's help glyph show them.
// Pods can't respond to emergencies, so 911 comes first and is always one tap.
"use client";

import { SheetRow } from "@/components/profile/kit";
import { Icon } from "@/components/icons";

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

/** The two emergency lines as one card of large controls (QA r1): 911 is the only red a member sees. */
export function EmergencyCard() {
  return (
    <div className="safe-sos" role="group" aria-label="Emergency">
      <a href="tel:911" className="safe-sos-btn pressable" data-tone="red">
        <Icon name="help" size={24} />
        Call 911
      </a>
      <a href="tel:988" className="safe-sos-btn pressable">
        <Icon name="talk" size={24} />
        Call or text 988
      </a>
    </div>
  );
}
