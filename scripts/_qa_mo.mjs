import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const vpn = process.argv[2]||"mobile";
const VP = { mobile:{viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true}, desktop:{viewport:{width:1440,height:900}}}[vpn];
const out=`/tmp/qa2/${vpn}`; mkdirSync(out,{recursive:true});
const b=await chromium.launch({executablePath:CHROME});
const ctx=await b.newContext({...VP,locale:"en-US"});
const page=await ctx.newPage(); page.setDefaultTimeout(8000);
const errs=[]; page.on("pageerror",e=>errs.push(e.message)); page.on("console",m=>m.type()==="error"&&errs.push(m.text().slice(0,140)));
let n=0; const shot=async(nm,w=1000)=>{n++;await page.waitForTimeout(w);await page.screenshot({path:`${out}/${String(n).padStart(2,"0")}-${nm}.png`});console.log(nm,page.url().replace("http://localhost:3000",""),"scrollW",await page.evaluate(()=>document.documentElement.scrollWidth),"txt:",(await page.evaluate(()=>document.body.innerText)).replace(/\s+/g," ").slice(0,160));};
const click=async(t)=>{try{await page.getByText(t,{exact:false}).first().click({timeout:2000});return true}catch{console.log("  !! no",t);return false}};
await page.goto("http://localhost:3000/",{waitUntil:"domcontentloaded"}); await shot("landing",2500);
const H=await page.evaluate(()=>document.documentElement.scrollHeight); console.log("landingH",H);
for(const f of [0.12,0.25,0.4,0.55,0.7,0.85,1]){await page.evaluate(y=>window.scrollTo(0,y),(H-844)*f);await shot("land"+Math.round(f*100),900);}
await page.goto("http://localhost:3000/app/onboarding/about",{waitUntil:"domcontentloaded"}); await shot("ob0",2500);
const nextBtn=async()=>{try{await page.getByRole("button",{name:/^(Next|Done|Keep|Promise|I promise|Place|Finish|Continue|Send|Skip|I'm in)/i}).first().click({timeout:2500});return true}catch{return false}};
for(let i=0;i<9;i++){
  try{await page.getByLabel("First name").fill("Chanda",{timeout:1500})}catch{}
  try{await page.getByLabel("Age").fill("22",{timeout:1500})}catch{}
  for(const t of ["Basketball","Guitar"]){try{await page.getByText(t,{exact:false}).first().click({timeout:700})}catch{}}
  if(/interests/.test(page.url())){try{await page.getByText("Community pods").first().click({timeout:1500});await page.waitForTimeout(800)}catch{} for(const t of ["Zambian","Seventh-day"]){try{await page.getByText(t).first().click({timeout:1500})}catch{}}}
  if(/availability/.test(page.url())){for(const bt of await page.$$("button:visible")){const tx=((await bt.innerText())||"").trim();if(tx.length<=3){try{await bt.click({timeout:500})}catch{}}}}
  await shot("ob"+(i+1),700);
  if(/placing|pods$|home/.test(page.url()))break;
  if(!(await nextBtn()))break; await page.waitForTimeout(1200);
}
await shot("after-ob",4500);
for(const r of ["home","pods","plans","discover","inbox","settings","safety","profile","search","people","invite"]){await page.goto("http://localhost:3000/app/"+r,{waitUntil:"domcontentloaded"});await shot("r-"+r,1800);}
console.log("errs",errs); await b.close();
