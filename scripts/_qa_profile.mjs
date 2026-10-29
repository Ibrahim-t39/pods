import { chromium } from "/Users/ibrahimtraore/Documents/PROPEL/pods-app/node_modules/playwright/index.mjs";
import { writeFileSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const out="/Users/ibrahimtraore/Documents/PROPEL/PODS/v3/final-pass/profile";
const VPS={m:{viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true},t:{viewport:{width:768,height:1024},deviceScaleFactor:1},d:{viewport:{width:1440,height:900},deviceScaleFactor:1}};
const routes=["/app/profile","/app/profile/edit","/app/settings","/app/settings/mode","/app/settings/privacy","/app/settings/safety","/app/settings/account","/app/settings/notifications","/app/safety","/app/inbox","/app/people","/app/people/u_maya","/app/invite","/admin","/admin/pods","/admin/hangouts","/admin/reports"];
const only=process.argv[2]; 
const b=await chromium.launch({executablePath:CHROME});
const res=[];
for(const [vn,vp] of Object.entries(VPS)){
 if(only&&!only.includes(vn))continue;
 for(const state of ["demo","live"]){
  const ctx=await b.newContext({...vp,locale:"en-US"});
  const page=await ctx.newPage(); page.setDefaultTimeout(15000);
  const errs=[]; page.on("pageerror",e=>errs.push(e.message.slice(0,120))); page.on("console",m=>m.type()==="error"&&errs.push(m.text().slice(0,120)));
  for(const r of routes){
    errs.length=0;
    const q=state==="demo"?"?mode=demo&director=1&fast=1":"?mode=live";
    try{await page.goto("http://localhost:3000"+r+q,{waitUntil:"domcontentloaded",timeout:20000});}catch(e){res.push({r,vn,state,err:"nav"});continue}
    await page.waitForTimeout(1200);
    let m;for(let k=0;k<3&&!m;k++){try{m=await page.evaluate(()=>{
      const vis=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=="hidden"&&s.display!=="none"};
      const small=[...document.querySelectorAll("button,a,input,select,textarea,[role=button]")].filter(vis).filter(e=>{const r=e.getBoundingClientRect();return r.height<44||r.width<44}).map(e=>(e.innerText||e.getAttribute("aria-label")||e.tagName).replace(/\s+/g," ").slice(0,18)+`[${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}]`);
      const clipped=[...document.querySelectorAll("body *")].filter(e=>vis(e)&&e.children.length===0&&e.textContent.trim()&&(e.scrollWidth>e.clientWidth+2&&getComputedStyle(e).overflow!=="visible")).map(e=>e.textContent.trim().slice(0,25));
      const offs=[...document.querySelectorAll("body *")].filter(e=>{if(!vis(e)||!e.textContent.trim()||e.children.length)return false;const r=e.getBoundingClientRect();return r.right>innerWidth+1||r.left<-1}).map(e=>e.textContent.trim().slice(0,25));
      const btns=[...document.querySelectorAll("button,a")].filter(vis).map(e=>({e,r:e.getBoundingClientRect()}));
      const ov=[];for(let i=0;i<btns.length;i++)for(let j=i+1;j<btns.length;j++){const a=btns[i].r,c=btns[j].r;if(btns[i].e.contains(btns[j].e)||btns[j].e.contains(btns[i].e))continue;const w=Math.min(a.right,c.right)-Math.max(a.left,c.left),h=Math.min(a.bottom,c.bottom)-Math.max(a.top,c.top);if(w>4&&h>4)ov.push((btns[i].e.innerText||"").slice(0,12)+"|"+(btns[j].e.innerText||"").slice(0,12))}
      return {hscroll:document.documentElement.scrollWidth>innerWidth+1,small:small.slice(0,8),smallN:small.length,clipped:clipped.slice(0,4),offs:offs.slice(0,4),ov:ov.slice(0,4),text:document.body.innerText.replace(/\s+/g," ").slice(0,70),banned:(document.body.innerText.match(/claude/gi)||[]).length}});}catch{await page.waitForTimeout(1500)}}
    if(!m){res.push({r,vn,state,err:'eval'});continue}
    await page.screenshot({path:`${out}/${state}-${vn}-${r.replace(/[^a-z0-9]+/gi,"_")}.png`,fullPage:vn==="m"});
    res.push({r,vn,state,...m,errs:[...errs].slice(0,2)});
  }
  await ctx.close();
 }
}
writeFileSync(out+"/signals-"+(only||"all")+".json",JSON.stringify(res,null,1));
for(const x of res){const bad=x.err||x.hscroll||x.smallN||x.clipped?.length||x.offs?.length||x.ov?.length||x.errs?.length||x.banned;if(bad)console.log(x.vn,x.state,x.r,JSON.stringify({h:x.hscroll,s:x.small,c:x.clipped,o:x.offs,ov:x.ov,e:x.errs,b:x.banned,err:x.err}))}
await b.close();
