// Renders the official Fydell mark (public/brand/fydell-mark.png) into the
// square icon files Next.js serves: favicon.ico, icon.png, apple-icon.png.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const mark = readFileSync(resolve("public/brand/fydell-mark.png")).toString("base64");

async function render(page, size, { background, padding }) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:${background}">
    <img src="data:image/png;base64,${mark}" style="width:${size - padding * 2}px;height:${size - padding * 2}px;object-fit:contain" />
  </body></html>`);
  await page.waitForFunction(() => document.images[0]?.complete);
  return page.screenshot({ omitBackground: background === "transparent", type: "png" });
}

function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, png }, i) => {
    const entry = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map((i) => i.png)]);
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

const favicons = [];
for (const size of [16, 32, 48]) {
  favicons.push({ size, png: await render(page, size, { background: "transparent", padding: 0 }) });
}
writeFileSync(resolve("src/app/favicon.ico"), ico(favicons));
writeFileSync(resolve("src/app/icon.png"), await render(page, 512, { background: "transparent", padding: 24 }));
writeFileSync(resolve("src/app/apple-icon.png"), await render(page, 180, { background: "#ffffff", padding: 18 }));

await browser.close();
console.log("Wrote src/app/favicon.ico, src/app/icon.png, src/app/apple-icon.png");
