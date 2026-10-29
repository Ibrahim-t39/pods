// A person (redesign r2): a real profile page, not a sheet over a decoration. What you share first (likes in common,
// pods together, next hangout), then their words, with Message in the shared pod as the one primary and Report / Block
// in the menu. Only people you share a pod with can be seen.
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Disc, Stage } from "@/components/brand";
import { PageHeader } from "@/components/shell/page-header";
import { Chrome } from "@/components/shell/chrome";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/lib/db/hooks";
import { PersonCard, usePersonView } from "@/components/platform/person-card";
import { ListSkeleton } from "@/components/platform/page-head";

export function PersonScreen() {
  const { userId } = useParams<{ userId: string }>();
  const hydrated = useHydrated();
  const view = usePersonView(userId);

  // someone you don't share a pod with (or no one): the shared page head, a blank face, one line, one way back
  if (hydrated && !view) {
    return (
      <div className="min-h-[100dvh] pb-[calc(var(--s12)+var(--shell-bottom,0px)+env(safe-area-inset-bottom))]">
        <Stage light="paper" />
        <PageHeader left="back" backHref="/app/people" title="Not in your pods" />
        <div className="mx-auto w-full max-w-[1280px] px-gutter pt-s6 lg:px-s12">
          <div className="flex items-center gap-s4">
            <Disc tone="open" size={56} />
            <p className="max-w-[40ch] text-[16px] leading-[1.45] text-ink-2">You can see someone&apos;s profile once you share a pod with them.</p>
          </div>
          <Button asChild className="mt-s6">
            <Link href="/app/people">Back to your people</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pb-[calc(var(--s12)+var(--shell-bottom,0px)+env(safe-area-inset-bottom))]">
      <Stage light="paper" />
      <Chrome left="back" backHref="/app/people" backLabel="People" />
      <div className="mx-auto w-full max-w-[880px] px-gutter pt-s4 lg:px-s12 lg:pt-s6">
        {!hydrated ? (
          <ListSkeleton rows={3} />
        ) : (
          view && (
            <div className="lg:rounded-3xl lg:bg-surface lg:p-s8 lg:shadow-[inset_0_0_0_1px_var(--line)]">
              <PersonCard view={view} wide />
            </div>
          )
        )}
      </div>
    </div>
  );
}
