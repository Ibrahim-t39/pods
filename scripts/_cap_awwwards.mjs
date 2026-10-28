import { chromium } from "playwright";
import fs from "fs";
const OUT="/Users/ibrahimtraore/Documents/PROPEL/PODS/v3/corpus/awwwards_sites/";
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
apple-airpods|https://www.apple.com/airpods/
raycast|https://www.raycast.com
stripe|https://stripe.com
framer|https://www.framer.com
notion|https://www.notion.com
figma|https://www.figma.com
airbnb|https://www.airbnb.com
duolingo|https://www.duolingo.com
cash-app|https://cash.app
revolut|https://www.revolut.com
monzo|https://monzo.com
headspace|https://www.headspace.com
strava|https://www.strava.com
bumble-bff|https://bumble.com
meetup|https://www.meetup.com
partiful|https://partiful.com
posh|https://posh.vip
luma|https://lu.ma
pinterest|https://www.pinterest.com
spotify|https://open.spotify.com
tonal|https://www.tonal.com
oura|https://ouraring.com
whoop|https://www.whoop.com
playdate|https://play.date
analogue|https://www.analogue.co
cosmos|https://www.cosmos.so
are-na|https://www.are.na
readymag|https://readymag.com
pitch|https://pitch.com
cal|https://cal.com
resend|https://resend.com
clerk|https://clerk.com
supabase|https://supabase.com
planetscale|https://planetscale.com
loom|https://www.loom.com
superhuman|https://superhuman.com
things|https://culturedcode.com/things/
bear|https://bear.app
craft|https://www.craft.do
paper-design|https://paper.design
lusion|https://lusion.co
active-theory|https://activetheory.net
locomotive|https://locomotive.ca
basic-agency|https://basicagency.com
studio-freight|https://www.darkroom.engineering
monks|https://monks.co
oddcommon|https://www.oddcommon.com
aesop|https://www.aesop.com
kinfolk|https://www.kinfolk.com
the-cut|https://www.thecut.com
monocle|https://monocle.com
pentagram|https://www.pentagram.com
sonos|https://www.sonos.com
polestar|https://www.polestar.com
rivian|https://rivian.com
glossier|https://www.glossier.com
aritzia|https://www.aritzia.com
fantasy|https://fantasy.co
metalab|https://www.metalab.com
read-cv|https://read.cv
poolsuite|https://poolsuite.net
siteinspire|https://www.siteinspire.com
minimal-gallery|https://minimal.gallery
godly|https://godly.website
land-book|https://land-book.com
awwwards|https://www.awwwards.com`.split("\n").map(l=>l.split("|"));
const exe="/Users/ibrahimtraore/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const b=await chromium.launch({executablePath:exe});
const log=[];
async function shoot(i,name,url,kind,vp,mobile){
  const f=`${OUT}${String(i).padStart(2,"0")}_${name}_${kind}.png`;
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile});
  const p=await ctx.newPage();
  try{
    await p.goto(url,{waitUntil:"domcontentloaded",timeout:25000});
    await p.waitForTimeout(3500);
    for(const t of ["Accept","Accept all","Allow all","I agree","Got it","Agree","Reject all","Close"]){
      try{await p.getByRole("button",{name:t,exact:true}).first().click({timeout:300});}catch{}
    }
    await p.waitForTimeout(500);
    await p.screenshot({path:f});
    return true;
  }catch(e){log.push(`${name} ${kind} FAIL ${e.message.slice(0,60)}`);return false}
  finally{await ctx.close()}
}
const jobs=sites.map((s,idx)=>(async()=>{}));
let i=0;const q=sites.map((s,k)=>[k+1,...s]);
async function worker(){while(q.length){const [n,name,url]=q.shift();
  const a=await shoot(n,name,url,"d",{width:1440,height:900},false);
  const m=await shoot(n,name,url,"m",{width:390,height:844},true);
  console.log(n,name,a,m);}}
await Promise.all([worker(),worker(),worker(),worker()]);
await b.close();
fs.writeFileSync(OUT+"_fail.log",log.join("\n"));
fs.writeFileSync(OUT+"_sites.json",JSON.stringify(sites.map((s,k)=>({n:k+1,name:s[0],url:s[1]})),null,1));
