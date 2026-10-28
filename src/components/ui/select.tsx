// [U1] Select: native <select> (best on mobile) styled as a 52px field with a chevron.
"use client";

import { forwardRef, type ReactNode, type SelectHTMLAttributes } from "react";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { Field, controlClass } from "./field";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  helper?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
  wrapperClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, helper, error, optional, options, placeholder, wrapperClassName, className, id, ...rest },
  ref,
) {
  return (
    <Field id={id} label={label} helper={helper} error={error} optional={optional} className={wrapperClassName}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <select
            ref={ref}
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn(controlClass, "h-[52px] appearance-none pr-11", className)}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))}
          </select>
          <Icon name="arrow" size={18} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 rotate-90 text-ink-2" />
        </div>
      )}
    </Field>
  );
});
