// System pages v3 (wireframes Z01-Z03): the same anatomy as every page. The mark top-left, one serif line, an empty
// dashed table as the object, one way out. Never a stack trace, never "Error 404", never a disclaimer.
"use client";

import Link from "next/link";
import { Line } from "@/components/brand/line";
import { Button } from "@/components/ui/button";
import { Chrome } from "./chrome";
import { Page } from "./page";

function EmptyTable() {
  return <span aria-hidden className="block size-48 rounded-full border-[1.5px] border-dashed border-line-2 lg:size-80" />;
}

/** Z01. */
export function NotFoundView({ inApp = false }: { inApp?: boolean }) {
  return (
    <Page
      chrome={<Chrome left="mark" />}
      head={<Line size="lg">No pod here.</Line>}
      object={<EmptyTable />}
      foot={
        <>
          <span />
          <Button asChild>
            <Link href={inApp ? "/app/pods" : "/app"}>Your pods</Link>
          </Button>
        </>
      }
    />
  );
}

/** Z02. */
export function ErrorView({ onRetry }: { onRetry: () => void; inApp?: boolean; digest?: string }) {
  return (
    <Page
      chrome={<Chrome left="mark" />}
      head={
        <>
          <Line size="lg">Something slipped.</Line>
          <p className="mt-s4 text-body text-ink-2">Your seats are kept.</p>
        </>
      }
      object={<EmptyTable />}
      foot={
        <>
          <span />
          <Button onClick={onRetry} autoFocus>
            Try again
          </Button>
        </>
      }
    />
  );
}
