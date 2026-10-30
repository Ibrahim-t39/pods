import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const vpn = process.argv[2] || "mobile";
const VP = { mobile:{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}, desktop:{viewport:{width:1440,height:900},deviceScaleFactor:1}}[vpn];
const out = `/tmp/qa/${vpn}`; mkdirSync(out,{recursive:true});
const b = await chromium.launch({executablePath:CHROME});
const ctx = await b.newContext({...VP, locale:"en-US", timezoneId:"America/Chicago"});
const page = await ctx.newPage(); page.setDefaultTimeout(30000);
const errs=[]; page.on("pageerror",e=>errs.push(e.message)); page.on("console",m=>m.type()==="error"&&errs.push(m.text().slice(0,160)));
let n=0;
const shot=async(name)=>{n++;await page.waitForTimeout(1100);await page.screenshot({path:`${out}/${String(n).padStart(2,"0")}-${name}.png`});};
const ctl=async()=>console.log("  >",page.url().replace("http://localhost:3000",""),"|",(await page.evaluate(()=>[...document.querySelectorAll("button,a,input")].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return `${(e.innerText||e.value||e.getAttribute("aria-label")||e.placeholder||"").replace(/\s+/g," ").slice(0,22)}[${Math.round(r.width)}x${Math.round(r.height)}]`}).join(" ; "))).slice(0,700));
const click=async(t)=>{try{await page.getByText(t,{exact:false}).first().click({timeout:1200});return true}catch{console.log("  !! no",t);return false}};


await page.goto("http://localhost:3000/app/onboarding/about",{waitUntil:"domcontentloaded"}); await page.waitForTimeout(3000);
const nextBtn=async()=>{try{await page.getByRole("button",{name:/^(Next|Done|Keep|Promise|I promise|Place|Finish|Continue|Send|Skip)/i}).first().click({timeout:2500});return true}catch{return false}};
for(let i=0;i<10;i++){
  console.log("STEP",i,page.url());
  try{await page.getByLabel("First name").fill("Chanda",{timeout:3000})}catch{}
  try{await page.getByLabel("Age").fill("22",{timeout:3000})}catch{}
  await page.waitForTimeout(1200);
  for(const t of ["Basketball","Guitar","Zambian","Seventh-day"]) { try{await page.getByText(t,{exact:false}).first().click({timeout:900})}catch{} }
  if(/interests/.test(page.url())){ try{await page.getByText("Community pods").first().click({timeout:2000}); await page.waitForTimeout(1200); await shot("communities-open");}catch{} for(const t of ["Zambian","Seventh-day"]){try{await page.getByText(t).first().click({timeout:2000})}catch{console.log("no",t)}} await page.waitForTimeout(600);}
  if(/availability/.test(page.url())){ const bs=await page.$$("button:visible"); for(const bt of bs){const tx=((await bt.innerText())||"").trim(); if(tx.length===1){try{await bt.click({timeout:800})}catch{}}} await page.waitForTimeout(600);}
  await shot("ob"+i); await ctl();
  if(/placing|pods$/.test(page.url()))break;
  if(!(await nextBtn()))break;
  await page.waitForTimeout(1800);
}
console.log("errs",errs);
await b.close();
