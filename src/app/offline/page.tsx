// [U11] SY-01 Offline (BLUEPRINT §5 SY-01). Static shell; the service worker serves it when a navigation can't be reached.
import type { Metadata } from "next";
import { OfflineScreen } from "./offline-screen";

export const metadata: Metadata = { title: "Offline" };

export default function Page() {
  return <OfflineScreen />;
}
