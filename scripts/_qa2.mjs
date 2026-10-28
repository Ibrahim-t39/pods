import { chromium } from "playwright";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const b = await chromium.launch({ executablePath: CHROME });
const which = process.argv[2]||"m";
const vp = which==="m"?{viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true}:{viewport:{width:1440,height:900}};
const ctx = await b.newContext({...vp, timezoneId:"America/Chicago"});
const p = await ctx.newPage();
const errs=[]; p.on("pageerror",e=>errs.push(e.message));
let i=0;
const snap=async(name)=>{i++; await p.waitForTimeout(900); await p.screenshot({path:`shots/qa1/${which}-${String(i).padStart(2,"0")}-${name}.png`});
 const t=await p.evaluate(()=>[...document.querySelectorAll("button,a,input,[role=button]")].filter(e=>e.offsetParent||getComputedStyle(e).position==="fixed").map(e=>(e.innerText||e.placeholder||e.getAttribute("aria-label")||"").replace(/\s+/g," ").trim().slice(0,40)).join(" | "));
 const w=await p.evaluate(()=>document.body.innerText.replace(/\s+/g," ").slice(0,300));
 console.log(`## ${name} ${p.url()}\n TEXT: ${w}\n TAP: ${t}`);};
await p.goto("http://localhost:3000/app/onboarding/about"); await snap("about");
const inputs=p.locator("input:visible");
console.log("inputs",await inputs.count());
await inputs.nth(0).fill("Chanda"); await inputs.nth(1).fill("22"); await snap("about-filled");
await p.getByRole("button",{name:/next/i}).click(); await snap("step2");
for (let k=0;k<12;k++){
  const nxt=p.getByRole("button",{name:/next|continue|done|send|place|i'm in|promise|keep/i}).filter({visible:true}).last();
  // try select likes
  const radios=p.locator("[role=checkbox]:visible,[role=option]:visible,[aria-pressed]:visible");
  const rc=await radios.count();
  if(rc>0){ for(let j=0;j<Math.min(rc,3);j++){ await radios.nth(j).click().catch(()=>{});} }
  await p.waitForTimeout(300);
  if(!(await nxt.count())) break;
  if(await nxt.isDisabled()) { await snap("stuck"+k); break; }
  await nxt.click().catch(()=>{}); await snap("s"+k);
  if(/pods$|placing/.test(p.url())) break;
}
console.log("ERR",errs.slice(0,5));
await b.close();
