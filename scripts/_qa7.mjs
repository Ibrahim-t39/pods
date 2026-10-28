import { chromium } from "playwright";
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const vpn=process.argv[2];
const VP={mobile:{viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true},desktop:{viewport:{width:1440,height:900}}}[vpn];
const out=`/tmp/qa7/${vpn}`; (await import("node:fs")).mkdirSync(out,{recursive:true});
const b=await chromium.launch({executablePath:CHROME});
const ctx=await b.newContext({...VP,locale:"en-US"});
const page=await ctx.newPage(); page.setDefaultTimeout(8000);
let n=0;
const shot=async(name,full)=>{n++;await page.waitForTimeout(1300);await page.screenshot({path:`${out}/${String(n).padStart(2,"0")}-${name}.png`,fullPage:!!full});
 const m=await page.evaluate(()=>({sx:document.documentElement.scrollWidth>innerWidth,h:document.documentElement.scrollHeight,u:location.pathname+location.search,txt:document.body.innerText.replace(/\s+/g," ").slice(0,160)}));console.log(n,name,JSON.stringify(m));};
const go=async(u)=>{await page.goto("http://localhost:3000"+u,{waitUntil:"domcontentloaded"});};
const click=async(t)=>{try{await page.getByText(t,{exact:false}).first().click({timeout:2500});return true}catch{console.log("!!no",t);return false}};
await go("/"); await shot("landing");
await shot("landing-full",true);
await go("/app/onboarding/about"); await shot("ob-about");
for(let i=0;i<8;i++){
 try{await page.getByLabel("First name").fill("Chanda",{timeout:800})}catch{}
 try{await page.getByLabel("Age").fill("22",{timeout:800})}catch{}
 for(const t of ["Basketball","Guitar","Zambian","Seventh-day"]){try{await page.getByText(t).first().click({timeout:500})}catch{}}
 await shot("ob"+i);
 try{await page.getByRole("button",{name:/^(Next|Done|Keep|Promise|I promise|Place|Finish|Continue|Send|Skip|Find)/i}).first().click({timeout:1500})}catch{break}
 await page.waitForTimeout(1500);
 if(/\/app\/(home|pods|placing|welcome)/.test(page.url()))break;
}
await page.waitForTimeout(5000); await shot("after-ob");
for(const u of ["/app/home","/app/pods","/app/plans","/app/inbox","/app/discover","/app/profile","/app/settings","/app/safety","/app/people","/app/search","/app/invite","/privacy","/safety","/admin","/admin/reports"]){await go(u);await shot(u.replace(/\//g,"_"));}
await go("/app/pods"); await shot("pods");
await click("Hoop")||await click("Basketball"); await shot("pod");
await b.close();
