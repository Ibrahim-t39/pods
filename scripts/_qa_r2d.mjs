import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const vpn = process.argv[2] || "m";
const VP = { m:{viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true}, d:{viewport:{width:1440,height:900}}}[vpn];
const out="/Users/ibrahimtraore/Documents/PROPEL/PODS/v3/audit/r2/d"+vpn; mkdirSync(out,{recursive:true});
const b = await chromium.launch({executablePath:CHROME});
const ctx = await b.newContext({...VP, locale:"en-US", timezoneId:"America/Chicago"});
const page = await ctx.newPage(); page.setDefaultTimeout(5000);
let n=0;
const shot=async(name,w=900)=>{n++;await page.waitForTimeout(w);await page.screenshot({path:`${out}/${String(n).padStart(2,"0")}-${name}.png`});
 const t=await page.evaluate(()=>document.body.innerText.replace(/\s+/g," ").slice(0,260)); console.log(n,name,page.url().replace("http://localhost:3000",""),"|",t);};
const ctl=async()=>console.log("   >",(await page.evaluate(()=>[...document.querySelectorAll("button,a,input")].filter(e=>e.getBoundingClientRect().width>0&&!e.closest("[data-testid^=dir]")).map(e=>`${(e.innerText||e.value||e.getAttribute("aria-label")||"").replace(/\s+/g," ").slice(0,22)}[${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}]`).join(";"))).slice(0,500));
const tid=async(id,w=2500)=>{try{await page.getByTestId(id).click({timeout:4000});await page.waitForTimeout(w)}catch{console.log("  no tid",id)}};
await page.goto("http://localhost:3000/app?director=1&fast=1",{waitUntil:"domcontentloaded"}); await page.waitForTimeout(3500); await shot("director");
await tid("dir-skip",5000); await shot("placed",1500);

const navTo=async(t)=>{try{await page.getByRole("link",{name:new RegExp("^"+t)}).first().click({timeout:3000})}catch{try{await page.getByText(t,{exact:true}).last().click({timeout:3000})}catch{console.log("no nav",t)}}await page.waitForTimeout(2500)};

const closeDir=async()=>{try{await page.getByLabel("Close director panel").click({timeout:2000});await page.waitForTimeout(700)}catch{console.log("no close")}};


const openDir=async()=>{await page.keyboard.press("Control+.");await page.waitForTimeout(800)};
await closeDir();
await page.goto("http://localhost:3000/app/pods/pod_hoopers",{waitUntil:"domcontentloaded"}); await page.waitForTimeout(3500);
await page.getByRole("button",{name:/I'm in/}).first().click(); await page.waitForTimeout(6000);
await page.mouse.click(VP.viewport.width/2,200); await page.waitForTimeout(1500); await shot("locked-state",500);
await openDir(); await shot("dir-reopened",300);
await tid("dir-jump",3500); await tid("dir-checkin",3500); await closeDir();
await shot("home-post",2500); await ctl();
await page.goto("http://localhost:3000/app/pods/pod_hoopers",{waitUntil:"domcontentloaded"}); await shot("pod-post",3500); await ctl();
await page.goto("http://localhost:3000/app/pods/pod_hoopers/chat",{waitUntil:"domcontentloaded"}); await shot("chat-post",3000); await ctl();
await page.goto("http://localhost:3000/app/inbox",{waitUntil:"domcontentloaded"}); await shot("inbox-post",2500);
await page.goto("http://localhost:3000/app/plans",{waitUntil:"domcontentloaded"}); await shot("plans-post",2500);
await openDir(); await tid("dir-reveal",3500); await closeDir();
await page.goto("http://localhost:3000/app/pods/pod_hoopers",{waitUntil:"domcontentloaded"}); await shot("pod-reveal",3500); await ctl();
await page.goto("http://localhost:3000/app/home",{waitUntil:"domcontentloaded"}); await shot("home-reveal",3000);
await b.close();
