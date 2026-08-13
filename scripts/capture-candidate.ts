/**
 * Screenshots the candidate-facing surfaces that can be reached with fixtures,
 * and reports the defects the brief names: overflow, light slabs on the dark
 * canvas, console errors, and non-200 responses.
 *
 * Requires the preview server (npm run dev:preview). Routes needing a live
 * session are listed under REQUIRES_DB in docs and are not captured here.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.argv[2] || "http://localhost:3000";
const WIDTH = Number(process.argv[3] || 1440);
const HEIGHT = Number(process.argv[4] || 900);
const OUT = "docs/screenshots/candidate";

const ROUTES = [{ name: "result", path: "/sim/sess-s6/result" }];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });

  for (const route of ROUTES) {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });

    const res = await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    const probe = await page.evaluate(() => ({
      height: document.documentElement.scrollHeight,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      h1: document.querySelector("h1")?.textContent?.trim() || "",
      whiteSlabs: Array.from(document.querySelectorAll("body *")).filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width < 200 || r.height < 80) return false;
        const bg = getComputedStyle(el).backgroundColor;
        const m = bg.match(
          /rgba?\((?<r>\d+), (?<g>\d+), (?<b>\d+)(?:, (?<a>[\d.]+))?/
        );
        if (!m || !m.groups) return false;
        const alpha = m.groups.a === undefined ? 1 : Number(m.groups.a);
        if (alpha < 0.5) return false;
        return (
          Number(m.groups.r) > 180 &&
          Number(m.groups.g) > 180 &&
          Number(m.groups.b) > 180
        );
      }).length,
    }));

    const name = `${route.name}-${WIDTH}x${HEIGHT}`;
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });

    console.log(
      `${name.padEnd(34)} ${res?.status()}  h=${String(probe.height).padEnd(6)} ` +
        `overflow=${probe.overflow ? "YES" : "no"}  whiteSlabs=${probe.whiteSlabs}  ` +
        `errors=${errors.length}  h1="${probe.h1}"`
    );
    for (const e of errors.slice(0, 4)) console.log(`      ! ${e}`);
  }

  await browser.close();
  console.log(`\nWrote to ${OUT}`);
}

void main();
