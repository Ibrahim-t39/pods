// Platform foundation: the plain scaffold the minimal route pages use until their area restyles them
// (PLATFORM_SPEC §O). Semantic tokens only, no hex, no lucide. Functional, not final design.
"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useHydrated } from "@/lib/db/hooks";
import { PageSkeleton } from "@/components/shell/store-gate";

/** Renders nothing persisted until this browser's store is read (server and first paint show the skeleton). */
export function PlatformPage({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  const hydrated = useHydrated();
  if (!hydrated) return <PageSkeleton />;
  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pt-6 pb-24 text-fg">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {aside}
      </div>
      {children}
    </div>
  );
}

export function Section({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      {label ? <h2 className="mb-3 text-sm font-medium text-fg-muted">{label}</h2> : null}
      {children}
    </section>
  );
}

export function Rows({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">{children}</ul>;
}

export function Row({ title, sub, href, end }: { title: ReactNode; sub?: ReactNode; href?: string; end?: ReactNode }) {
  const body = (
    <div className="flex min-h-[56px] items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{title}</div>
        {sub ? <div className="truncate text-sm text-fg-muted">{sub}</div> : null}
      </div>
      {end}
    </div>
  );
  return <li>{href ? <Link href={href} className="block hover:bg-sunken">{body}</Link> : body}</li>;
}

export function Btn({ tone = "quiet", className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "quiet" }) {
  return (
    <button
      type="button"
      {...p}
      className={cn(
        "inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-sm font-semibold disabled:opacity-50",
        tone === "primary" ? "bg-primary text-on-primary" : "border border-border bg-surface text-fg",
        className,
      )}
    />
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-fg-muted">{children}</p>;
}

/** The one RSVP chip everywhere a person is listed (members sheet, People): "In", grove. */
export function InChip({ className }: { className?: string }) {
  return <span className={cn("shrink-0 rounded-full bg-grove-100 px-s2 py-0.5 text-[13px] font-medium text-grove-800", className)}>In</span>;
}

/** "Age 22 · Basketball": a member's age and the first interest you share (or theirs, or just the age). */
export function memberLine(age: number | null | undefined, shared: string | null): string {
  const a = age ? `Age ${age}` : null;
  const s = shared ? shared.charAt(0).toUpperCase() + shared.slice(1) : null;
  return [a, s].filter(Boolean).join(" · ");
}
