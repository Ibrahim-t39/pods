// [U1] RadioCard / RadioCardGroup (single choice, Radix RadioGroup) and SelectCard (multi, checkbox semantics).
// 72-96px card: icon tile, title, sub, check. Selected = pod-soft wash + pod border + filled check.
// Used for availability days, ID type, report reasons.
"use client";

import { type ComponentPropsWithoutRef, type ReactNode } from "react";
import { RadioGroup } from "radix-ui";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";

const cardBase = cn(
  "pressable group relative flex w-full items-center gap-3.5 rounded-lg border bg-surface p-4 text-left outline-offset-2",
  "transition-[background-color,border-color,box-shadow] duration-fast ease-standard",
  "border-border shadow-xs hover:border-border-strong hover:shadow-sm",
  "data-[state=checked]:border-pod data-[state=checked]:bg-pod-soft data-[state=checked]:shadow-[0_0_0_1px_var(--pod)]",
  "aria-checked:border-pod aria-checked:bg-pod-soft aria-checked:shadow-[0_0_0_1px_var(--pod)]",
  "disabled:cursor-not-allowed disabled:opacity-45",
);

function CardBody({ icon, title, description, trailing, checked, round }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; trailing?: ReactNode; checked: boolean; round: boolean }) {
  return (
    <>
      {icon && (
        <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-sunken text-fg-muted transition-colors duration-fast group-data-[state=checked]:bg-surface group-data-[state=checked]:text-pod-text group-aria-checked:bg-surface group-aria-checked:text-pod-text [&_svg]:size-[22px]">
          {icon}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-heading-sm text-fg">{title}</span>
        {description && <span className="text-body-sm text-fg-muted">{description}</span>}
      </span>
      {trailing}
      <span
        aria-hidden
        className={cn(
          "grid size-6 shrink-0 place-items-center border-[1.5px] transition-colors duration-fast",
          round ? "rounded-full" : "rounded-[7px]",
          checked ? "border-transparent bg-pod-gloss text-pod-on shadow-[var(--shadow-inset-gloss)]" : "border-border-strong bg-surface",
        )}
      >
        <AnimatePresence initial={false}>
          {checked && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
              <span className="block size-2 rounded-full bg-current" />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </>
  );
}

export function RadioCardGroup({ className, ...rest }: ComponentPropsWithoutRef<typeof RadioGroup.Root>) {
  return <RadioGroup.Root className={cn("flex flex-col gap-2.5", className)} {...rest} />;
}

export interface RadioCardProps extends Omit<ComponentPropsWithoutRef<typeof RadioGroup.Item>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  trailing?: ReactNode;
  /** Pass the group value so the check can animate (Radix doesn't expose checked to children). */
  checked?: boolean;
}

export function RadioCard({ title, description, icon, trailing, checked = false, className, ...rest }: RadioCardProps) {
  return (
    <RadioGroup.Item className={cn(cardBase, className)} {...rest}>
      <CardBody icon={icon} title={title} description={description} trailing={trailing} checked={checked} round />
    </RadioGroup.Item>
  );
}

export interface SelectCardProps extends Omit<ComponentPropsWithoutRef<"button">, "title" | "onChange"> {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  /** Revealed under the card when checked (e.g. Morning / Afternoon / Evening sub-chips). */
  expanded?: ReactNode;
}

export function SelectCard({ title, description, icon, checked, onCheckedChange, expanded, className, ...rest }: SelectCardProps) {
  return (
    <div className={cn("rounded-lg transition-colors", className)}>
      <button type="button" role="checkbox" aria-checked={checked} onClick={() => onCheckedChange(!checked)} className={cardBase} {...rest}>
        <CardBody icon={icon} title={title} description={description} checked={checked} round={false} />
      </button>
      <AnimatePresence initial={false}>
        {checked && expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 170, damping: 26 }}
            className="overflow-hidden"
          >
            <div className="px-1 pt-3 pb-1">{expanded}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
