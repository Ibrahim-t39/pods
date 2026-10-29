// The small parts every Your seat / safety sheet is made of (template.md anatomy D; wireframe kit `.mrow`).
//   SheetRow   56px row, hairline on top, a 24px glyph, a 16px label, optional value on the right
//   RingMark   the choice mark: a blue (--select) disc when on, teal when it is a consent or safety choice, a pod colour in
//              pod lists; a dashed ring when off (never a tick, never a switch; J #7)
//   ChoiceRow  a SheetRow whose glyph is a RingMark (radio or checkbox semantics)
//   SheetFoot  the sheet's last row: a go link on the left, at most one filled primary on the right
//   Apart      risky rows sit apart at the bottom, after an s8 gap
// Spacing is on the 4pt scale only (DESIGN.md §9): row 56, inner s4, between groups s8.
"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { SNAPPY } from "@/components/brand/table-ring";
import { HUE_VAR, type PodHueKey } from "@/components/brand/disc";
import { cn } from "@/lib/cn";

/** a breath of colour under the finger, never grey: teal inside the safety group (trust), blue everywhere else (chosen) */
const HOVER_SAFE = "pressable hover:bg-[color-mix(in_srgb,var(--teal)_6%,transparent)] active:bg-[color-mix(in_srgb,var(--teal)_10%,transparent)]";
const HOVER = "pressable hover:bg-[color-mix(in_srgb,var(--select)_6%,transparent)] active:bg-[color-mix(in_srgb,var(--select)_10%,transparent)]";
const ROW = "flex min-h-14 w-full items-center gap-s4 border-t border-line py-s2 text-left text-[16px] text-ink outline-offset-[-2px]";

export function RingMark({ on, size = 24, hue, safe }: { on: boolean; size?: number; hue?: PodHueKey; safe?: boolean }) {
  return (
    <span aria-hidden className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <span className="absolute inset-0 rounded-full border-[1.5px] border-dashed border-line-2" />
      <motion.span
        className={cn("absolute inset-0 rounded-full", safe ? "bg-teal" : "bg-select")}
        style={hue ? { background: HUE_VAR[hue] } : undefined}
        initial={false}
        animate={{ scale: on ? 1 : 0.2, opacity: on ? 1 : 0 }}
        transition={SNAPPY}
      />
    </span>
  );
}

/** Row tones (COLOR_LIFE §6.2): "safe" = ink with a teal glyph, the safety and privacy group (default);
 *  "quiet" = ink with an ink-2 glyph and a blue breath (sign out, delete); "danger" = red text, only Call 911. */
type RowTone = "safe" | "quiet" | "danger";
type RowBase = { icon?: IconName; label: ReactNode; value?: ReactNode; arrow?: boolean; className?: string; tone?: RowTone };

/** A tappable row: a link (href), an outside link (external) or a button (onClick). */
export function SheetRow({ icon, label, value, arrow, className, href, external, onClick, tone = "safe", disabled }: RowBase & { href?: string; external?: boolean; onClick?: () => void; disabled?: boolean }) {
  const body = (
    <>
      {icon && <Icon name={icon} size={24} className={cn("shrink-0", tone === "danger" ? "text-danger-text" : tone === "quiet" ? "text-ink-2" : "text-safe")} />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {value != null && <span className="shrink-0 text-label text-ink-2">{value}</span>}
      {arrow && <Icon name="arrow" size={16} stroke={2} className="shrink-0 text-ink-2" />}
    </>
  );
  const cls = cn(ROW, tone === "quiet" ? HOVER : HOVER_SAFE, tone === "danger" && "font-medium text-danger-text", className);
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
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cn(cls, "disabled:pointer-events-none disabled:[&>span:first-of-type]:text-ink-2")}>
      {body}
    </button>
  );
}

