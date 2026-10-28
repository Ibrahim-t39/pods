// <Page>: the one page anatomy (docs/design/template.md §1; wireframes kit.mjs `.m` / `.d`).
//
// Phone 390x844 (no scroll on a flow step):
//   chrome row   44px at 16px from the top                      (<Chrome>)
//   head         24px under the row: the overline + the serif line (one per screen)
//   object       takes what is left; one object, centred
//   foot         32px clear zone above, 32px floor: the status label left, the one primary right (min 120px)
// Laptop 1440x900:
//   chrome row   32px from the top, 64px margin
//   text column  520px, head at 160px from the top, foot at the bottom (64px floor)
//   object       the rest, 96px from the column, off-centre (PB 1.1)
//
// Light is set separately with <Stage>. `scroll` lets content pages (legal, settings, Talk) grow past the fold.
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
// the anatomy's CSS travels with the component: system pages (404, offline, error) render outside the app shell
// (QA r1: /offline and /nope sat flush left with no gutter because shell.css was never loaded there)
import "./shell.css";

export interface PageProps {
  chrome?: ReactNode;
  head?: ReactNode;
  object?: ReactNode;
  foot?: ReactNode;
  /** content pages may scroll; flow steps never do */
  scroll?: boolean;
  /** put the head under the object on phones (the Doorway: the line sits bottom-left under the table) */
  headLow?: boolean;
  className?: string;
  label?: string;
}

export function Page({ chrome, head, object, foot, scroll, headLow, className, label }: PageProps) {
  return (
    <div aria-label={label} className={cn("pods-pg", scroll ? "min-h-[100dvh]" : "h-[100dvh] overflow-hidden", className)} data-head-low={headLow ? "" : undefined}>
      {chrome}
      <div className="pods-pg-body">
        <div className="pods-pg-col">
          {head && <div className="pods-pg-head">{head}</div>}
          {foot && <div className="pods-pg-foot">{foot}</div>}
        </div>
        {object && <div className="pods-pg-obj">{object}</div>}
      </div>
    </div>
  );
}
