import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const vpn = process.argv[2] || "m";
const VP = { m:{viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true}, d:{viewport:{width:1440,height:900}}}[vpn];
const out="/Users/ibrahimtraore/Documents/PROPEL/PODS/v3/audit/r2/k"+vpn; mkdirSync(out,{recursive:true});
const b = await chromium.launch({executablePath:CHROME});
const ctx = await b.newContext({...VP, locale:"en-US", timezoneId:"America/Los_Angeles"});
const page = await ctx.newPage(); page.setDefaultTimeout(6000);
let n=0;
const shot=async(name,w=900)=>{n++;await page.waitForTimeout(w);await page.screenshot({path:`${out}/${String(n).padStart(2,"0")}-${name}.png`});
 const t=await page.evaluate(()=>document.body.innerText.replace(/\s+/g," ").slice(0,230)); console.log(n,name,page.url().replace("http://localhost:3000",""),"|",t);};
const next=async(re=/^(Next|Done|Keep|Promise|Place|Finish|Continue|Send|I promise|Yes|Begin|Let)/i)=>{try{await page.getByRole("button",{name:re}).first().click({timeout:3000});await page.waitForTimeout(1500);return true}catch{console.log("  no next");return false}};
await page.goto("http://localhost:3000/app/onboarding/about",{waitUntil:"domcontentloaded"}); await page.waitForTimeout(2500);
await page.getByLabel("First name").fill("Chanda"); await page.getByLabel("Age").fill("22"); await shot("about");
await next();
await shot("interests",1200);
await page.getByText("basketball").first().click(); await page.getByText("guitar").first().click();
await page.getByText("Community pods").first().click(); await page.waitForTimeout(900);
await page.getByText("Southern African").first().click(); await page.getByText("Seventh-day").first().click(); await shot("communities",500);
await page.getByRole("button",{name:/Done/}).click(); await page.waitForTimeout(800); await shot("interests-filled",300);
await next();
await shot("availability",1200);
for(const l of ["M","T","W","T","F","S","S"].slice(0,0)){}
const days=await page.$$("button:visible"); let c=0; for(const d of days){const t=(await d.innerText()).trim(); if(/^[MTWFS]$/.test(t)&&c<7){ if(["T","S","F"].includes(t)||c===5||c===6){await d.click();} c++;}}
await shot("availability-set",500);
await next();
await shot("step",1500);
try{await page.getByLabel(/phone|number/i).fill("2065550123")}catch{}
await next(/Send code/i); await shot("code",800);
await page.keyboard.type("123456",{delay:120}); await page.waitForTimeout(2000); await shot("after-code",500);
for(let i=0;i<4;i++){ if(/placing|\/pods|home/.test(page.url()))break; await next(/^(Next|Done|Keep|Promise|Place|Finish|Continue|I promise|Yes|Skip|Not now|Later|I'm|Get|Take)/i); await shot("step"+i,1500);}
try{await page.getByText("Without the camera").click();await page.waitForTimeout(1500)}catch{console.log("no nocam")}
await shot("verify-nocam",500);
for(let i=0;i<4;i++){await next(/^(Next|Done|Continue|Start|Verify|Yes|Skip|I'm|Confirm|Take|Check)/i); await shot("v"+i,1500);}

const ctl=async()=>console.log("   >",(await page.evaluate(()=>[...document.querySelectorAll("button,a,input")].filter(e=>e.getBoundingClientRect().width>0).map(e=>`${(e.innerText||e.value||e.getAttribute("aria-label")||"").replace(/\s+/g," ").slice(0,22)}[${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}]`).join(";"))).slice(0,500));
const go=async(u,name,w=2500)=>{await page.goto("http://localhost:3000"+u,{waitUntil:"domcontentloaded"});await shot(name,w)};
await page.waitForTimeout(4000); await shot("home",500); await ctl();
await page.getByText("Pickup basketball").first().click(); await shot("plan",3500); await ctl();
await page.mouse.wheel(0,600); await shot("plan-scroll",600);
try{await page.getByRole("button",{name:/I'm in/}).first().click();}catch{console.log("no imin")}
await shot("imin",700); await shot("lock",2500); await shot("lock-late",5000); await ctl();
await page.mouse.click(VP.viewport.width/2,300); await shot("after-lock",1500); await ctl();
await go("/app/pods/pod_hoopers/details","details",2500); await page.mouse.wheel(0,500); await shot("details-scroll",700);
await go("/app/pods","pods"); await ctl();
await go("/app/pods/pod_hoopers","pod"); await ctl();
await go("/app/pods/pod_hoopers/chat","chat"); await ctl();
await go("/app/pods/pod_hoopers/members","members");
await go("/app/pods/pod_hoopers/settings","podsettings");
await go("/app/plans","plans"); await go("/app/discover","discover"); await go("/app/inbox","inbox"); await go("/app/people","people"); await go("/app/profile","profile");
await go("/app/settings","settings"); await go("/app/settings/mode","mode"); await go("/app/safety","safety"); await go("/app/search","search"); await go("/app/invite","invite");
await b.close();
