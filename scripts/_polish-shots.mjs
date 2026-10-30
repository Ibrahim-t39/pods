import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const tag=process.argv[2]||"before";
const only=process.argv[3]?process.argv[3].split(","):null;
const out=`/Users/ibrahimtraore/Documents/PROPEL/PODS/v3/polish/${tag}`; mkdirSync(out,{recursive:true});
const VPS={m:{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true},d:{viewport:{width:1440,height:900},deviceScaleFactor:1}};
let routes=["/app/home","/app/pods","/app/pods/pod_hoopers","/app/pods/pod_hoopers/chat","/app/plans","/app/discover","/app/inbox","/app/people","/app/profile","/app/settings","/app/safety","/app/search","/app/placing","/app/onboarding/about"];
if(only) routes=routes.filter(r=>only.some(o=>r.includes(o)));
const b=await chromium.launch({executablePath:CHROME});
for(const [vn,vp] of Object.entries(VPS)){
 for(const state of ["demo","live"]){
  if(state==="live"&&process.env.NOLIVE) continue;
  const ctx=await b.newContext({...vp,locale:"en-US",timezoneId:"America/Chicago",reducedMotion:"reduce"});
  const page=await ctx.newPage(); page.setDefaultTimeout(30000);
  const wait=ms=>page.waitForTimeout(ms);
  const btn=(re)=>page.getByRole("button",{name:re}).filter({visible:true}).first();
  try{
  {
    await page.goto(`http://localhost:3000/app?mode=${state}`,{waitUntil:"load"});
    await page.waitForURL(/\/app\/(onboarding|welcome)/,{timeout:120000});
    if(/welcome/.test(page.url())) { const s=btn(/^Get started$/); if(await s.isVisible().catch(()=>false)) await s.click(); }
    await page.waitForURL(/onboarding\/about/);
    await page.getByLabel("First name").fill("Chanda"); await page.getByLabel("Age").fill("22");
    await btn(/^Next$/).click(); await page.waitForURL(/onboarding\/interests/); await wait(600);
    for(const like of ["basketball","guitar"]){const re=new RegExp(`^${like}$`,"i"); for(let i=0;i<6&&!(await btn(re).isVisible().catch(()=>false));i++){await btn(/More likes/).click();await wait(500);} await btn(re).click(); await wait(250);}
    await btn(/^Next$/).click(); await page.waitForURL(/onboarding\/availability/); await wait(600);
    for(const d of ["Saturday","Sunday"]) await page.getByRole("button",{name:d}).first().click();
    await btn(/^Next$/).click(); await page.waitForURL(/onboarding\/account/);
    await page.getByPlaceholder(/555/).fill("2565550142"); await btn(/^Send code$/).click();
    await page.locator("input[autocomplete='one-time-code']").fill("123456");
    await page.waitForURL(/onboarding\/pledge/,{timeout:60000}); await btn(/^I promise$/).click();
    await page.waitForURL(/\/app\/verify/,{timeout:60000}); await wait(500);
    const w=btn(/^Without the camera$/); if(await w.isVisible().catch(()=>false)) await w.click(); else await btn(/^Start$/).click();
    await page.waitForURL(/\/app\/placing/,{timeout:90000}); await wait(6000);
    const c=btn(/^Continue$/); if(await c.isVisible().catch(()=>false)) await c.click(); await wait(1500);
  }
  }catch(e){console.log("setup fail",state,vn,e.message.slice(0,200));}
  for(const r of routes){
    const q="";
    try{await page.goto("http://localhost:3000"+r+q,{waitUntil:"domcontentloaded",timeout:20000});}catch(e){console.log("navfail",r);continue}
    await page.waitForTimeout(2000);
    const f=`${state}-${vn}-${r.replace(/[^a-z0-9]+/gi,"_")}.png`;
    await page.screenshot({path:`${out}/${f}`});
    console.log(f, page.url().replace("http://localhost:3000",""));
  }
  await ctx.close();
 }
}
await b.close();
