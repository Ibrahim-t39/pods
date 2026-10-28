import { chromium } from 'playwright';
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const L = `airbnb|https://www.airbnb.com
airbnb-design|https://airbnb.design
duolingo|https://www.duolingo.com
duolingo-design|https://design.duolingo.com
headspace|https://www.headspace.com
headspace-design|https://design.headspace.com
notion|https://www.notion.com
notion-product|https://www.notion.com/product
stripe|https://stripe.com
stripe-press|https://press.stripe.com
arc|https://arc.net
dia|https://www.diabrowser.com
family|https://family.co
things|https://culturedcode.com/things
teenage-engineering|https://teenage.engineering
te-products|https://teenage.engineering/products
nothing|https://nothing.tech
nothing-phone|https://nothing.tech/pages/phone-3
pentagram|https://www.pentagram.com
pentagram-work|https://www.pentagram.com/work
linear|https://linear.app
mailchimp|https://mailchimp.com
figma|https://www.figma.com
slack|https://slack.com
monzo|https://monzo.com
wise|https://wise.com
raycast|https://www.raycast.com
cash-app|https://cash.app
are-na|https://www.are.na
poolsuite|https://poolsuite.net
tldraw|https://tldraw.com
spotify-design|https://spotify.design
pinterest|https://www.pinterest.com
strava|https://www.strava.com
bumble|https://bumble.com
meetup|https://www.meetup.com
partiful|https://partiful.com
posh|https://posh.vip
luma|https://lu.ma
oura|https://ouraring.com
rivian|https://rivian.com
vercel|https://vercel.com
framer|https://www.framer.com
loom|https://www.loom.com
lucide|https://lucide.dev
phosphor|https://phosphoricons.com
streamline|https://www.streamlinehq.com
openmoji|https://openmoji.org
craft|https://www.craft.do
sono|https://www.sonos.com
glyph-nothing-os|https://nothing.tech/pages/nothing-os
google-material|https://m3.material.io/styles/icons/overview
apple-sfsymbols|https://developer.apple.com/sf-symbols/`.split('\n').map(l=>l.split('|'));
const b = await chromium.launch({ executablePath: CHROME });
let n=0;
await Promise.all(Array.from({length:4},async()=>{
 const ctx = await b.newContext({viewport:{width:1280,height:800}});
 while(L.length){ const [s,u]=L.shift(); const i=++n; const p=await ctx.newPage();
  try{ await p.goto(u,{waitUntil:'domcontentloaded',timeout:25000}); await p.waitForTimeout(3500);
   for (const t of ['Accept','Accept all','Accept All','Got it','Allow all','I agree','Agree']) { try{await p.getByRole('button',{name:t,exact:true}).first().click({timeout:300});}catch{} }
   await p.waitForTimeout(500);
   const f=`${String(i).padStart(2,'0')}_${s}.png`; await p.screenshot({path:f}); console.log('ok',f,u);
  }catch(e){console.log('FAIL',s,e.message.slice(0,60));} await p.close(); }
}));
await b.close();
