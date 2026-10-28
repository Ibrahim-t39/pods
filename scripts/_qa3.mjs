import { chromium } from 'playwright';
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const b = await chromium.launch({ executablePath: CHROME });
for (const [n,vp] of [['m',{width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true}],['d',{width:1440,height:900}]]) {
  const ctx = await b.newContext({viewport:{width:vp.width,height:vp.height},...vp});
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:3000/app?director=1&mode=demo',{waitUntil:'networkidle'});
  await p.waitForTimeout(1500);
  await p.getByText('Skip to placed').first().click({force:true}).catch(e=>console.log('skipfail'));
  await p.waitForTimeout(4000);
  console.log(n,p.url());
  await p.keyboard.press('Control+.'); await p.waitForTimeout(500);
  for (const r of ['/app/home','/app/pods','/app/plans','/app/events','/app/inbox','/app/people','/app/profile','/app/settings','/app/discover','/app/search','/app/invite','/app/safety','/app/settings/mode']) {
    await p.goto('http://localhost:3000'+r,{waitUntil:'networkidle'}); await p.waitForTimeout(1500);
    const slug=r.replace(/[^a-z0-9]+/gi,'_');
    await p.screenshot({path:`shots/qa1/S-${n}${slug}.png`});
    const t=await p.evaluate(()=>({u:location.pathname,w:document.body.innerText.replace(/\s+/g,' ').split(' ').length,sx:document.documentElement.scrollWidth>innerWidth,t:document.body.innerText.replace(/\s+/g,' ').slice(0,260)}));
    console.log(n,r,JSON.stringify(t));
  }
  console.log(errs.slice(0,3));
}
await b.close();
