import { chromium } from "playwright";
const b=await chromium.launch({executablePath:`${process.env.HOME}/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`});
const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
await p.goto("http://localhost:3000/app/onboarding/availability");await p.waitForTimeout(2500);
console.log(await p.evaluate(()=>[...document.querySelectorAll("button,[role],input")].map(e=>e.tagName+"|"+e.getAttribute("role")+"|"+(e.getAttribute("aria-label")||e.innerText)+"|"+e.disabled).join("\n")));
await b.close();
