// [U11] SVG -> PNG icons (sharp). Usage: node scripts/make-icons.mjs
// Source: public/brand/app-icon.svg and app-icon-maskable.svg (copies of PODS/brand). Output: public/icons/*.png
import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";

mkdirSync("public/icons", { recursive: true });
const any = readFileSync("public/brand/app-icon.svg");
const maskable = readFileSync("public/brand/app-icon-maskable.svg");
const jobs = [
  [any, 192, "icon-192.png"],
  [any, 512, "icon-512.png"],
  [maskable, 512, "maskable-512.png"],
  [any, 180, "apple-touch-icon.png"],
];
for (const [src, size, name] of jobs) {
  await sharp(src, { density: 384 }).resize(size, size).png().toFile(`public/icons/${name}`);
  console.log("public/icons/" + name, `${size}x${size}`);
}
