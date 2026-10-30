import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const out="/Users/ibrahimtraore/Documents/PROPEL/PODS/v3/audit/r2"; mkdirSync(out,{recursive:true});
const VPS={m:{viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true},d:{viewport:{width:1440,height:900},deviceScaleFactor:1}};
const routes=["/","/waitlist","/privacy","/terms","/safety","/app","/app/welcome","/app/onboarding/about","/app/onboarding/city","/app/onboarding/interests","/app/onboarding/communities","/app/onboarding/availability","/app/onboarding/pledge","/app/onboarding/photo","/app/onboarding/account","/app/verify","/app/placing","/app/home","/app/pods","/app/pods/pod_hoopers","/app/pods/pod_hoopers/chat","/app/pods/pod_hoopers/details","/app/pods/pod_hoopers/members","/app/pods/pod_hoopers/memories","/app/pods/pod_hoopers/settings","/app/plans","/app/discover","/app/inbox","/app/people","/app/profile","/app/profile/edit","/app/settings","/app/settings/mode","/app/settings/privacy","/app/settings/safety","/app/settings/account","/app/settings/notifications","/app/safety","/app/search","/app/invite","/app/events","/admin","/admin/pods","/admin/hangouts","/admin/reports","/offline","/i/abc123"];
const b=await chromium.launch({executablePath:CHROME});
const res=[];
for(const [vn,vp] of Object.entries(VPS)){
 for(const state of ["new","demo"]){
  const ctx=await b.newContext({...vp,locale:"en-US",timezoneId:"America/Los_Angeles"});
  const page=await ctx.newPage(); page.setDefaultTimeout(15000);
  const errs=[]; page.on("pageerror",e=>errs.push(e.message.slice(0,120))); page.on("console",m=>m.type()==="error"&&errs.push(m.text().slice(0,120)));
  for(const r of routes){
    errs.length=0;
    const q=state==="demo"?(r.includes("?")?"&":"?")+"mode=demo&director=1&fast=1":"";
    try{await page.goto("http://localhost:3000"+r+q,{waitUntil:"domcontentloaded",timeout:20000});}catch(e){res.push({r,vn,state,err:"nav "+e.message.slice(0,60)});continue}
    await page.waitForTimeout(2200);
    const m=await page.evaluate(()=>{
      const t=document.body.innerText||""; const words=t.split(/\s+/).filter(Boolean).length;
      const tap=[...document.querySelectorAll("button,a,input,select,textarea,[role=button]")].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0});
      const small=tap.filter(e=>{const r=e.getBoundingClientRect();return r.height<44||r.width<44}).map(e=>(e.innerText||e.getAttribute("aria-label")||e.tagName).replace(/\s+/g," ").slice(0,18)+`[${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}]`);
      const banned=(t.match(/demo|sample|pilot|simulated|prototype|synthetic|placeholder|huntsville|alabama|claude|lorem/gi)||[]);
      return {words,taps:tap.length,small:small.slice(0,6),smallN:small.length,h1:document.querySelectorAll("h1").length,hscroll:document.documentElement.scrollWidth>innerWidth+1,sh:document.documentElement.scrollHeight,banned:[...new Set(banned.map(s=>s.toLowerCase()))],text:t.replace(/\s+/g," ").slice(0,160),url:location.pathname}});
    const f=`${state}-${vn}-${r.replace(/[^a-z0-9]+/gi,"_")}.png`;
    await page.screenshot({path:`${out}/${f}`});
    res.push({r,vn,state,...m,errs:[...errs].slice(0,2),f});
  }
  await ctx.close();
 }
}
writeFileSync(out+"/signals.json",JSON.stringify(res,null,1));
await b.close();
