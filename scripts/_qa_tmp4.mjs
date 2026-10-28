import { chromium } from "playwright";
import {mkdirSync} from "node:fs";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const vpn=process.argv[2]; const VP={m:{viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true},d:{viewport:{width:1440,height:900},deviceScaleFactor:1}}[vpn];
const out="/private/tmp/claude-501/-Users-ibrahimtraore-Documents-PROPEL/192ac6d2-3129-48a3-9409-2f4587345c61/scratchpad/qa/A"+vpn; mkdirSync(out,{recursive:true});
const b=await chromium.launch({executablePath:CHROME}); const ctx=await b.newContext({...VP,locale:"en-US"}); const page=await ctx.newPage();
let n=0; const shot=async(nm,w=1500)=>{await page.waitForTimeout(w);await page.screenshot({path:out+"/"+String(++n).padStart(2,"0")+"-"+nm+".png"});console.log(n,nm,page.url().replace("http://localhost:3000",""),"|",(await page.evaluate(()=>document.body.innerText.replace(/\s+/g," "))).slice(0,160));};
const ctl=async()=>console.log("  >",(await page.evaluate(()=>[...document.querySelectorAll("button,a,[data-testid]")].filter(e=>e.getBoundingClientRect().width>0).map(e=>(e.dataset.testid?"#"+e.dataset.testid+":":"")+(e.innerText||e.getAttribute("aria-label")||"").replace(/\s+/g," ").slice(0,18)).join(" | "))).slice(0,500));

await page.goto("http://localhost:3000/app?mode=demo&director=1",{waitUntil:"domcontentloaded"}); await shot("start",2500);
await page.getByLabel("First name").fill("Chanda"); await page.getByLabel("Age").fill("22"); await shot("about-filled",600);
for(let i=0;i<8;i++){
  try{await page.getByRole("button",{name:/^(Next|Done|Place|Keep|Promise|Continue|Skip|Find|Looks|Confirm|Yes|Send|Verify|Start|Take)/i}).first().click({timeout:2500})}catch{console.log("no next");}
  await page.waitForTimeout(1200);
  for(const t of ["Basketball","Guitar"]) { try{await page.getByText(t,{exact:false}).first().click({timeout:500})}catch{} }
  await shot("ob"+i,1200); await ctl();
}
await b.close();