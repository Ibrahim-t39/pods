// [U5] PaneLayout: list | main | details (ARCHITECTURE §6, BLUEPRINT §4.2). Pure CSS grid (shell.css), so there is
// no hydration flash and the details element never re-mounts when the viewport crosses a breakpoint.
//
//   <768      one pane at a time: `mobileFocus` picks "list" or "main"; details is a full-screen slide-over
//             when `detailsOpen` (U7 normally pushes /details as its own route on phones instead).
//   768-1023  list 320 + main; details = 420px slide-over with scrim when `detailsOpen`.
//   1024-1279 list 340 + main; details slide-over.
//   ≥1280     list 340 + main + details 380, persistent (WhatsApp Web / Slack). `]` collapses / restores it,
//             and while it is shown the side rail auto-collapses to icons (CSS :has on data-pane-details).
//
// Usage (U7):
//   <PaneLayout list={<PodList />} details={<PodDetailsPanel podId={id} />} detailsOpen={isDetailsRoute}
//               onDetailsOpenChange={(o) => router.push(o ? `/app/pods/${id}/details` : `/app/pods/${id}`)}
//               mobileFocus="main" listLabel="Your pods" mainLabel="Hoopers chat">
//     <PodChat />
//   </PaneLayout>
// Each pane scrolls on its own at ≥768 (height = the main column), and in document flow on phones.
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const DETAILS_KEY = "pods:details-collapsed";

export interface PaneLayoutProps {
  /** Left pane (pod list). Omit for a single-column page with an optional details panel. */
  list?: ReactNode;
  /** Centre pane. */
  children: ReactNode;
  /** Right panel. Persistent at ≥1280 (unless collapsed with `]`), a slide-over below that. */
  details?: ReactNode;
  /** Slide-over state below 1280 (and on phones). At ≥1280 the panel shows regardless. */
  detailsOpen?: boolean;
  onDetailsOpenChange?: (open: boolean) => void;
  /** Which pane a phone shows. Default "main". */
  mobileFocus?: "list" | "main";
  listLabel?: string;
  mainLabel?: string;
  detailsLabel?: string;
  className?: string;
  listClassName?: string;
  mainClassName?: string;
  detailsClassName?: string;
}

export function PaneLayout({
  list,
  children,
  details,
  detailsOpen = false,
  onDetailsOpenChange,
  mobileFocus = "main",
  listLabel = "List",
  mainLabel,
  detailsLabel = "Details",
  className,
  listClassName,
  mainClassName,
  detailsClassName,
}: PaneLayoutProps) {
  // `]` hides / shows the persistent details panel at ≥1280 (remembered per viewer, read after mount).
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(localStorage.getItem(DETAILS_KEY) === "1");
    } catch {
      /* storage blocked */
    }
  }, []);
  const setCollapsedPersist = useCallback((c: boolean) => {
    setCollapsed(c);
    try {
      localStorage.setItem(DETAILS_KEY, c ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const hasDetails = details != null;

  const toggleDetails = useCallback(() => {
    if (window.matchMedia("(min-width: 1280px)").matches) setCollapsedPersist(!collapsed);
    else onDetailsOpenChange?.(!detailsOpen);
  }, [collapsed, detailsOpen, onDetailsOpenChange, setCollapsedPersist]);
  const closeDetails = useCallback(() => {
    if (window.matchMedia("(min-width: 1280px)").matches) setCollapsedPersist(true);
    else onDetailsOpenChange?.(false);
  }, [onDetailsOpenChange, setCollapsedPersist]);
  const ctx = useMemo(() => ({ toggleDetails, closeDetails }), [toggleDetails, closeDetails]);

  useEffect(() => {
    if (!hasDetails) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === "]" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        toggleDetails();
      } else if (e.key === "Escape" && detailsOpen && !window.matchMedia("(min-width: 1280px)").matches) {
        onDetailsOpenChange?.(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasDetails, detailsOpen, onDetailsOpenChange, toggleDetails]);

  return (
    <Ctx.Provider value={ctx}>
    <div
      data-pane-layout=""
      data-focus={mobileFocus}
      data-has-list={list != null ? "true" : undefined}
      data-pane-details={hasDetails && !collapsed ? "persistent" : undefined}
      data-details-open={hasDetails && detailsOpen ? "true" : undefined}
      className={cn("pods-panes", className)}
    >
      {list != null && (
        <section aria-label={listLabel} data-pane="list" className={cn("pods-pane pods-pane-list", listClassName)}>
          {list}
        </section>
      )}
      <section aria-label={mainLabel} data-pane="main" className={cn("pods-pane pods-pane-main", mainClassName)}>
        {children}
      </section>
      {hasDetails && (
        <>
          <div aria-hidden className="pods-pane-scrim" onClick={() => onDetailsOpenChange?.(false)} />
          <aside aria-label={detailsLabel} data-pane="details" className={cn("pods-pane pods-pane-details", detailsClassName)}>
            {details}
          </aside>
        </>
      )}
    </div>
    </Ctx.Provider>
  );
}

interface PaneCtx {
  /** Toggle the details panel: collapse/restore at ≥1280, open/close the slide-over below. Same as `]`. */
  toggleDetails: () => void;
  closeDetails: () => void;
}
const Ctx = createContext<PaneCtx | null>(null);

/** For a header "Pod info" button or the panel's own close button. Null outside a PaneLayout. */
export function usePaneLayout(): PaneCtx | null {
  return useContext(Ctx);
}
