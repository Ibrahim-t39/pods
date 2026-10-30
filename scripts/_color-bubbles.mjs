// Bubble round (founder idea 8): renders O (control) and bubble variants B1-B3 injected over the live app on the same
// screens. Usage: node scripts/_color-bubbles.mjs O,B1,B2,B3 [m|d]  → shots/color/bubbles/<X>/<n>.<m|d>.png
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const D = "/Users/ibrahimtraore/Documents/PROPEL/PODS/v3/color/bubbles";
const dirs = (process.argv[2] || "O,B1,B2,B3").split(",");
const onlyV = process.argv[3];
const base = "http://localhost:3000";
const VPS = {
  m: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  d: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
// doorway: give the story's SVG circles the variant's skin (preview only; the real build does this in VennStory)
const venn = (mode) => {
  const svg = document.querySelector("svg.door-venn"); if (!svg || !["B1", "B2"].includes(mode)) return;
  const NS = "http://www.w3.org/2000/svg";
  const defs = svg.querySelector("defs");
  const hues = { ember: ["#FD6123", "#FFD2BF"], signal: ["#1B78FE", "#CFE3FF"], grove: ["#19C185", "#C9F5E2"] };
  const circles = [...svg.querySelectorAll("circle")].filter((c) => (c.getAttribute("fill") || "").startsWith("url(") && c.getAttribute("r") === "120").slice(0, 3);
  const keys = ["ember", "signal", "grove"];
  circles.forEach((c, i) => {
    const [h, tint] = hues[keys[i]];
    const g = document.createElementNS(NS, "radialGradient"); g.id = "bb-" + keys[i];
    const stops = mode === "B1" ? [[0, h, .05], [.72, h, .08], [.93, h, .6], [.98, tint, 1], [1, h, .0]] : [[0, h, .30], [.55, h, .42], [.88, h, .74], [.975, tint, 1], [1, h, .2]];
    stops.forEach(([o, col, a]) => { const s = document.createElementNS(NS, "stop"); s.setAttribute("offset", o); s.setAttribute("stop-color", col); s.setAttribute("stop-opacity", a); g.appendChild(s); });
    defs.appendChild(g);
    c.setAttribute("fill", `url(#bb-${keys[i]})`); c.style.mixBlendMode = "normal"; c.style.opacity = 1;
    c.parentNode.style.mixBlendMode = "normal";
    const cx = +c.getAttribute("cx"), cy = +c.getAttribute("cy");
    const hl = document.createElementNS(NS, "ellipse"); hl.setAttribute("cx", cx - 42); hl.setAttribute("cy", cy - 66); hl.setAttribute("rx", 38); hl.setAttribute("ry", 20);
    hl.setAttribute("fill", "white"); hl.setAttribute("opacity", mode === "B1" ? .85 : .7); hl.setAttribute("transform", `rotate(-28 ${cx - 42} ${cy - 66})`); hl.style.filter = "blur(3px)";
    const dx = [0, -30, 30][i], dy = [-36, 14, 14][i];
    const dot = document.createElementNS(NS, "circle"); dot.setAttribute("cx", cx + dx); dot.setAttribute("cy", cy + dy); dot.setAttribute("r", 22); dot.setAttribute("fill", "white");
    dot.style.filter = "drop-shadow(0 3px 5px rgba(14,26,34,.25))";
    c.parentNode.appendChild(hl); c.parentNode.appendChild(dot);
  });
};
const browser = await chromium.launch({ executablePath: CHROME });
for (const X of dirs) {
  const css = readFileSync(`${D}/_common.css`, "utf8") + readFileSync(`${D}/${X}.css`, "utf8");
  const out = `shots/color/bubbles/${X}`; mkdirSync(out, { recursive: true });
  for (const [vn, vp] of Object.entries(VPS)) {
    if (onlyV && onlyV !== vn) continue;
    const ctx = await browser.newContext({ ...vp, locale: "en-US", timezoneId: "America/Los_Angeles" });
    await ctx.addInitScript((c) => {
      const add = () => { const s = document.createElement("style"); s.id = "dir"; s.textContent = c; document.head.appendChild(s); };
      if (document.head) add(); else document.addEventListener("DOMContentLoaded", add);
    }, css);
    const page = await ctx.newPage(); page.setDefaultTimeout(30000);
    const shot = async (n) => { await page.waitForTimeout(1000); await page.screenshot({ path: `${out}/${n}.${vn}.png` }); };
    try {
      await page.goto(base + "/", { waitUntil: "commit" }); await page.waitForTimeout(7000); await page.waitForTimeout(800); await page.evaluate(venn, X); await shot("1-landing");
      await page.goto(base + "/app?director=1&fast=1", { waitUntil: "commit" }); await page.waitForTimeout(7000); await page.waitForTimeout(800);
      await page.getByTestId("dir-skip").click(); await page.waitForTimeout(2500);
      await page.goto(base + "/app/pods", { waitUntil: "commit" }); await page.waitForTimeout(7000); await page.waitForTimeout(2500); await shot("2-room");
      const hrefs = await page.evaluate(() => [...document.querySelectorAll("a[href*='/app/pods/']")].map((a) => a.getAttribute("href")));
      const pod = hrefs.find((h) => /hoop|bask/i.test(h)) || hrefs[0] || "/app/pods/pod_hoopers";
      await page.goto(base + pod, { waitUntil: "commit" }); await page.waitForTimeout(7000); await page.waitForTimeout(3500); await shot("3-plan");
      const imIn = page.getByRole("button", { name: /I'm in/i }).first();
      if (await imIn.isVisible().catch(() => false)) { await imIn.click(); await page.waitForTimeout(4200); await shot("4-lock"); }
      else console.log(X, vn, "no I'm in");
      await page.goto(base + "/app/settings/safety", { waitUntil: "commit" }); await page.waitForTimeout(7000); await shot("5-safety");
    } catch (e) { console.log("ERR", X, vn, e.message.slice(0, 200)); }
    await ctx.close();
  }
  console.log("done", X);
}
await browser.close();
