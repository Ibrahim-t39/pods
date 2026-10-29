// /try: the film's nav (light) over the playable TryIt story (landing.css keeps its styles).
"use client";

import { FilmNav } from "./film";
import { TryIt } from "./try-it";
import "./landing.css";

export function TryPage() {
  return (
    <div className="lp lp-try">
      <FilmNav tone="light" />
      <main id="main" className="pt-24">
        <TryIt />
      </main>
    </div>
  );
}
