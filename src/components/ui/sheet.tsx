// ResponsiveSheet v3 (DESIGN.md §9 popups; wireframes kit `.sheet` / `.dsheet`). The only popup in Pods.
//   finish  glass (COLOR_LIFE §12.4): translucent white over the light, blurred, crisp 1px edge; solid where unsupported.
//   phone   a sheet from the bottom: grab 36x4, top radius 28, padding 12/20/32, serif title (32px) with the
//           close glyph top-right; swipe down closes. Three heights only: peek (one line + action), half (a short
//           list), full (Talk). Scrim is ink at 28%, no blur.
//   laptop  a margin card at the right edge (480px, 24px from the top and right, radius 28, padding 40), so the
//           page's object stays visible beside it (TS 2, 7, 12: captions in margins).
// Never more than one sheet deep: a sheet opened from a sheet replaces it. Focus trap, Esc, focus return.
"use client";

import "./ui.css";
import { createContext, useContext, type ReactNode } from "react";
import { Drawer } from "vaul";
import { Dialog, Slot } from "radix-ui";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { useIsDesktop } from "./use-media-query";

export interface ResponsiveSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  hideTitle?: boolean;
  children?: ReactNode;
  /** Sticky action area (buttons). */
  footer?: ReactNode;
  /** Desktop rendering. */
  variant?: "dialog" | "drawer";
  /** Desktop dialog width. */
  size?: "sm" | "md" | "lg";
  /** Mobile snap points, e.g. [0.5, 0.92]. Omit for content height. */
  snapPoints?: (number | string)[];
  /** Leading visual above the title (icon tile, illustration). */
  media?: ReactNode;
  className?: string;
  /** Prevent closing on scrim tap / drag (e.g. mid-submit). */
  dismissible?: boolean;
}

const W = { sm: "w-[min(440px,calc(100vw-48px))]", md: "w-[min(480px,calc(100vw-48px))]", lg: "w-[min(560px,calc(100vw-48px))]" };

const CloseCtx = createContext<() => void>(() => {});

export function ResponsiveSheet(props: ResponsiveSheetProps) {
  const desktop = useIsDesktop();
  return (
    <CloseCtx.Provider value={() => props.onOpenChange(false)}>
      {desktop ? <DesktopSheet {...props} /> : <MobileSheet {...props} />}
    </CloseCtx.Provider>
  );
}

function Header({ title, description, hideTitle, media, T, D }: Pick<ResponsiveSheetProps, "title" | "description" | "hideTitle" | "media"> & { T: typeof Dialog.Title; D: typeof Dialog.Description }) {
  return (
    <div className={cn("flex flex-col gap-1.5", hideTitle && "sr-only")}>
      {media && <div className="mb-2">{media}</div>}
      <T className="line text-heading-lg text-ink">{title}</T>
      {description ? <D className="text-body text-ink-2">{description}</D> : <D className="sr-only">{typeof title === "string" ? title : "Dialog"}</D>}
    </div>
  );
}

function CloseGlyph({ C }: { C: typeof Dialog.Close }) {
  return (
    <C aria-label="Close" className="pressable -mt-1 -mr-3 grid size-11 shrink-0 place-items-center rounded-full text-ink outline-offset-0 hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]">
      <Icon name="close" />
    </C>
  );
}

function MobileSheet({ open, onOpenChange, title, description, hideTitle, children, footer, snapPoints, media, className, dismissible = true }: ResponsiveSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} snapPoints={snapPoints} dismissible={dismissible} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="pods-scrim fixed inset-0 z-overlay" />
        <Drawer.Content
          className={cn(
            "glass fixed inset-x-0 bottom-0 z-sheet flex max-h-[92dvh] flex-col rounded-t-[28px] text-ink outline-none",
            "after:hidden",
            snapPoints && "h-full",
            className,
          )}
        >
          <div aria-hidden className="mx-auto mt-3 mb-5 h-1 w-9 shrink-0 rounded-full bg-line-2" />
          <div className="flex-1 overflow-y-auto overscroll-contain px-gutter pb-s8">
            <div className={cn("flex items-start gap-s4", hideTitle && "sr-only")}>
              <div className="min-w-0 flex-1">
                <Header title={title} description={description} hideTitle={false} media={media} T={Drawer.Title as typeof Dialog.Title} D={Drawer.Description as typeof Dialog.Description} />
              </div>
              <CloseGlyph C={Drawer.Close as typeof Dialog.Close} />
            </div>
            {children && <div className={cn(!hideTitle && "mt-s6")}>{children}</div>}
          </div>
          {footer && (
            <div className="flex shrink-0 items-center justify-end gap-s4 px-gutter pt-s2 pb-[calc(32px+env(safe-area-inset-bottom))]">{footer}</div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function DesktopSheet({ open, onOpenChange, title, description, hideTitle, children, footer, size = "md", media, className, dismissible = true }: ResponsiveSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="pods-scrim fixed inset-0 z-overlay" />
        <Dialog.Content
          onPointerDownOutside={(e) => !dismissible && e.preventDefault()}
          onEscapeKeyDown={(e) => !dismissible && e.preventDefault()}
          className={cn(
            "pods-margin-card glass fixed top-6 right-6 z-sheet flex max-h-[calc(100dvh-48px)] flex-col rounded-[28px] text-ink outline-none",
            W[size],
            className,
          )}
        >
          <div className={cn("flex items-start gap-s4 px-10 pt-10", hideTitle && "sr-only")}>
            <div className="min-w-0 flex-1">
              <Header title={title} description={description} hideTitle={false} media={media} T={Dialog.Title} D={Dialog.Description} />
            </div>
            <CloseGlyph C={Dialog.Close} />
          </div>
          <div className={cn("flex-1 overflow-y-auto px-10 pb-10", children && !hideTitle ? "pt-s6" : "pt-s2")}>{children}</div>
          {footer && <div className="flex shrink-0 items-center justify-end gap-s4 px-10 pb-10">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Close button for use inside sheet content / footer (works in both renderings). */
export function SheetClose({ children }: { children: ReactNode }) {
  const close = useContext(CloseCtx);
  return <Slot.Root onClick={close}>{children}</Slot.Root>;
}
