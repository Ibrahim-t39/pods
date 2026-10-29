// The You pages (profile, edit, settings, mode, safety, invite) share one compact anatomy (redesign r2):
//   head     phone: the chrome row (mark) or an inline back; a 28px title (32 on laptop), one quiet line, actions right
//   cards    white rounded groups on paper (inset-grouped, Delphi/iOS): an overline label above, rows inside
//   grid     laptop: two columns (yo-cols), phone: one stack
// Spacing on the 4pt scale: s6 between sections, rows 56 min, card padding 16.
"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Chrome } from "@/components/shell/chrome";
import { Stage } from "@/components/brand/stage";
import { cn } from "@/lib/cn";
import "./you.css";

export function YouPage({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div className={cn("yo-pg", className)} aria-label={label}>
      <Stage light="paper" />
      {children}
    </div>
  );
}

/** Compact page head. `back` puts a back glyph inline before the title (sub-pages); otherwise the phone shows the mark row. */
export function YouHead({ title, sub, back, backLabel = "Back", actions }: { title: ReactNode; sub?: ReactNode; back?: string; backLabel?: string; actions?: ReactNode }) {
  return (
    <>
      {!back && <Chrome left="mark" className="lg:hidden" />}
      <header className={cn("yo-wrap yo-head", back && "yo-head-back")}>
        <div className="flex min-w-0 items-center gap-s2">
          {back && (
            <Link href={back} aria-label={backLabel} className="yo-back pressable">
              <Icon name="back" size={22} />
            </Link>
          )}
          <div className="min-w-0">
            <h1 className="yo-title">{title}</h1>
            {sub && <p className="yo-sub">{sub}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-s2">{actions}</div>}
      </header>
    </>
  );
}

/** A labelled section: overline left, an optional action right, then its content. */
export function Section({ label, action, children, className, id }: { label?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section className={cn("yo-sec", className)} aria-labelledby={id}>
      {(label || action) && (
        <div className="yo-sec-head">
          {label && (
            <h2 id={id} className="yo-sec-label">
              {label}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Card({ children, className, tone }: { children: ReactNode; className?: string; tone?: "safe" | "danger" }) {
  return (
    <div className={cn("yo-card", className)} data-tone={tone}>
      {children}
    </div>
  );
}

type RowProps = {
  icon?: IconName;
  lead?: ReactNode;
  label: ReactNode;
  hint?: ReactNode;
  value?: ReactNode;
  arrow?: boolean;
  tone?: "safe" | "danger" | "quiet";
  href?: string;
  external?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  trailing?: ReactNode;
  className?: string;
};

/** A row inside a Card: glyph or lead, label (+ one hint line), value right, chevron. Link, outside link, button or static. */
export function Row({ icon, lead, label, hint, value, arrow, tone, href, external, onClick, disabled, trailing, className }: RowProps) {
  const body = (
    <>
      {lead ?? (icon && <span className="yo-row-ic" data-tone={tone}><Icon name={icon} size={20} /></span>)}
      <span className="min-w-0 flex-1">
        <span className="yo-row-label">{label}</span>
        {hint && <span className="yo-row-hint">{hint}</span>}
      </span>
      {value != null && <span className="yo-row-value">{value}</span>}
      {trailing}
      {arrow && <Icon name="arrow" size={16} stroke={2} className="shrink-0 text-ink-2" />}
    </>
  );
  const cls = cn("yo-row", (href || onClick) && !disabled && "yo-row-tap pressable", tone === "danger" && "yo-row-danger", className);
  if (href && external)
    return (
      <a href={href} className={cls}>
        {body}
      </a>
    );
  if (href)
    return (
      <Link href={href} className={cls}>
        {body}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={cn(cls, "disabled:opacity-60")}>
        {body}
      </button>
    );
  return <div className={cls}>{body}</div>;
}

/** A small text action that sits in a section head or a card ("Edit", "Add"). 44px tall target. */
export function TextAction({ children, href, onClick, className }: { children: ReactNode; href?: string; onClick?: () => void; className?: string }) {
  const cls = cn("yo-act pressable", className);
  if (href)
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
