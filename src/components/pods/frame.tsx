// The frame for the platform's list pages (Discover, Search, People, Invite): the chrome row, one overline + one bold
// line, then the content, all on the same 20px gutter (phone) and 64px margin (laptop) as every other page.
// Spacing: s2 overline → line, s8 line → content, the content sets its own rhythm; the page clears the capsule.
"use client";

import type { ReactNode } from "react";
import { Line, Stage, type StageLight } from "@/components/brand";
import { Chrome } from "@/components/shell";
import { PageSkeleton } from "@/components/shell/store-gate";
import { useHydrated } from "@/lib/db/hooks";

export function Frame({ over, line, right, light = "paper", wide, children }: { over?: string; line: ReactNode; right?: ReactNode; light?: StageLight; wide?: boolean; children: ReactNode }) {
  const hydrated = useHydrated();
  if (!hydrated) return <PageSkeleton />;
  return (
    <>
      <Stage light={light} />
      <div className="min-h-[100dvh] pb-[calc(var(--s12)+var(--shell-bottom,0px)+env(safe-area-inset-bottom))]">
        <Chrome left="mark" right={right ?? "none"} />
        <div className={`mx-auto w-full px-gutter pt-s6 lg:px-s16 lg:pt-[116px] ${wide ? "max-w-[1440px]" : "max-w-[1440px] lg:[&>*]:max-w-[760px]"}`}>
          <header>
            {over && <p className="text-overline text-ink-2">{over}</p>}
            <Line className={over ? "mt-s2" : undefined}>{line}</Line>
          </header>
          <div className="mt-s8">{children}</div>
        </div>
      </div>
    </>
  );
}
