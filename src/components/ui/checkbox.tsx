// [U1] Checkbox (Radix) with label + description. Consent checkboxes are unticked by default (BLUEPRINT §3.1).
"use client";

import { forwardRef, useId, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { Checkbox as RCheckbox } from "radix-ui";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";

export interface CheckboxProps extends ComponentPropsWithoutRef<typeof RCheckbox.Root> {
  label?: ReactNode;
  description?: ReactNode;
}

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox({ label, description, className, id, ...rest }, ref) {
  const auto = useId();
  const cid = id ?? auto;
  const box = (
    <RCheckbox.Root
      ref={ref}
      id={cid}
      aria-describedby={description ? `${cid}-d` : undefined}
      className={cn(
        "peer relative grid size-[22px] shrink-0 place-items-center rounded-[7px] border-[1.5px] border-border-strong bg-surface outline-offset-2",
        "transition-[background-color,border-color,box-shadow] duration-fast ease-standard hover:border-fg-subtle",
        "data-[state=checked]:border-transparent data-[state=checked]:bg-signal-gloss data-[state=checked]:text-on-primary data-[state=checked]:shadow-[var(--shadow-inset-gloss)]",
        "data-[state=indeterminate]:border-transparent data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-on-primary",
        "disabled:cursor-not-allowed disabled:opacity-45",
        "after:absolute after:-inset-3 after:content-['']",
        !label && className,
      )}
      {...rest}
    >
      <RCheckbox.Indicator className="animate-fade-in">
        {rest.checked === "indeterminate" ? <span className="block h-0.5 w-2.5 rounded-full bg-current" /> : <span className="block size-2 rounded-full bg-current" />}
      </RCheckbox.Indicator>
    </RCheckbox.Root>
  );
  if (!label) return box;
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <div className="pt-0.5">{box}</div>
      <div className="flex flex-col gap-0.5">
        <label htmlFor={cid} className="cursor-pointer text-body text-fg peer-disabled:cursor-not-allowed">
          {label}
        </label>
        {description && (
          <p id={`${cid}-d`} className="text-body-sm text-fg-muted">
            {description}
          </p>
        )}
      </div>
    </div>
  );
});
