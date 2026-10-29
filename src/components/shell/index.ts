// App shell barrel (v3). Import from "@/components/shell".
export { AppShell, AppShellFallback } from "./app-shell";
export { Chrome, GlyphButton, SeatGlyph, type ChromeProps } from "./chrome";
export { PaneLayout, usePaneLayout, type PaneLayoutProps } from "./pane-layout";
export { TopBar, type TopBarProps } from "./top-bar";
export { PageTransition, RouteTransition } from "./page-transition";
export { StoreGate, PageSkeleton, type StoreGateProps } from "./store-gate";
export { OfflineBanner, useOnline } from "./offline-banner";
export { chromeFor, transitionKey, shellTransitionKey, NESTED_LAYOUT_SECTIONS, type ShellChrome, type Direction } from "./nav";
export { isTypingTarget } from "./shortcuts";
export { CondensingHead, type CondensingHeadProps } from "./condensing-head";
export { Daypart, daypartOf } from "./daypart";
export { PageHeader, type PageHeaderProps } from "./page-header";
