// The Community pods picker (B03s), one for first run and Edit profile. Two fields of words, one pick each, tap
// again to clear. Opening a region or a religion steps the others aside for its own list, so the field never
// becomes a mixed flat wall. Chosen = --select, like every chosen thing in first run (COLOR_LIFE §13 beat 1).
"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { REGIONS, RELIGIONS, countriesOf, denominationsOf, regionOf, religionOf } from "./community";
import "./onboarding.css";

export function CommunityFields({
  heritage,
  faith,
  onHeritage,
  onFaith,
}: {
  heritage: string | null;
  faith: string | null;
  onHeritage: (code: string | null) => void;
  onFaith: (code: string | null) => void;
}) {
  const region = regionOf(heritage);
  const religion = religionOf(faith);
  const countries = countriesOf(region);
  const denoms = denominationsOf(religion);
  return (
    <div className="flex flex-col gap-s8">
      <Field label="From">
        {(region ? REGIONS.filter((r) => r.code === region) : REGIONS).map((r) => (
          <Chip key={r.code} on={heritage === r.code} near={region === r.code && heritage !== r.code} onClick={() => onHeritage(heritage === r.code || region === r.code ? null : r.code)}>
            {r.label}
          </Chip>
        ))}
        {countries.map((c, k) => (
          <Chip key={c.code} on={heritage === c.code} onClick={() => onHeritage(heritage === c.code ? region : c.code)} delay={k * 0.03}>
            {c.label}
          </Chip>
        ))}
      </Field>
      <Field label="Faith">
        {(religion && denoms.length ? RELIGIONS.filter((r) => r.code === religion) : RELIGIONS).map((r) => (
          <Chip key={r.code} on={faith === r.code} near={religion === r.code && faith !== r.code} onClick={() => onFaith(faith === r.code || religion === r.code ? null : r.code)}>
            {r.label}
          </Chip>
        ))}
        {denoms.map((d, k) => (
          <Chip key={d.code} on={faith === d.code} onClick={() => onFaith(faith === d.code ? religion : d.code)} delay={k * 0.03}>
            {d.label}
          </Chip>
        ))}
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <p className="mb-s3 text-label text-ink-2">{label}</p>
      <div className="flex flex-wrap gap-s2">{children}</div>
    </div>
  );
}

function Chip({ on, near, onClick, delay = 0, children }: { on: boolean; near?: boolean; onClick: () => void; delay?: number; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      layout={reduce ? false : "position"}
      type="button"
      aria-pressed={on}
      onClick={onClick}
      data-near={near ? "" : undefined}
      className="pods-ob-like pressable"
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 32, delay }}
    >
      {on && <span aria-hidden className="pods-ob-like-dot pods-pop-in" />}
      {children}
    </motion.button>
  );
}
