"use client";
// Threshold (PB 2.1 "seat, not hero"; AW 04/06/12; SF 23/24): three people already hold the canopy, the fourth pole is
// yours and the cloth flutters until you take it. One line, one action, no sections below.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDb, useHydrated } from "@/lib/db/hooks";
import { Canopy, type Pole } from "./Canopy";
import { Surface, Top } from "./Frame";
import { myGrounds } from "./model";

const HELD: Pole[] = [
  { key: "a", initial: "", tone: 1, me: false, standing: true },
  { key: "b", initial: "", tone: 2, me: false, standing: true },
  { key: "you", initial: "", tone: 0, me: true, standing: false },
  { key: "d", initial: "", tone: 3, me: false, standing: true },
];

export function Landing() {
  const router = useRouter();
  const hydrated = useHydrated();
  const placed = useDb((db) => myGrounds(db).length > 0);
  const [taken, setTaken] = useState(false);
  const poles = HELD.map((p) => (p.me ? { ...p, standing: taken, initial: "" } : p));

  const go = () => {
    if (taken) return;
    setTaken(true);
    setTimeout(() => router.push(placed ? "/concepts/canopy/here" : "/concepts/canopy/begin"), 1100);
  };

  return (
    <Surface light={taken ? "still" : "dawn"} hue="ember" horizon={62} label="Pods">
      <Top
        right={
          <nav className="cn-legal" aria-label="Legal">
            <a href="/privacy">privacy</a>
            <a href="/terms">terms</a>
          </nav>
        }
      />
      <div className="cn-stage" aria-hidden>
        <Canopy poles={poles} lift={taken ? 1 : 0.75} />
      </div>
      <div className="cn-foot cn-land">
        <h1 className="cn-big" style={{ margin: 0, maxWidth: "9.5ch" }}>
          Saved you <span className="cn-it">a spot.</span>
        </h1>
        <div className="cn-split" style={{ marginTop: 24, alignItems: "center" }}>
          <p className="cn-cap" style={{ margin: 0, maxWidth: "19ch" }}>
            Find your people. <b>Then keep them.</b>
          </p>
          <button type="button" className="cn-act" onClick={go} disabled={!hydrated} data-testid="cn-take">
            {placed ? "Go in" : "Take it"}
          </button>
        </div>
      </div>
    </Surface>
  );
}
