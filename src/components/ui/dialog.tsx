// Dialog (v3): a centred lit-paper card on every viewport (for the rare case a bottom sheet is wrong on mobile,
// e.g. the Director panel). Prefer ResponsiveSheet for everything member-facing.
"use client";

import "./ui.css";
import type { ReactNode } from "react";
import { Dialog as RDialog } from "radix-ui";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, trigger, title, description, children, footer, className }: DialogProps) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RDialog.Trigger asChild>{trigger}</RDialog.Trigger>}
      <RDialog.Portal>
        <RDialog.Overlay className="pods-scrim fixed inset-0 z-overlay" />
        <RDialog.Content
          className={cn(
            "pods-dialog fixed top-1/2 left-1/2 z-sheet flex max-h-[calc(100dvh-48px)] w-[min(480px,calc(100vw-32px))] flex-col rounded-[28px] bg-lit text-ink shadow-lg outline-none",
            className,
          )}
        >
          <div className="flex items-start gap-4 px-6 pt-6">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <RDialog.Title className="line text-heading-lg">{title}</RDialog.Title>
              {description ? <RDialog.Description className="text-body text-ink-2">{description}</RDialog.Description> : <RDialog.Description className="sr-only">Dialog</RDialog.Description>}
            </div>
            <RDialog.Close aria-label="Close" className="pressable -mt-1.5 -mr-2 grid size-11 place-items-center rounded-full text-ink">
              <Icon name="close" />
            </RDialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6">{children}</div>
          {footer && <div className="flex items-center justify-end gap-s4 px-6 pb-6">{footer}</div>}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

export const DialogClose = RDialog.Close;
