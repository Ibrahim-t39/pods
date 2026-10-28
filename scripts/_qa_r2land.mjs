import { chromium } from "playwright";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const out="/Users/ibrahimtraore/Documents/PROPEL/PODS/v3/audit/r2";
const b=await chromium.launch({executablePath:CHROME});
for(const [vn,vp] of [["m",{viewport:{width:390,height:844},isMobile:true,hasTouch:true}],["d",{viewport:{width:1440,height:900}}]]){
 const ctx=await b.newContext(vp); const p=await ctx.newPage();
 await p.goto("http://localhost:3000/",{waitUntil:"domcontentloaded"}); await p.waitForTimeout(2500);
 const H=await p.evaluate(()=>document.documentElement.scrollHeight);
 const step=vp.viewport.height*0.9; let i=0;
 for(let y=0;y<H && i<12;y+=step*1.0,i++){ await p.evaluate(y=>window.scrollTo(0,y),y); await p.waitForTimeout(900); await p.screenshot({path:`${out}/land-${vn}-${String(i).padStart(2,"0")}.png`});}
 console.log(vn,H,i);
}
await b.close();
