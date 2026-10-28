import { chromium } from "playwright";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const OUT="/private/tmp/claude-501/-Users-ibrahimtraore-Documents-PROPEL/192ac6d2-3129-48a3-9409-2f4587345c61/scratchpad/r1";
const b = await chromium.launch({executablePath:CHROME});
for (const [n,vp] of [["m",{viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true}],["d",{viewport:{width:1440,height:900}}]]) {
 const ctx = await b.newContext(vp); const p = await ctx.newPage();
 const errs=[]; p.on("pageerror",e=>errs.push(e.message));
 await p.goto("http://localhost:3000/",{waitUntil:"networkidle"}); await p.waitForTimeout(1500);
 const H = await p.evaluate(()=>document.documentElement.scrollHeight);
 console.log(n,"height",H, "hscroll", await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
 const steps=[0,0.5,1,1.6,2.4,3.2,4.2,5.2,6.2,7.5,9];
 let i=0; for (const s of steps){ const y=s*vp.viewport.height; if(y>H) break; await p.evaluate(y=>scrollTo(0,y),y); await p.waitForTimeout(900); await p.screenshot({path:`${OUT}/land-${n}-${String(i++).padStart(2,"0")}.png`}); }
 console.log(n,"text:", (await p.evaluate(()=>document.body.innerText)).replace(/\s+/g," ").slice(0,1800));
 console.log("svgs",await p.evaluate(()=>document.querySelectorAll("svg").length), errs);
}
await b.close();
