// [U1] Field: label above, control, helper / error below, counter on the right (shows from 80% of the limit).
// Wires aria-describedby / aria-invalid for the child control via render prop ids.
"use client";

import { useId, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";

export interface FieldIds {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
}

export interface FieldProps {
  label?: ReactNode;
  helper?: ReactNode;
  error?: ReactNode;
  success?: ReactNode;
  count?: number;
  max?: number;
  optional?: boolean;
  className?: string;
  id?: string;
  children: (ids: FieldIds) => ReactNode;
}

export function Field({ label, helper, error, success, count, max, optional, className, id: idProp, children }: FieldProps) {
  const auto = useId();
  const id = idProp ?? auto;
  const helpId = `${id}-help`;
  const showCount = max != null && count != null && count >= max * 0.8;
  const hasHelp = !!(error || success || helper);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="flex items-baseline justify-between text-label text-fg">
          <span>{label}</span>
          {optional && <span className="text-caption text-fg-subtle">Optional</span>}
        </label>
      )}
      {children({ id, describedBy: hasHelp ? helpId : undefined, invalid: !!error })}
      {(hasHelp || showCount) && (
        <div className="flex items-start justify-between gap-3 px-1">
          <p
            id={helpId}
            aria-live={error ? "polite" : undefined}
            className={cn(
              "flex items-center gap-1.5 text-caption",
              error ? "text-danger-text" : success ? "text-success-text" : "text-fg-muted",
            )}
          >
            {error ? <Icon name="flag" size={16} /> : success ? <Icon name="check" size={16} /> : null}
            {error || success || helper}
          </p>
          {showCount && (
            <span className={cn("tabular text-caption", count! > max! ? "text-danger-text" : "text-fg-subtle")}>
              {count}/{max}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Shared control chrome: 52px field, radius 14, border → focus ring, error, success, disabled. */
export const controlClass = cn(
  "w-full rounded-input border border-border bg-surface px-4 text-body text-fg shadow-xs",
  "placeholder:text-fg-subtle",
  "transition-[border-color,box-shadow] duration-fast ease-standard",
  "hover:border-border-strong",
  "focus-visible:outline-none focus-visible:border-focus-ring focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-focus-ring)_22%,transparent)]",
  "aria-invalid:border-danger aria-invalid:focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-danger)_20%,transparent)]",
  "disabled:cursor-not-allowed disabled:bg-sunken disabled:text-fg-subtle disabled:shadow-none",
);
