// Produces transparent versions of the official Fydell lockup from
// public/brand/fydell-logo-full.png, which ships on a black background.
// The mark keeps its own colours; the wordmark is recovered as solid navy
// (light surfaces) and as white (dark surfaces). Nothing is redrawn.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const source = readFileSync(resolve("public/brand/fydell-logo-full.png")).toString("base64");

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<html><body></body></html>");

const outputs = await page.evaluate(async (b64) => {
  const img = new Image();
  img.src = `data:image/png;base64,${b64}`;
  await img.decode();
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const src = ctx.getImageData(0, 0, w, h);

  // The mark sits left of the widest empty column gap; the wordmark to its right.
  const columnHasInk = [];
  for (let x = 0; x < w; x++) {
    let ink = false;
    for (let y = 0; y < h && !ink; y++) {
      const i = (y * w + x) * 4;
      if (Math.max(src.data[i], src.data[i + 1], src.data[i + 2]) > 24) ink = true;
    }
    columnHasInk.push(ink);
  }
  let split = Math.floor(w / 3);
  let best = 0;
  let run = 0;
  for (let x = 0; x < w; x++) {
    if (!columnHasInk[x]) {
      run += 1;
      if (run > best && x > w * 0.15 && x < w * 0.6) {
        best = run;
        split = x - Math.floor(run / 2);
      }
    } else run = 0;
  }

  // Wordmark ink colour: the brightest pixel in the wordmark region.
  let navy = [0, 0, 0];
  for (let y = 0; y < h; y++) {
    for (let x = split; x < w; x++) {
      const i = (y * w + x) * 4;
      const m = Math.max(src.data[i], src.data[i + 1], src.data[i + 2]);
      if (m > Math.max(...navy)) navy = [src.data[i], src.data[i + 1], src.data[i + 2]];
    }
  }
  const navyMax = Math.max(...navy);

  function build(wordColor) {
    const out = ctx.createImageData(w, h);
    let minX = w, minY = h, maxX = 0, maxY = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = src.data[i], g = src.data[i + 1], bl = src.data[i + 2];
        const m = Math.max(r, g, bl);
        let a;
        let rgb;
        if (x < split) {
          a = Math.min(1, m / 160);
          rgb = a > 0 ? [Math.min(255, r / a), Math.min(255, g / a), Math.min(255, bl / a)] : [0, 0, 0];
        } else {
          a = Math.min(1, m / navyMax);
          rgb = wordColor;
        }
        if (a < 0.04) a = 0;
        out.data[i] = rgb[0];
        out.data[i + 1] = rgb[1];
        out.data[i + 2] = rgb[2];
        out.data[i + 3] = Math.round(a * 255);
        if (a > 0) {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
      }
    }
    const pad = 4;
    const cw = maxX - minX + 1 + pad * 2;
    const ch = maxY - minY + 1 + pad * 2;
    const full = document.createElement("canvas");
    full.width = w;
    full.height = h;
    full.getContext("2d").putImageData(out, 0, 0);
    const crop = document.createElement("canvas");
    crop.width = cw;
    crop.height = ch;
    crop.getContext("2d").drawImage(full, minX - pad, minY - pad, cw, ch, 0, 0, cw, ch);
    return { data: crop.toDataURL("image/png").split(",")[1], width: cw, height: ch };
  }

  return { light: build(navy), dark: build([255, 255, 255]), navy };
}, source);

writeFileSync(resolve("public/brand/fydell-lockup.png"), Buffer.from(outputs.light.data, "base64"));
writeFileSync(resolve("public/brand/fydell-lockup-on-dark.png"), Buffer.from(outputs.dark.data, "base64"));
await browser.close();
console.log(`lockup ${outputs.light.width}x${outputs.light.height}, wordmark rgb(${outputs.navy.join(",")})`);
