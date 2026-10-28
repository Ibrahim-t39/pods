// [U1] AlertDialog: title, body, Cancel (focused by default) + confirm. Destructive confirms are never the
// default focus (BLUEPRINT §3.1). Centred on every viewport; buttons stack full-width on mobile.
"use client";

import "./ui.css";
import type { ReactNode } from "react";
import { AlertDialog as RAlert } from "radix-ui";
import { cn } from "@/lib/cn";
import { buttonVariants } from "./button";
import { Spinner } from "./spinner";

export interface AlertDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function AlertDialog({ open, onOpenChange, trigger, title, description, icon, confirmLabel, cancelLabel = "Cancel", destructive, loading, onConfirm }: AlertDialogProps) {
  return (
    <RAlert.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RAlert.Trigger asChild>{trigger}</RAlert.Trigger>}
      <RAlert.Portal>
        <RAlert.Overlay className="pods-scrim fixed inset-0 z-overlay" />
        <RAlert.Content className="pods-dialog fixed top-1/2 left-1/2 z-sheet w-[min(400px,calc(100vw-32px))] rounded-xl border border-border bg-raised p-6 text-fg shadow-lg outline-none">
          {icon && (
            <div className={cn("mb-4 grid size-12 place-items-center rounded-[14px] [&_svg]:size-6", destructive ? "bg-danger-soft text-danger-text" : "bg-primary-soft text-primary-soft-text")}>{icon}</div>
          )}
          <RAlert.Title className="font-display text-[21px] leading-tight font-extrabold tracking-[-0.015em] [font-stretch:112%]">{title}</RAlert.Title>
          {description && <RAlert.Description className="mt-2 text-body text-fg-muted">{description}</RAlert.Description>}
          <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <RAlert.Cancel className={buttonVariants({ variant: "secondary", size: "lg", className: "sm:h-11" })}>{cancelLabel}</RAlert.Cancel>
            <RAlert.Action
              className={buttonVariants({ variant: destructive ? "danger" : "primary", size: "lg", className: "sm:h-11" })}
              onClick={(e) => {
                const r = onConfirm();
                if (r instanceof Promise) e.preventDefault();
              }}
              disabled={loading}
            >
              {loading && <Spinner />}
              {confirmLabel}
            </RAlert.Action>
          </div>
        </RAlert.Content>
      </RAlert.Portal>
    </RAlert.Root>
  );
}
