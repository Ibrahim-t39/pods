import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const vpn = process.argv[2] || "mobile";
const VP = { mobile:{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}, desktop:{viewport:{width:1440,height:900},deviceScaleFactor:1}}[vpn];
const out = `/tmp/qa/b-${vpn}`; mkdirSync(out,{recursive:true});
const b = await chromium.launch({executablePath:CHROME});
const ctx = await b.newContext({...VP, locale:"en-US", timezoneId:"America/Chicago"});
const page = await ctx.newPage(); page.setDefaultTimeout(20000);
let n=0; const shot=async(name,w=1200)=>{n++;await page.waitForTimeout(w);await page.screenshot({path:`${out}/${String(n).padStart(2,"0")}-${name}.png`});};
const ctl=async()=>console.log("  >",page.url().replace("http://localhost:3000",""),"|",(await page.evaluate(()=>[...document.querySelectorAll("button,a,input")].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return `${(e.innerText||e.value||e.getAttribute("aria-label")||"").replace(/\s+/g," ").slice(0,20)}[${Math.round(r.width)}x${Math.round(r.height)}]`}).join(";"))).slice(0,500));
const tid=async(id)=>{try{await page.getByTestId(id).click({timeout:5000});await page.waitForTimeout(900)}catch{console.log("no testid",id)}};
await page.goto("http://localhost:3000/app?director=1&fast=1",{waitUntil:"domcontentloaded"}); await page.waitForTimeout(4000);
await shot("director"); 
console.log(await page.evaluate(()=>[...document.querySelectorAll("[data-testid]")].map(e=>e.dataset.testid).join(",")));
await tid("dir-skip"); await page.waitForTimeout(2500);
await shot("after-skip"); await ctl();

const txt=async()=>console.log("   TXT:",(await page.evaluate(()=>document.body.innerText)).replace(/\s+/g," ").slice(0,350));
await page.goto("http://localhost:3000/app/pods",{waitUntil:"domcontentloaded"}); await page.waitForTimeout(3500);
const clickT=async(t,o={})=>{try{await page.getByText(t,{exact:o.exact??false}).first().click({timeout:4000});await page.waitForTimeout(o.w??1500);return true}catch{console.log("  !! no",t);return false}};

await clickT("Open the plan",{w:5500}); 
const btn=async(r)=>{try{await page.getByRole("button",{name:r}).first().click({timeout:5000});await page.waitForTimeout(700);return true}catch{console.log("  !! no btn",r);return false}};
await btn(/I'm in/); await shot("imin-0.7s",300); await shot("imin-2s",1500);await txt();
await shot("lock-4s",2500); await txt(); await ctl();
await shot("lock-8s",4000); await txt(); await ctl();
await page.mouse.click(195,420); await shot("lock-after-tap",1500); await txt();
// scroll the details sheet
await page.goto("http://localhost:3000/app/pods/pod_hoopers/details",{waitUntil:"domcontentloaded"}); await page.waitForTimeout(3500); await shot("details"); await page.mouse.wheel(0,700); await shot("details2"); await txt();
await page.goto("http://localhost:3000/app?director=1&fast=1",{waitUntil:"domcontentloaded"}); await page.waitForTimeout(3500);
await tid("dir-jump"); await tid("dir-checkin"); await shot("dir-after"); 
await page.goto("http://localhost:3000/app/pods/pod_hoopers",{waitUntil:"domcontentloaded"}); await page.waitForTimeout(4500); await shot("after-hangout"); await txt(); await ctl();
await b.close();
