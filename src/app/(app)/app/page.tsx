// /app: routes to the right first-run step or to Your pods once the store has hydrated.
// Client-side because the answer lives in this browser.
import { Suspense } from "react";
import { AppRouterScreen } from "./router-screen";

export default function Page() {
  return (
    <Suspense>
      <AppRouterScreen />
    </Suspense>
  );
}
