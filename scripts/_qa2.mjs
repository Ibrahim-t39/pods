import { chromium } from 'playwright';
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const b = await chromium.launch({ executablePath: CHROME });
for (const [n,vp] of [['m',{width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true}],['d',{width:1440,height:900}]]) {
  const ctx = await b.newContext({viewport:{width:vp.width,height:vp.height},...vp});
  const p = await ctx.newPage();
  await p.goto('http://localhost:3000/',{waitUntil:'networkidle'});
  const H = await p.evaluate(()=>document.documentElement.scrollHeight);
  console.log(n,'height',H);
  let i=0;
  for (let y=0;y<H;y+=vp.height*0.9){ await p.evaluate(y=>window.scrollTo(0,y),y); await p.waitForTimeout(900); await p.screenshot({path:`shots/qa1/L-${n}-${String(i++).padStart(2,'0')}.png`}); }
  console.log(n,'frames',i);
}
await b.close();
