// [U1] Input (52px), with optional Field chrome (label / helper / error / counter) and leading / trailing slots.
"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Field, controlClass } from "./field";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: ReactNode;
  helper?: ReactNode;
  error?: ReactNode;
  success?: ReactNode;
  optional?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Show the counter (from 80% of maxLength). */
  counter?: boolean;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helper, error, success, optional, leading, trailing, counter, wrapperClassName, className, id, maxLength, value, ...rest },
  ref,
) {
  const count = typeof value === "string" ? value.length : undefined;
  return (
    <Field
      id={id}
      label={label}
      helper={helper}
      error={error}
      success={success}
      optional={optional}
      count={counter ? count : undefined}
      max={counter ? maxLength : undefined}
      className={wrapperClassName}
    >
      {({ id, describedBy, invalid }) => (
        <div className="relative flex items-center">
          {leading && <span className="pointer-events-none absolute left-4 flex text-fg-subtle [&_svg]:size-5">{leading}</span>}
          <input
            ref={ref}
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            maxLength={maxLength}
            value={value}
            className={cn(
              controlClass,
              "h-[52px]",
              leading && "pl-12",
              trailing && "pr-12",
              success && !invalid && "border-success-border",
              className,
            )}
            {...rest}
          />
          {trailing && <span className="absolute right-2 flex items-center">{trailing}</span>}
        </div>
      )}
    </Field>
  );
});
