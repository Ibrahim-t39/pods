// B01e as a stop: a number that entered an under-18 age is held for 30 days (BLUEPRINT edge case 1). One line, the
// empty table, one way out. No explanation of enforcement.
"use client";

import Link from "next/link";
import { Line } from "@/components/brand/line";
import { Button } from "@/components/ui/button";
import { FlowStep, useTableSize } from "../flow";
import { SeatTable } from "../objects";

export function Under18() {
  const { size } = useTableSize();
  return (
    <FlowStep
      screen="under-18"
      light="paper"
      back="/"
      head={<Line size="lg">Pods is 18 and up.</Line>}
      object={<SeatTable size={size} />}
      action={
        <Button asChild size="xl" variant="secondary">
          <Link href="/">Back</Link>
        </Button>
      }
    />
  );
}
