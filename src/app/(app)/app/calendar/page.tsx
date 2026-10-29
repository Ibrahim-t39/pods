// Calendar: every hangout and task across your pods, week or month, plus "Add to your calendar".
import { Suspense } from "react";
import { CalendarPage } from "@/components/calendar/calendar";

export default function Page() {
  return (
    <Suspense>
      <CalendarPage />
    </Suspense>
  );
}
