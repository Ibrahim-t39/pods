import { chromium } from 'playwright';
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const b = await chromium.launch({ executablePath: CHROME });
const routes = ['/','/app','/app?director=1','/privacy','/safety','/terms','/waitlist','/admin','/app/pods','/app/plans','/app/inbox','/app/settings','/app/discover'];
for (const [n,vp] of [['m',{width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true}],['d',{width:1440,height:900}]]) {
  const ctx = await b.newContext({viewport:{width:vp.width,height:vp.height},...vp});
  const p = await ctx.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
  for (const r of routes) {
    const resp = await p.goto('http://localhost:3000'+r,{waitUntil:'networkidle'}).catch(e=>null);
    await p.waitForTimeout(1200);
    const slug=r.replace(/[^a-z0-9]+/gi,'-')||'home';
    await p.screenshot({path:`shots/qa1/${slug}.${n}.png`});
    const t = await p.evaluate(()=>({url:location.pathname+location.search,txt:document.body.innerText.replace(/\s+/g,' ').slice(0,600),sx:document.documentElement.scrollWidth>innerWidth}));
    console.log(n,r,resp?.status(),JSON.stringify(t));
  }
  console.log(n,'ERRS',errs.slice(0,5));
}
await b.close();
