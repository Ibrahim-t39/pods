// [U1] Textarea with Field chrome and auto-grow (field-sizing: content where supported).
"use client";

import { forwardRef, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Field, controlClass } from "./field";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  helper?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  counter?: boolean;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, helper, error, optional, counter, wrapperClassName, className, id, maxLength, value, rows = 3, ...rest },
  ref,
) {
  const count = typeof value === "string" ? value.length : undefined;
  return (
    <Field id={id} label={label} helper={helper} error={error} optional={optional} count={counter ? count : undefined} max={counter ? maxLength : undefined} className={wrapperClassName}>
      {({ id, describedBy, invalid }) => (
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          maxLength={maxLength}
          value={value}
          className={cn(controlClass, "min-h-[104px] resize-none py-3.5 leading-normal [field-sizing:content]", className)}
          {...rest}
        />
      )}
    </Field>
  );
});
