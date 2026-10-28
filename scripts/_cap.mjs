import { chromium } from "playwright";
import fs from "fs";
const out="/Users/ibrahimtraore/Documents/PROPEL/PODS/v3/corpus/awwwards_sites";
const sites=`family.co|https://family.co
arc|https://arc.net
linear|https://linear.app
teenage-engineering|https://teenage.engineering
nothing|https://nothing.tech
rauno|https://rauno.me
vercel|https://vercel.com
rive|https://rive.app
spline|https://spline.design
a24|https://a24films.com
apple-iphone|https://www.apple.com/iphone/
apple-airpods|https://www.apple.com/airpods-pro/
raycast|https://www.raycast.com
stripe|https://stripe.com
cal|https://cal.com
lusion|https://lusion.co
active-theory|https://activetheory.net
resn|https://resn.co.nz
locomotive|https://locomotive.ca
buildinamsterdam|https://buildinamsterdam.com
basicagency|https://basicagency.com
monks|https://www.monks.com
dogstudio|https://dogstudio.co
obys|https://obys.agency
immersive-g|https://immersive-g.com
studiofreight|https://studiofreight.com
cuberto|https://cuberto.com
makemepulse|https://makemepulse.com
14islands|https://14islands.com
hellomonday|https://www.hellomonday.com
unseen|https://unseen.co
mubi|https://mubi.com
kinfolk|https://www.kinfolk.com
cereal|https://readcereal.com
monocle|https://monocle.com
frame-io|https://frame.io
figma|https://figma.com
notion|https://notion.so
pitch|https://pitch.com
gumroad|https://gumroad.com
are-na|https://are.na
poolsuite|https://poolsuite.net
oatly|https://oatly.com
aesop|https://aesop.com
glossier|https://glossier.com
offwhite|https://off---white.com
byredo|https://byredo.com
sonos|https://sonos.com
framer|https://framer.com
webflow|https://webflow.com
lovable|https://lovable.dev
cursor|https://cursor.com
anthropic|https://anthropic.com
openai|https://openai.com
perplexity|https://perplexity.ai
duolingo|https://duolingo.com
headspace|https://headspace.com
strava|https://strava.com
bumble-bff|https://bumble.com
meetup|https://meetup.com
partiful|https://partiful.com
luma|https://lu.ma
tinyfish|https://www.pentagram.com
siteinspire|https://www.siteinspire.com
minimal-gallery|https://minimal.gallery
godly|https://godly.website
awwwards|https://www.awwwards.com
landbook|https://land-book.com
read-cv|https://read.cv
paper-design|https://paper.design
daylight|https://daylightcomputer.com
playdate|https://play.date
humane|https://www.thecolorsofmotion.com
wealthsimple|https://www.wealthsimple.com`.split("\n").map(l=>l.split("|"));
const b=await chromium.launch({executablePath:"/Users/ibrahimtraore/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"});
const res=[];
async function one(i,[name,url]){
 const n=String(i+1).padStart(2,"0");
 for(const [w,h,tag] of [[1440,900,"d"],[390,844,"m"]]){
  const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,isMobile:w<500});
  const p=await ctx.newPage();
  try{
   await p.goto(url,{timeout:25000,waitUntil:"domcontentloaded"});
   await p.waitForTimeout(3500);
   await p.mouse.wheel(0,h*0.6).catch(()=>{}); await p.waitForTimeout(800);
   await p.mouse.wheel(0,-h*2).catch(()=>{}); await p.waitForTimeout(500);
   await p.screenshot({path:`${out}/${n}_${name}_${tag}.png`});
   res.push(`${n} ${name} ${tag} ok`);
  }catch(e){res.push(`${n} ${name} ${tag} FAIL`)}
  await ctx.close();
 }
}
let idx=0;
async function worker(){ while(idx<sites.length){const i=idx++; await one(i,sites[i]);}}
await Promise.all(Array.from({length:6},worker));
fs.writeFileSync(out+"/_log.txt",res.sort().join("\n"));
await b.close();
