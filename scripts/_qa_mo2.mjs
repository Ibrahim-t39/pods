import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const vpn = process.argv[2]||"mobile";
const VP = { mobile:{viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true}, desktop:{viewport:{width:1440,height:900}}}[vpn];
const out=`/tmp/qa2/${vpn}2`; mkdirSync(out,{recursive:true});
const b=await chromium.launch({executablePath:CHROME});
const ctx=await b.newContext({...VP,locale:"en-US"});
const page=await ctx.newPage(); page.setDefaultTimeout(6000);
const errs=[]; page.on("pageerror",e=>errs.push(e.message)); page.on("console",m=>m.type()==="error"&&errs.push(m.text().slice(0,140)));
let n=0; const shot=async(nm,w=900)=>{n++;await page.waitForTimeout(w);await page.screenshot({path:`${out}/${String(n).padStart(2,"0")}-${nm}.png`});console.log(nm,page.url().replace("http://localhost:3000",""),"sw",await page.evaluate(()=>document.documentElement.scrollWidth),"|",(await page.evaluate(()=>document.body.innerText)).replace(/\s+/g," ").slice(0,140));};
const click=async(t,o={})=>{try{await page.getByText(t,{exact:false}).first().click({timeout:2500,...o});return true}catch{console.log("  !! no",t);return false}};
const btn=async(re)=>{try{await page.getByRole("button",{name:re}).first().click({timeout:2500});return true}catch{console.log("  !! nobtn",re);return false}};
await page.goto("http://localhost:3000/app/onboarding/about",{waitUntil:"domcontentloaded"}); await page.waitForTimeout(2500);
await page.getByLabel("First name").fill("Chanda"); await page.getByLabel("Age").fill("22"); await btn(/^Next/);
await page.waitForTimeout(1200);
await click("basketball"); await click("guitar"); await click("Community pods"); await page.waitForTimeout(600); await shot("comm-open");
await click("Zambian"); await click("Seventh-day"); await shot("interests-done"); await btn(/^Next/);
await page.waitForTimeout(1200); 
for(const l of ["M","T","W","F","S"]){ for(const bt of await page.$$("button:visible")){ if((await bt.innerText()).trim()===l){try{await bt.click({timeout:500})}catch{};break;} } }
await shot("avail"); await btn(/^Next/); await page.waitForTimeout(1000); await shot("step4"); 
for(let i=0;i<3;i++){ if(!/placing|app\/home|pods/.test(page.url())){ await btn(/^(Next|Done|I promise|Promise|Keep|Finish|Continue)/i); await page.waitForTimeout(1200);} }
await shot("placing",1500); await shot("reveal",4500); await shot("reveal2",3000);
console.log("url",page.url());
await page.goto("http://localhost:3000/app/home",{waitUntil:"domcontentloaded"}); await shot("home",2500);
await page.evaluate(()=>window.scrollTo(0,500)); await shot("home-scroll");
for(const r of ["pods","plans","discover","inbox","settings","safety","profile","search","people","invite"]){await page.goto("http://localhost:3000/app/"+r,{waitUntil:"domcontentloaded"});await shot("r-"+r,1500);}
console.log("errs",errs); await b.close();