/** A choice row: RingMark + label. `radio` for one-of, otherwise a checkbox. `safe` = a consent or safety choice (teal). */
export function ChoiceRow({ on, label, onToggle, radio, disabled, hue, safe }: { on: boolean; label: ReactNode; onToggle: () => void; radio?: boolean; disabled?: boolean; hue?: PodHueKey; safe?: boolean }) {
  return (
    <button
      type="button"
      role={radio ? "radio" : "checkbox"}
      aria-checked={on}
      disabled={disabled}
      onClick={onToggle}
      className={cn(ROW, safe ? HOVER_SAFE : HOVER, "disabled:opacity-50")}
    >
      <RingMark on={on} hue={hue} safe={safe} />
      <span className="min-w-0 flex-1">{label}</span>
    </button>
  );
}

/** Rows end on a hairline. */
export function Rows({ children, label, radio, className }: { children: ReactNode; label?: string; radio?: boolean; className?: string }) {
  return (
    <div role={radio ? "radiogroup" : label ? "group" : undefined} aria-label={label} className={cn("border-b border-line", className)}>
      {children}
    </div>
  );
}

/** Risky rows (delete, block) sit apart, after an s8 gap. */
export function Apart({ children }: { children: ReactNode }) {
  return <div className="mt-s8">{children}</div>;
}

/** One line under a sheet title (14px, ink-2). */
export function SheetLine({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-label font-medium text-ink-2", className)}>{children}</p>;
}

/** The sheet's foot: a go link left, the one primary right. Pass either side alone. */
export function SheetFoot({ left, right, className }: { left?: ReactNode; right?: ReactNode; className?: string }) {
  return <div className={cn("flex w-full items-center justify-between gap-s4", className)}>{left ?? <span />}{right}</div>;
}

/** The go kind: an underlined text action, 44px tall (DESIGN.md §8). */
export function GoLink({ children, onClick, href, className }: { children: ReactNode; onClick?: () => void; href?: string; className?: string }) {
  const cls = cn("inline-flex min-h-11 min-w-11 items-center text-[16px] font-semibold text-ink underline decoration-select/40 decoration-[1.5px] underline-offset-[5px] outline-offset-2 hover:decoration-current", className);
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

/**
 * The page's h1 while a sheet covers it. A modal sheet hides the page (aria-hidden), so a route that opens on a sheet
 * (the /app/settings/* redirects, a person) still needs one heading a screen reader lands on: the page's name.
 */
export function PageName({ children }: { children: ReactNode }) {
  return <h1 className="sr-only">{children}</h1>;
}

/** A pill field (56px, the report note's grammar): a visible short label above, never a placeholder-only field. */
export function PillField({
  label,
  value,
  onChange,
  inputMode,
  autoComplete,
  maxLength,
  error,
  autoFocus,
  type,
  max,
}: {
  type?: "text" | "date";
  max?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "text" | "tel";
  autoComplete?: string;
  maxLength?: number;
  error?: string | null;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-label font-medium text-ink-2">{label}</span>
      <input
        type={type}
        max={max}
        value={value}
        maxLength={maxLength}
        inputMode={inputMode}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "mt-s2 h-14 w-full rounded-[28px] bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] px-gutter text-[16px] text-ink outline-offset-2",
          error && "ring-2 ring-danger-text",
        )}
      />
      {error && (
        <span role="alert" className="mt-s2 block text-label font-medium text-danger-text">
          {error}
        </span>
      )}
    </label>
  );
}

/** A group's quiet label (12px overline), the only heading inside a content page's row groups. */
export function GroupLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mb-s2 text-overline font-medium text-ink-2", className)}>{children}</p>;
}

/**
 * An editable field (Your seat): a quiet label over the value, an edit mark on the right, so it reads as a control.
 *   label 13px ink-2 · value 20px 500 ink · edit glyph 20px · 72px min · the whole row is the tap target.
 */
export function FieldRow({ label, value, lead, onClick, expanded }: { label: string; value: ReactNode; lead?: ReactNode; onClick: () => void; expanded?: boolean }) {
  return (
    <button type="button" aria-haspopup="dialog" aria-expanded={expanded} onClick={onClick} className={cn("seat-field", HOVER)}>
      {lead}
      <span className="min-w-0 flex-1">
        <span className="seat-field-label">{label}</span>
        <span className="seat-field-value">{value}</span>
      </span>
      <span className="seat-field-edit">
        <Icon name="edit" size={20} />
        <span className="sr-only">Edit {label}</span>
      </span>
    </button>
  );
}
