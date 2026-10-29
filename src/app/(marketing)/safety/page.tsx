// L02 "If something's off" (never "safe" as a title, library I #4). Labelled rows (wireframes L02).
// Calm `clear` light, teal row marks, red only on the 911 words (COLOR_LIFE §8).
import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { CONTACT } from "@/components/legal/contact";

export const metadata: Metadata = { title: "If something's off", description: "What to do at a hangout, and how to reach us." };

export default function SafetyPage() {
  return (
    <LegalPage
      here="/safety"
      title="If something's off"
      light="clear"
      rows={[
        {
          id: "hangout",
          icon: "here",
          label: "At a hangout",
          line: "Leave. Then tell us.",
          more: <p>You never need a reason to leave. If you are in danger, <span className="legal-911">call 911</span> first. Then report it from the pod&apos;s menu.</p>,
        },
        {
          id: "anyone",
          icon: "block",
          label: "Anyone",
          line: "Report or block from Talk.",
          more: <p>Tap a person in Talk to report or block them. They are not told who reported them.</p>,
        },
        {
          id: "places",
          icon: "place",
          label: "Places",
          line: "Public, daytime, no alcohol.",
          more: <p>Every plan uses a public place from a checked list, in daylight hours, with no alcohol.</p>,
        },
        // no inbox yet: this page is the help page, so the row would only link to itself (src/components/legal/contact.ts)
        ...(CONTACT.ready ? [{ id: "write", icon: "send" as const, label: CONTACT.label, line: CONTACT.line, href: CONTACT.href }] : []),
      ]}
    />
  );
}
