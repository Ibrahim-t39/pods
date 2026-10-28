// OG image, 1200x630 (V3_SPEC §6.1.2; COLOR_LIFE §7, §12.1). Cool white, the landing's own object at its plan beat
// (three logo circles overlapping inside a closed blue ring, four seats, yours in ember), "Saved you a seat." in Plus Jakarta Sans Bold, the logo
// bottom-left. No tagline stack, no city, no counts.
// Colours are read from src/styles/tokens.css at build time, so this file holds no hex of its own.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Pods. Saved you a seat.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function tokens() {
  const css = await readFile(join(process.cwd(), "src/styles/tokens.css"), "utf8");
  const v = (name: string) => css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim() ?? "";
  return {
    paper: v("paper"), lit: v("lit"), table: v("table"), ink: v("ink"), ink3: v("ink-3"),
    people: [v("color-signal-text"), v("grove-500"), v("teal-500")],
    signal: v("signal-500"), grove: v("grove-500"), ember: v("pods-ember"),
  };
}

// The landing's object at its "plan" beat (COLOR_LIFE §12.1, doorway scene 2): the logo's three flat circles overlapping
// (multiply, darker where more meet), a blue ring closed around them, four seats on it, yours in ember at 6 o'clock.
function tableSvg(t: Awaited<ReturnType<typeof tokens>>) {
  const W = 600;
  const C = W / 2;
  const R = 120; // circle radius, as VennStory
  const D = 74; // centre to circle centre at the plan beat
  const RING = 236;
  const at = (deg: number, r: number) => ({ x: C + Math.cos((deg * Math.PI) / 180) * r, y: C + Math.sin((deg * Math.PI) / 180) * r });
  const circles = [
    { c: t.ember, a: -90 },
    { c: t.signal, a: 150 },
    { c: t.grove, a: 30 },
  ];
  const seats = [
    { a: 90, c: t.ember },
    { a: 200, c: t.people[0] },
    { a: 270, c: t.people[1] },
    { a: 340, c: t.people[2] },
  ];
  const parts = [
    `<circle cx="${C}" cy="${C}" r="${RING}" fill="none" stroke="${t.signal}" stroke-width="5"/>`,
    // resvg drops mix-blend-mode, so the overlaps are drawn as ink layers: darker where more circles meet, like the logo
    ...circles.map(({ c, a }) => { const p = at(a, D); return `<circle cx="${p.x}" cy="${p.y}" r="${R}" fill="${c}" fill-opacity=".9"/>`; }),
    `<defs>${circles.map(({ a }, i) => { const p = at(a, D); return `<clipPath id="k${i}"><circle cx="${p.x}" cy="${p.y}" r="${R}"/></clipPath>`; }).join("")}</defs>`,
    ...[[0, 1], [1, 2], [0, 2]].map(([i, j]) => { const p = at(circles[j].a, D); return `<g clip-path="url(#k${i})"><circle cx="${p.x}" cy="${p.y}" r="${R}" fill="${t.ink}" fill-opacity=".28"/></g>`; }),
    `<g clip-path="url(#k0)"><g clip-path="url(#k1)">${(() => { const p = at(circles[2].a, D); return `<circle cx="${p.x}" cy="${p.y}" r="${R}" fill="${t.ink}" fill-opacity=".3"/>`; })()}</g></g>`,
    ...seats.map(({ a, c }) => { const p = at(a, RING); return `<circle cx="${p.x}" cy="${p.y}" r="17" fill="${t.lit}"/><circle cx="${p.x}" cy="${p.y}" r="13" fill="${c}"/>`; }),
  ];
  return { W, uri: `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}">${parts.join("")}</svg>`).toString("base64")}` };
}

export default async function Image() {
  const [t, sans, logo] = await Promise.all([
    tokens(),
    readFile(join(process.cwd(), "public/og/fonts/PlusJakartaSans-Bold.woff")),
    readFile(join(process.cwd(), "public/brand/logo-horizontal.png")),
  ]);
  const table = tableSvg(t);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: t.paper }}>
        <div
          style={{
            position: "absolute",
            left: 72,
            top: 120,
            display: "flex",
            flexDirection: "column",
            fontFamily: "Plus Jakarta Sans",
            fontWeight: 700,
            fontSize: 116,
            lineHeight: 1,
            letterSpacing: "-0.035em",
            color: t.ink,
          }}
        >
          <span>Saved you</span>
          <span>a seat.</span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={table.uri} width={table.W} height={table.W} alt="" style={{ position: "absolute", right: 40, top: (630 - table.W) / 2 }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/png;base64,${logo.toString("base64")}`} width={168} height={52} alt="" style={{ position: "absolute", left: 72, bottom: 64 }} />
      </div>
    ),
    { ...size, fonts: [{ name: "Plus Jakarta Sans", data: sans, style: "normal", weight: 700 }] },
  );
}
