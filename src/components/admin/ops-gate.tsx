// Admin gate (QA admin r1; library C #8). /admin is not a public page: it opens only in a browser that has used a
// Director trigger (?director=1, Ctrl/Cmd + ., the 700 ms press on the mark) or ?admin=1, remembered under OPS_KEY.
// Anyone else gets the ordinary "No pod here." page, so the URL does not advertise an ops tool. Production builds
// drop the route entirely unless PODS_ADMIN=1 (see app/(admin)/admin/layout.tsx).
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { OPS_EVENT, OPS_KEY, unlockOps } from "@/components/demo/director-panel";
import { NotFoundView } from "@/components/shell/system-pages";
import "@/components/shell/shell.css";

function unlocked(): boolean {
  try {
    return localStorage.getItem(OPS_KEY) === "1";
  } catch {
    return false;
  }
}

export function OpsGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"checking" | "open" | "locked">("checking");

  useEffect(() => {
    let sessionOpen = false;
    const url = new URL(window.location.href);
    if (url.searchParams.get("admin") === "1" || url.searchParams.get("director") === "1") {
      sessionOpen = true;
      if (url.searchParams.get("admin") === "1") {
        url.searchParams.delete("admin");
        window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
      }
      unlockOps();
    }
    const check = () => setState(unlocked() || sessionOpen ? "open" : "locked");
    const onUnlock = () => {
      sessionOpen = true; // storage may be blocked: the event alone opens it for this page
      check();
    };
    check();
    window.addEventListener(OPS_EVENT, onUnlock);
    window.addEventListener("storage", check);
    return () => {
      window.removeEventListener(OPS_EVENT, onUnlock);
      window.removeEventListener("storage", check);
    };
  }, []);

  // The admin tree always renders (Next validates every segment for instant navigation), but stays hidden and inert
  // until the gate opens; locked browsers see the ordinary not-found page instead.
  const shown = state === "open";
  return (
    <>
      {state === "locked" && <NotFoundView />}
      <div style={{ display: shown ? "contents" : "none" }} aria-hidden={shown ? undefined : true} inert={!shown}>
        {children}
      </div>
    </>
  );
}
