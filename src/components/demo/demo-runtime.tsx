// [U11] DemoRuntime: the one client component that mounts everything U11 owns. Render it once in <Providers>
// (or the app shell). It renders the DirectorPanel and, after mount: registers the service worker, captures the
// install prompt, starts the simulated crowd, and flushes queued sends when the connection returns.
"use client";

import { useEffect } from "react";
import { startCrowd } from "@/lib/simulation/crowd";
import { startInstallCapture } from "@/lib/pwa/install";
import { onReconnect, registerServiceWorker } from "@/lib/pwa/register";
import { useStore } from "@/lib/db/store";
import { DirectorPanel } from "./director-panel";

export function DemoRuntime() {
  useEffect(() => {
    startInstallCapture();
    void registerServiceWorker();
    const stopCrowd = startCrowd();
    // Back online: anything "sending" from the offline queue goes out (failed ones stay "Tap to retry").
    const stopFlush = onReconnect(() => {
      const { db, commit } = useStore.getState();
      const queued = Object.values(db.messages).some((l) => l.some((m) => m.user_id === db.me && m.delivery === "sending"));
      if (!queued) return;
      commit((d) => {
        for (const list of Object.values(d.messages)) for (const m of list) if (m.user_id === d.me && m.delivery === "sending") m.delivery = "sent";
      });
    });
    return () => {
      stopCrowd();
      stopFlush();
    };
  }, []);
  return <DirectorPanel />;
}
