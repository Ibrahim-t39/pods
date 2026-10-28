// Privacy and terms (V3_SPEC §6.5, wireframe L01 grammar): labelled rows inside Settings → Privacy and terms.
// The one factual AI disclosure sits under the rows (founder item 7, Apple 5.1.2(i)): the model is named here only.
// Download my data and Delete stay in the app (Apple 5.1.1(v)). "Hide community names" sets both discreet switches
// (texts and inbox, and inside the app) from the device prefs (BLUEPRINT D10). The full text lives on /privacy.
"use client";

import { useDevicePrefs } from "@/lib/notifications/prefs";
import { ChoiceRow, Rows, SheetLine, SheetRow } from "@/components/profile/kit";
import { DownloadData } from "./download-data";

export function PrivacyCenter() {
  const { prefs, set } = useDevicePrefs();
  const hidden = prefs.discreet && prefs.maskInApp;
  return (
    <>
    <Rows label="Privacy and terms">
      <ChoiceRow
        safe
        on={hidden}
        label="Hide community names"
        onToggle={() => {
          set("discreet", !hidden);
          set("maskInApp", !hidden);
        }}
      />
      <DownloadData />
      <SheetRow icon="why" label="Privacy" href="/privacy" arrow />
      <SheetRow icon="flag" label="Terms" href="/terms" arrow />
    </Rows>
    <SheetLine className="mt-s4">The AI is Claude, by Anthropic. Plans send only free times and an activity.</SheetLine>
    </>
  );
}
