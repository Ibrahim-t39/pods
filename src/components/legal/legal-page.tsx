// Legal pages v3 (wireframes L01-L03; V3_SPEC §6.1.4). The back glyph, one bold line, then labelled rows: a label
// and one short line; tapping opens the longer text in place (one open at a time). A row can instead be a link
// ("Write to us" is a mailto). The other two legal pages sit at the foot as quiet links, so no page is a dead end.
// No table of contents, no callouts, no "draft". "safe" is never a title (library I #4).
// Colour (COLOR_LIFE §6.2, §10): the row arrows are the link blue (the plan's colour: "go"); teal is safety only, so
// only /safety gives its rows a teal mark, on the calm `clear` light, never alarming. Red is only the 911 words.
// Laptop: the word holds the left column (520), the rows read in the right (max 640), 96 between (DESIGN §9.6).
"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Line } from "@/components/brand/line";
import { Chrome } from "@/components/shell/chrome";
import { Icon, type IconName } from "@/components/icons";
import { Stage, type StageLight } from "@/components/brand/stage";
import "./legal.css";

export interface LegalRow {
  id: string;
  label: string;
  line: ReactNode;
  more?: ReactNode;
  href?: string;
  /** a teal mark before the label (the safety page) */
  icon?: IconName;
}

const PAGES = [
  { href: "/privacy", label: "Privacy" },
  { href: "/safety", label: "If something's off" },
  { href: "/terms", label: "Terms" },
] as const;

export function LegalPage({
  title,
  rows,
  here,
  light = "paper",
}: {
  title: string;
  rows: LegalRow[];
  here: (typeof PAGES)[number]["href"];
  light?: StageLight;
}) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="legal">
      <Stage light={light} />
      <Chrome left="back" backHref="/" />
      <div className="legal-body">
        <Line size="lg" className="legal-title">
          {title}
        </Line>
        <div>
          <ul className="legal-rows">
            {rows.map((r) => {
              const isOpen = open === r.id;
              const inner = (
                <>
                  {r.icon && (
                    <span className="legal-mark" aria-hidden>
                      <Icon name={r.icon} size={20} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-heading-sm text-ink">{r.label}</span>
                    <span className="block text-body-sm text-ink-2">{r.line}</span>
                  </span>
                  {/* open rows show the close glyph: a rotated arrow (stem over dot) read as "!" (R1 shot) */}
                  {(r.more || r.href) && <Icon name={isOpen ? "close" : "arrow"} size={20} className="legal-glyph" />}
                </>
              );
              return (
                <li key={r.id} id={r.id} data-open={isOpen ? "" : undefined}>
                  {r.href ? (
                    <a href={r.href} className="legal-row pressable">
                      {inner}
                    </a>
                  ) : r.more ? (
                    <button type="button" aria-expanded={isOpen} aria-controls={`${r.id}-more`} onClick={() => setOpen(isOpen ? null : r.id)} className="legal-row pressable">
                      {inner}
                    </button>
                  ) : (
                    <div className="legal-row pressable">{inner}</div>
                  )}
                  {r.more && (
                    <div id={`${r.id}-more`} className="legal-more" hidden={!isOpen}>
                      {r.more}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <nav aria-label="Legal" className="legal-next">
            {PAGES.filter((p) => p.href !== here).map((p) => (
              <Link key={p.href} href={p.href} className="u inline-flex min-h-11 min-w-11 items-center text-label text-ink">
                {p.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
