/**
 * Capture every unauthenticated route at the three review widths.
 *
 * Usage: npx tsx scripts/capture-screenshots.ts [baseUrl]
 * Output: docs/screenshots/<route>-<width>.png
 *
 * Authenticated routes are not captured here. They require a signed-in session
 * against a development Supabase environment.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.argv[2] || "http://localhost:3000";
const OUT = path.join(process.cwd(), "docs", "screenshots");

const WIDTHS = [
  { label: "1440", width: 1440, height: 900 },
  { label: "1366", width: 1366, height: 768 },
  { label: "1280", width: 1280, height: 800 },
];

const ROUTES: { slug: string; path: string; full?: boolean }[] = [
  { slug: "home", path: "/", full: true },
  { slug: "product", path: "/product", full: true },
  { slug: "evaluation", path: "/simulations", full: true },
  { slug: "trust", path: "/trust", full: true },
  { slug: "pricing", path: "/pricing", full: true },
  { slug: "request-pilot", path: "/request-pilot", full: true },
  { slug: "privacy", path: "/privacy", full: true },
  { slug: "terms", path: "/terms", full: true },
  { slug: "security", path: "/security", full: true },
  { slug: "login", path: "/login" },
  { slug: "signup", path: "/signup" },
  { slug: "forgot-password", path: "/forgot-password" },
  { slug: "reset-password", path: "/reset-password" },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  let captured = 0;
  let failed = 0;

  for (const size of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: 2,
      colorScheme: "dark",
      reducedMotion: "reduce",
    });
    const page = await context.newPage();

    for (const route of ROUTES) {
      const file = path.join(OUT, `${route.slug}-${size.label}.png`);
      try {
        const res = await page.goto(`${BASE}${route.path}`, {
          waitUntil: "networkidle",
          timeout: 30000,
        });
        if (!res || res.status() >= 400) {
          console.log(`  FAIL ${route.path} @ ${size.label} -> ${res?.status()}`);
          failed += 1;
          continue;
        }
        // Let webfonts settle so type metrics are the shipped ones.
        await page.waitForTimeout(350);
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
  console.log(`\n${captured} captured, ${failed} failed. Output: docs/screenshots/`);
  if (failed > 0) process.exitCode = 1;
}

void main();
