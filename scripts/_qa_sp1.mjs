import { chromium } from "playwright";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const vpn = process.argv[2];
const VP = { m:{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}, d:{viewport:{width:1440,height:900},deviceScaleFactor:1}}[vpn];
const out=`/tmp/qa/${vpn}`;
const b = await chromium.launch({executablePath:CHROME});
const ctx = await b.newContext({...VP, locale:"en-US", timezoneId:"America/Los_Angeles"});
const page = await ctx.newPage(); page.setDefaultTimeout(20000);
let n=0;
const shot=async(name,full)=>{n++;await page.waitForTimeout(1300);await page.screenshot({path:`${out}/${String(n).padStart(2,"0")}-${name}.png`,fullPage:!!full});};
const info=async()=>console.log(">",page.url().replace("http://localhost:3000",""),"hscroll",await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),"|",(await page.evaluate(()=>[...document.querySelectorAll("button,a,input")].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return `${(e.innerText||e.value||e.getAttribute("aria-label")||"").replace(/\s+/g," ").slice(0,18)}[${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)}x${Math.round(r.height)}]`}).join(" ; "))).slice(0,600));
const clk=async(t)=>{try{await page.getByText(t,{exact:false}).first().click({timeout:2500});return true}catch{console.log("!! no",t);return false}};
await page.goto("http://localhost:3000/",{waitUntil:"domcontentloaded"});
await shot("land-top"); await info();
const H=await page.evaluate(()=>document.documentElement.scrollHeight); console.log("landing height",H);
for(let y=900,i=1;y<H&&i<9;y+=vpn==="m"?900:800,i++){await page.evaluate(y=>scrollTo(0,y),y);await shot("land-"+i);}
await page.goto("http://localhost:3000/app/onboarding/about",{waitUntil:"domcontentloaded"}); await page.waitForTimeout(2500);
for(let i=0;i<9;i++){
  try{await page.getByLabel("First name").fill("Chanda",{timeout:1500})}catch{}
  try{await page.getByLabel("Age").fill("22",{timeout:800})}catch{}
  for(const t of ["Basketball","Guitar"]){try{await page.getByText(t,{exact:false}).first().click({timeout:700})}catch{}}
  if(/interests/.test(page.url())){try{await page.getByText("Community pods").first().click({timeout:1500});await page.waitForTimeout(800);for(const t of ["Zambian","Seventh-day"]){try{await page.getByText(t).first().click({timeout:1000})}catch{}}}catch{}}
  if(/availability/.test(page.url())){for(const bt of await page.$$("button:visible")){const tx=((await bt.innerText())||"").trim();if(tx.length===1){try{await bt.click({timeout:500})}catch{}}}}
  await shot("ob"+i); await info();
  if(/placing|pods$/.test(page.url()))break;
  try{await page.getByRole("button",{name:/^(Next|Done|Keep|Promise|I promise|Place|Finish|Continue|Send|Skip|Find|Start)/i}).first().click({timeout:2000})}catch{console.log("no next");break}
  await page.waitForTimeout(1500);
}
await page.waitForTimeout(5000); await shot("after-ob"); await info();
