import { chromium } from "playwright";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const vpn=process.argv[2]; const VP={m:{viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true},d:{viewport:{width:1440,height:900},deviceScaleFactor:1}}[vpn];
const out="/private/tmp/claude-501/-Users-ibrahimtraore-Documents-PROPEL/192ac6d2-3129-48a3-9409-2f4587345c61/scratchpad/qa/L"+vpn;
import {mkdirSync} from "node:fs"; mkdirSync(out,{recursive:true});
const b=await chromium.launch({executablePath:CHROME}); const ctx=await b.newContext({...VP,locale:"en-US"}); const page=await ctx.newPage();
await page.goto("http://localhost:3000/",{waitUntil:"domcontentloaded"}); await page.waitForTimeout(2500);
const H=await page.evaluate(()=>document.documentElement.scrollHeight); console.log("H",H);
let i=0; for(let y=0;y<H;y+=VP.viewport.height*0.8){ await page.evaluate(y=>window.scrollTo(0,y),y); await page.waitForTimeout(900); await page.screenshot({path:out+"/"+String(i++).padStart(2,"0")+".png"}); if(i>14)break;}
await b.close();
