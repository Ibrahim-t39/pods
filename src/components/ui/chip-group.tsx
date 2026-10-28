// [U1] ChipGroup: a wrapping set of Chips. multiple → role=group of checkboxes; single → radiogroup with arrows.
// `max` caps multiple selection: extra taps call onLimit (show "Pick up to 5", shake the group, M22).
"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Chip } from "./chip";

export interface ChipOption {
  value: string;
  label: ReactNode;
  emoji?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
}

interface Base {
  options: ChipOption[];
  label: string;
  className?: string;
  size?: "md" | "sm";
}
export type ChipGroupProps = Base &
  (
    | { multiple: true; value: string[]; onChange: (v: string[]) => void; max?: number; onLimit?: () => void }
    | { multiple?: false; value: string | null; onChange: (v: string) => void; max?: never; onLimit?: never }
  );

export function ChipGroup(props: ChipGroupProps) {
  const { options, label, className, size } = props;
  const [shake, setShake] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  if (props.multiple) {
    const { value, onChange, max, onLimit } = props;
    const full = max != null && value.length >= max;
    return (
      <div role="group" aria-label={label} key={shake} className={cn("flex flex-wrap gap-2", shake > 0 && "animate-shake motion-reduce:animate-none", className)}>
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <Chip
              key={o.value}
              size={size}
              selected={on}
              emoji={o.emoji}
              icon={o.icon}
              badge={o.badge}
              disabled={o.disabled}
              dim={full && !on}
              onSelectedChange={(next) => {
                if (next && full) {
                  setShake((s) => s + 1);
                  onLimit?.();
                  return;
                }
                onChange(next ? [...value, o.value] : value.filter((v) => v !== o.value));
              }}
            >
              {o.label}
            </Chip>
          );
        })}
      </div>
    );
  }

  const { value, onChange } = props;
  const enabled = options.filter((o) => !o.disabled);
  const onKey = (e: KeyboardEvent, i: number) => {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const idx = enabled.findIndex((o) => o.value === options[i].value);
    const next = enabled[(idx + dir + enabled.length) % enabled.length];
    onChange(next.value);
    refs.current[options.indexOf(next)]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((o, i) => {
        const on = value === o.value;
        const tabbable = on || (value == null && i === 0);
        return (
          <Chip
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            kind="radio"
            size={size}
            selected={on}
            emoji={o.emoji}
            icon={o.icon}
            disabled={o.disabled}
            tabIndex={tabbable ? 0 : -1}
            onKeyDown={(e) => onKey(e, i)}
            onSelectedChange={() => onChange(o.value)}
          >
            {o.label}
          </Chip>
        );
      })}
    </div>
  );
}
