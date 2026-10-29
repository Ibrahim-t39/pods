// A person (redesign r2): a real profile page, not a sheet over a decoration. What you share first (likes in common,
// pods together, next hangout), then their words, with Message in the shared pod as the one primary and Report / Block
// in the menu. Only people you share a pod with can be seen.
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Stage } from "@/components/brand";
import { Chrome } from "@/components/shell/chrome";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/lib/db/hooks";
import { PersonCard, usePersonView } from "@/components/platform/person-card";
import { ListSkeleton } from "@/components/platform/page-head";

export function PersonScreen() {
  const { userId } = useParams<{ userId: string }>();
  const hydrated = useHydrated();
  const view = usePersonView(userId);

  return (
    <div className="min-h-[100dvh] pb-[calc(var(--s12)+var(--shell-bottom,0px)+env(safe-area-inset-bottom))]">
      <Stage light="paper" />
      <Chrome left="back" backHref="/app/people" backLabel="People" />
      <div className="mx-auto w-full max-w-[880px] px-gutter pt-s4 lg:px-s12 lg:pt-s6">
        {!hydrated ? (
          <ListSkeleton rows={3} />
        ) : view ? (
          <div className="lg:rounded-3xl lg:bg-surface lg:p-s8 lg:shadow-[inset_0_0_0_1px_var(--line)]">
            <PersonCard view={view} wide />
          </div>
        ) : (
          <div className="mt-s8 rounded-2xl px-s4 py-s8 text-center shadow-[inset_0_0_0_1px_var(--line)]">
            <p className="text-[17px] font-semibold text-ink">Not in your pods</p>
            <p className="mt-1 text-[14px] text-ink-2">You can see people once you share a pod with them.</p>
            <Button asChild variant="secondary" size="sm" className="mt-s4">
              <Link href="/app/people">Your people</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
