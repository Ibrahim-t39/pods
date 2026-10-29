// "Same most weeks" / "Changes week to week": a two-option choice under the week grid.
"use client";

import type { Rhythm } from "@/lib/types";
import "./week-grid.css";

const OPTIONS: { key: Rhythm; label: string }[] = [
  { key: "steady", label: "Same most weeks" },
  { key: "changes", label: "Changes week to week" },
];

export function RhythmChoice({ value, onChange }: { value: Rhythm; onChange: (r: Rhythm) => void }) {
  return (
    <div className="pods-ob-rhythm" role="radiogroup" aria-label="How your week runs">
      {OPTIONS.map((o) => (
        <button key={o.key} type="button" role="radio" aria-checked={value === o.key} onClick={() => onChange(o.key)} className="pods-ob-rhythm-opt pressable">
          {o.label}
        </button>
      ))}
    </div>
  );
}
