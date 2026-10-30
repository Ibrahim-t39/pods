import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const vpn = process.argv[2] || "m";
const VP = { m:{viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true}, d:{viewport:{width:1440,height:900},deviceScaleFactor:1}}[vpn];
const out="/Users/ibrahimtraore/Documents/PROPEL/PODS/v3/audit/r1motion/j"+vpn; mkdirSync(out,{recursive:true});
const b = await chromium.launch({executablePath:CHROME});
const ctx = await b.newContext({...VP, locale:"en-US", timezoneId:"America/Los_Angeles"});
const page = await ctx.newPage(); page.setDefaultTimeout(8000);
const errs=[]; page.on("pageerror",e=>errs.push(e.message.slice(0,140)));
let n=0;
const shot=async(name,w=1000)=>{n++;await page.waitForTimeout(w);await page.screenshot({path:`${out}/${String(n).padStart(2,"0")}-${name}.png`});
 const t=await page.evaluate(()=>document.body.innerText.replace(/\s+/g," ").slice(0,200)); console.log(n,name,page.url().replace("http://localhost:3000",""),"|",t);};
const ctl=async()=>console.log("   >",(await page.evaluate(()=>[...document.querySelectorAll("button,a,input")].filter(e=>e.getBoundingClientRect().width>0).map(e=>`${(e.innerText||e.value||e.getAttribute("aria-label")||e.placeholder||"").replace(/\s+/g," ").slice(0,20)}[${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}]`).join(";"))).slice(0,400));
const click=async(t,w=1200)=>{try{await page.getByText(t,{exact:false}).first().click({timeout:3000});await page.waitForTimeout(w);return true}catch{console.log("  !! no",t);return false}};
const btn=async(r,w=1200)=>{try{await page.getByRole("button",{name:r}).first().click({timeout:3000});await page.waitForTimeout(w);return true}catch{console.log("  !! no btn",r);return false}};
await page.goto("http://localhost:3000/",{waitUntil:"domcontentloaded"}); await shot("landing",2500);
await click("Take your seat"); await shot("after-cta",2000); await ctl();
for(let i=0;i<9;i++){
  try{await page.getByLabel("First name").fill("Chanda",{timeout:1500})}catch{}
  try{await page.getByLabel("Age").fill("22",{timeout:1500})}catch{}
  for(const t of ["Basketball","Guitar"]) { try{await page.getByText(t,{exact:false}).first().click({timeout:700})}catch{} }
  if(/interests/.test(page.url())){ try{await page.getByText("Community pods").first().click({timeout:1500}); await page.waitForTimeout(800); await shot("communities",300);}catch{} for(const t of ["Zambian","Seventh-day"]){try{await page.getByText(t).first().click({timeout:1500})}catch{console.log("no",t)}} }
  if(/availability/.test(page.url())){ const bs=await page.$$("button:visible"); for(const bt of bs){const tx=((await bt.innerText())||"").trim(); if(tx.length<=2){try{await bt.click({timeout:500})}catch{}}} }
  await shot("ob"+i,600); await ctl();
  if(/placing|pods$|home/.test(page.url()))break;
  try{await page.getByRole("button",{name:/^(Next|Done|Keep|Promise|I promise|Place|Finish|Continue|Send|Skip|Place me|Find)/i}).first().click({timeout:2000})}catch{console.log("  no next");break}
  await page.waitForTimeout(1500);
}
await page.waitForTimeout(5000); await shot("placing-or-reveal",500); await ctl();
await page.waitForTimeout(5000); await shot("reveal2",500); await ctl();
console.log("URL",page.url());
await page.goto("http://localhost:3000/app/pods",{waitUntil:"domcontentloaded"}); await shot("pods",3000); await ctl();
await page.goto("http://localhost:3000/app/home",{waitUntil:"domcontentloaded"}); await shot("home",3000); await ctl();
await click("Open the plan",3000); await shot("plan",3500); await ctl();
await btn(/I'm in/,800); await shot("imin",1500); await shot("lock",3000); await shot("lock-late",5000); await ctl();
await page.mouse.click(VP.viewport.width/2,VP.viewport.height/2); await shot("after-lock",1500); await ctl();
await page.goto("http://localhost:3000/app/pods/pod_hoopers/details",{waitUntil:"domcontentloaded"}); await shot("details",3000); await page.mouse.wheel(0,700); await shot("details-scroll",800);
await page.goto("http://localhost:3000/app?director=1&fast=1",{waitUntil:"domcontentloaded"}); await shot("director",3000);
console.log(await page.evaluate(()=>[...document.querySelectorAll("[data-testid]")].map(e=>e.dataset.testid).join(",")));
for(const id of ["dir-jump","dir-checkin"]){ try{await page.getByTestId(id).click({timeout:3000});await page.waitForTimeout(1500)}catch{console.log("no",id)}}
await shot("dir-after",1500);
await page.goto("http://localhost:3000/app/pods/pod_hoopers",{waitUntil:"domcontentloaded"}); await shot("pod-after",4000); await ctl();
await page.goto("http://localhost:3000/app/pods/pod_hoopers/chat",{waitUntil:"domcontentloaded"}); await shot("chat",3000); await ctl();
await page.goto("http://localhost:3000/app/settings",{waitUntil:"domcontentloaded"}); await shot("settings",3000);
await page.goto("http://localhost:3000/app/safety",{waitUntil:"domcontentloaded"}); await shot("safety",3000);
await page.goto("http://localhost:3000/privacy",{waitUntil:"domcontentloaded"}); await shot("privacy",2000);
await page.goto("http://localhost:3000/admin",{waitUntil:"domcontentloaded"}); await shot("admin",2000);
console.log("errs",errs);
await b.close();
