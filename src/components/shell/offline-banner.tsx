// Offline (C05, Z03): one word, top centre, under the chrome row. Never a coloured strip. Server snapshot = online.
"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "@/components/icons";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

export function OfflineBanner() {
  const online = useOnline();
  return (
    <AnimatePresence initial={false}>
      {!online && (
        <motion.p
          key="off"
          role="status"
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -8, opacity: 0 }}
          className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+28px)] z-toast flex justify-center"
        >
          <span className="inline-flex h-8 items-center gap-1 rounded-full bg-teal px-3 text-label text-on-teal">
            <Icon name="off" size={16} />
            Offline.
          </span>
        </motion.p>
      )}
    </AnimatePresence>
  );
}
