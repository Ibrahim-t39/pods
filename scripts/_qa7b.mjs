import { chromium } from "playwright";
import {mkdirSync} from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const vpn=process.argv[2];
const VP={mobile:{viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true},desktop:{viewport:{width:1440,height:900}}}[vpn];
const out=`/tmp/qa7/${vpn}`; mkdirSync(out,{recursive:true});
const b=await chromium.launch({executablePath:CHROME});
const ctx=await b.newContext({...VP,locale:"en-US"});
const page=await ctx.newPage(); page.setDefaultTimeout(6000);
let n=100;
const shot=async(name,full)=>{n++;await page.waitForTimeout(1500);await page.screenshot({path:`${out}/${n}-${name}.png`,fullPage:!!full});
 const m=await page.evaluate(()=>({sx:document.documentElement.scrollWidth>innerWidth,h:document.documentElement.scrollHeight,u:location.pathname+location.search,txt:document.body.innerText.replace(/\s+/g," ").slice(0,140)}));console.log(n,name,JSON.stringify(m));};
const go=async(u)=>{await page.goto("http://localhost:3000"+u,{waitUntil:"domcontentloaded"});};
const click=async(t)=>{try{await page.getByText(t,{exact:false}).first().click({timeout:2500});await page.waitForTimeout(900);return true}catch{console.log("!!no",t);return false}};
const btn=async(re)=>{try{await page.getByRole("button",{name:re}).first().click({timeout:2500});await page.waitForTimeout(900);return true}catch{console.log("!!nobtn",re);return false}};
await go("/app/onboarding/about");
await page.getByLabel("First name").fill("Chanda"); await page.getByLabel("Age").fill("22"); await btn(/^Next/);
await click("basketball"); await click("guitar"); await click("Community pods"); await shot("communities");
await click("Southern African"); await click("Seventh"); await btn(/^Done/); await shot("communities2");
await btn(/^Next/);
await shot("step3");
for(const d of ["Saturday","Wednesday","Sunday"]){await page.getByRole("button",{name:d}).click().catch(e=>console.log("dayfail",d,e.message.slice(0,80)));await page.waitForTimeout(300);}
await shot("days");
await btn(/^Next/); await shot("step4");
for(let i=0;i<4;i++){ if(/placing|\/app\/(home|pods)/.test(page.url()))break; try{await page.locator('input[type=tel],input[type=text]').first().fill("2065550123",{timeout:500})}catch{} await btn(/^(Next|Done|Keep|I promise|Promise|Find|Continue|Send|Skip)/i); await shot("s"+i);}
await page.waitForTimeout(6000); await shot("placing-or-after");
await page.waitForTimeout(6000); await shot("after");
await b.close();
