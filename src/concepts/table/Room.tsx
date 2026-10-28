// TABLE · Room: your 1-3 tables seen from further away, overlapping where people are shared (SF 01, 07, 19;
// CM 141, 154). Light pools over the next one. Tap a table: it warps up to fill the screen (SF 03).
"use client";

import { motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useDb, useHydrated } from "@/lib/db/hooks";
import { formatTime, formatWeekday } from "@/lib/time/format";
import { HUE_VAR, myTables, onCircle, type MyTable } from "./model";
import { GENTLE, Logo, Paper, SNAPPY, TableTop, useWide } from "./ui";

export function Room() {
  const router = useRouter();
  const arrive = useSearchParams().get("arrive") === "1";
  const hydrated = useHydrated();
  const wide = useWide();
  const tables = useDb(myTables);
  const meName = useDb((db) => (db.me ? db.users[db.me]?.first_name : null));
  const [zoom, setZoom] = useState<string | null>(null);
  // The route is kept alive between visits; coming back always starts zoomed out.
  useEffect(() => setZoom(null), []);

  const n = Math.min(3, tables.length);
  const W = wide ? 760 : 350;
  const H = wide ? 720 : 470;
  const D = wide ? (n === 1 ? 460 : n === 2 ? 380 : 320) : n === 1 ? 300 : n === 2 ? 230 : 192;
  const centers = useMemo(() => {
    if (n <= 1) return [[W / 2, H / 2]];
    if (n === 2) return [[W / 2 - 0.3 * D, H / 2 - 0.32 * D], [W / 2 + 0.3 * D, H / 2 + 0.32 * D]];
    return [[W / 2, H / 2 - 0.44 * D], [W / 2 - 0.41 * D, H / 2 + 0.28 * D], [W / 2 + 0.41 * D, H / 2 + 0.28 * D]];
  }, [n, W, H, D]);

  // People shared by two tables sit in the overlap (Fit made visible).
  const shared = useMemo(() => {
    const out: { a: number; b: number; ids: string[] }[] = [];
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const ids = tables[i].people.filter((p) => !p.me && tables[j].people.some((q) => q.id === p.id)).map((p) => p.id);
        if (ids.length) out.push({ a: i, b: j, ids });
      }
    return out;
  }, [tables, n]);

  const open = (t: MyTable) => {
    if (!t.open) return;
    setZoom(t.pod.id);
    setTimeout(() => router.push(`/concepts/table/t/${t.pod.id}`), 420);
  };

  if (hydrated && !tables.length) {
    return (
      <Paper>
        <div style={{ minHeight: "100dvh", padding: "var(--s4) var(--m) var(--m)", display: "flex", flexDirection: "column" }}>
          <div style={{ height: 48, display: "flex", alignItems: "center" }}><Logo height={24} /></div>
          <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
            <TableTop size={wide ? 420 : 300} seats={[90, 210, 270, 330]} />
          </div>
          <h1 className="tb-serif tb-t-xl" style={{ margin: 0 }}>No table yet.</h1>
          <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "var(--s12)" }}>
            <button className="tb-btn" onClick={() => router.push("/concepts/table")}>Find a seat</button>
          </div>
        </div>
      </Paper>
    );
  }

  const lit = tables.findIndex((t) => t.open && t.next);
  const litC = centers[Math.max(0, lit)] ?? [W / 2, H / 2];

  const stage = (
    <div style={{ position: "relative", width: W, height: H, flex: "none" }}>
      {/* the lamp: one warm pool over the next table (PB 4.8) */}
      {lit >= 0 && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: arrive ? 1.2 : 0.2, duration: 0.8 }}
          style={{ position: "absolute", left: litC[0] - D, top: litC[1] - D, width: D * 2, height: D * 2, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,250,240,.95), rgba(255,250,240,0))", pointerEvents: "none" }}
        />
      )}
      {tables.slice(0, 3).map((t, i) => {
        const [cx, cy] = centers[i];
        const z = zoom === t.pod.id;
        const ppl = t.people.slice(0, 8);
        const seats = ppl.map((_, k) => 90 + (k * 360) / Math.max(4, ppl.length));
        return (
          <motion.button
            key={t.pod.id}
            className="tb-hit"
            onClick={() => open(t)}
            aria-label={t.open ? `${t.name}${t.next ? `, ${formatWeekday(t.next)}` : ""}` : `${t.name}, opens soon`}
            disabled={!t.open}
            initial={arrive ? { opacity: 0, scale: 0.6 } : false}
            animate={{ opacity: zoom && !z ? 0 : 1, scale: z ? 3.2 : 1 }}
            transition={z ? GENTLE : { ...SNAPPY, delay: arrive ? 0.35 + i * 0.35 : 0 }}
            style={{ position: "absolute", left: cx - D / 2, top: cy - D / 2, width: D, height: D, borderRadius: "50%", zIndex: z ? 5 : 2 - i * 0 }}
          >
            <TableTop size={D} seats={seats} hue={t.open ? HUE_VAR[t.hue] : "var(--tb-line-2)"} style={{ opacity: t.open ? 1 : 0.55 }}>
              {ppl.map((p, k) => {
                const pos = onCircle(seats[k], 0.43);
                const d = D * 0.085;
                return (
                  <span key={p.id} aria-hidden style={{ position: "absolute", ...pos, width: d, height: d, marginLeft: -d / 2, marginTop: -d / 2, borderRadius: "50%", background: t.open ? p.color : "transparent", border: t.open ? "none" : "1px dashed var(--tb-line-2)" }} />
                );
              })}
              <span style={{ position: "absolute", inset: "22%", display: "grid", placeContent: "center", textAlign: "center", gap: 6 }}>
                <span className="tb-serif" style={{ fontSize: Math.round(D * 0.12), lineHeight: 1 }}>{t.name}</span>
                <span className="tb-mono tb-t-cap tb-muted">
                  {!t.open ? "Opens soon" : t.next ? `${formatWeekday(t.next)} · ${formatTime(t.next).replace(":00", "")}` : "Being planned"}
                </span>
              </span>
            </TableTop>
          </motion.button>
        );
      })}
      {/* shared people in the overlap */}
      {shared.map((s) => {
        const [ax, ay] = centers[s.a];
        const [bx, by] = centers[s.b];
        const mx = (ax + bx) / 2;
        const my = (ay + by) / 2;
        return s.ids.slice(0, 3).map((id, k) => {
          const d = D * 0.085;
          return <span key={id} aria-hidden style={{ position: "absolute", left: mx - d / 2 + (k - (s.ids.length - 1) / 2) * d * 0.7, top: my - d / 2, width: d, height: d, borderRadius: "50%", background: "var(--tb-ink)", border: "2px solid var(--tb-table)", zIndex: 4, opacity: zoom ? 0 : 1 }} />;
        });
      })}
    </div>
  );

  const line = (
    <div style={{ display: "grid", gap: "var(--s2)" }}>
      <h1 className={`tb-serif ${wide ? "tb-t-xxl" : "tb-t-xl"}`} style={{ margin: 0 }}>
        {arrive ? `Welcome${meName ? `, ${meName}` : ""}.` : "Your tables."}
      </h1>
      <p className="tb-mono tb-t-label tb-muted" style={{ margin: 0 }}>Tap one to sit</p>
    </div>
  );

  if (wide) {
    return (
      <Paper lamp={{ x: "64%", y: "44%" }}>
        <div style={{ minHeight: "100dvh", display: "grid", gridTemplateColumns: "1fr auto", padding: "var(--s12) var(--s16)", gap: "var(--s24)" }}>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ height: 48, display: "flex", alignItems: "center" }}><Logo height={28} /></div>
            <motion.div animate={{ opacity: zoom ? 0 : 1 }} style={{ paddingBottom: "var(--s12)" }}>{line}</motion.div>
          </div>
          <div style={{ display: "grid", placeItems: "center" }}>{stage}</div>
        </div>
      </Paper>
    );
  }
  return (
    <Paper lamp={{ x: "50%", y: "40%" }}>
      <div style={{ height: "100dvh", display: "flex", flexDirection: "column", padding: "var(--s4) var(--m) var(--m)" }}>
        <div style={{ height: 48, display: "flex", alignItems: "center" }}><Logo height={24} /></div>
        <div style={{ flex: 1, display: "grid", placeItems: "center", minHeight: 0 }}>{stage}</div>
        <motion.div animate={{ opacity: zoom ? 0 : 1 }} style={{ paddingBottom: "var(--s4)" }}>{line}</motion.div>
      </div>
    </Paper>
  );
}
