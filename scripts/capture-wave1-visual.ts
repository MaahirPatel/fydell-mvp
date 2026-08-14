/**
 * Wave 1 visual capture at the acceptance widths.
 *
 *   npx tsx scripts/capture-wave1-visual.ts http://localhost:3000
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.argv[2] || "http://localhost:3000";
const OUT = path.join(process.cwd(), "docs", "wave1-visual");

const WIDTHS = [
  { label: "1440", width: 1440, height: 900 },
  { label: "1280", width: 1280, height: 800 },
  { label: "1024", width: 1024, height: 768 },
  { label: "390", width: 390, height: 844 },
];

const ROUTES = [
  { slug: "home", path: "/", full: true },
  { slug: "product", path: "/product", full: true },
  { slug: "simulations", path: "/simulations", full: true },
  { slug: "trust", path: "/trust", full: true },
  { slug: "request-pilot", path: "/request-pilot", full: true },
  { slug: "login", path: "/login" },
  { slug: "signup", path: "/signup" },
  { slug: "privacy", path: "/privacy", full: true },
  { slug: "terms", path: "/terms", full: true },
  { slug: "security", path: "/security", full: true },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  let captured = 0;
  let failed = 0;
  const consoleErrors: string[] = [];

  for (const size of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: 1,
      colorScheme: "dark",
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.on("pageerror", (err) => consoleErrors.push(`${size.label} ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(`${size.label} ${msg.text()}`);
    });

    for (const route of ROUTES) {
      const file = path.join(OUT, `${route.slug}-${size.label}.png`);
      try {
        const res = await page.goto(`${BASE}${route.path}`, {
          waitUntil: "networkidle",
          timeout: 45000,
        });
        if (!res || res.status() >= 400) {
          console.log(`  FAIL ${route.path} @ ${size.label} -> ${res?.status()}`);
          failed += 1;
          continue;
        }
        const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
        if (!/geist/i.test(font) && !/var\(--font-geist/i.test(font)) {
          console.log(`  WARN ${route.path} @ ${size.label} font=${font}`);
        }
        await page.waitForTimeout(400);
        await page.screenshot({ path: file, fullPage: Boolean(route.full) });
        console.log(`  ok   ${route.path} @ ${size.label}`);
        captured += 1;
      } catch (err) {
        console.log(
          `  FAIL ${route.path} @ ${size.label} -> ${err instanceof Error ? err.message.split("\n")[0] : err}`,
        );
        failed += 1;
      }
    }
    await context.close();
  }

  await browser.close();
  console.log(`\nCaptured ${captured}. Failed ${failed}. Console errors ${consoleErrors.length}.`);
  if (consoleErrors.length) {
    for (const line of consoleErrors.slice(0, 20)) console.log(`  console ${line}`);
  }
  if (failed) process.exit(1);
}

main();
