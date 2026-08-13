/**
 * Captures the signed-in employer application against the synthetic fixtures.
 *
 * Requires a preview server:  npm run dev:preview  (or with --empty)
 *
 *   npx tsx scripts/capture-employer.ts [baseUrl] [suffix] [width] [height]
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.argv[2] || "http://localhost:3000";
const SUFFIX = process.argv[3] || "active";
const WIDTH = Number(process.argv[4] || 1440);
const HEIGHT = Number(process.argv[5] || 900);
const OUT = "docs/screenshots/employer";

const ROUTES = [
  { name: "home", path: "/app/employer" },
  { name: "evaluations", path: "/app/employer/assessments" },
  { name: "candidates", path: "/app/employer/candidates" },
  { name: "reports", path: "/app/employer/reports" },
  { name: "settings", path: "/app/employer/settings" },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });

  for (const route of ROUTES) {
    const errors: string[] = [];
    const onConsole = (m: { type: () => string; text: () => string }) => {
      if (m.type() === "error") errors.push(m.text().slice(0, 120));
    };
    page.on("console", onConsole);

    const res = await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(350);

    const tag = `${route.name}-${SUFFIX}-${WIDTH}x${HEIGHT}`;
    await page.screenshot({ path: `${OUT}/${tag}.png`, fullPage: true });

    const m = await page.evaluate(() => ({
      height: document.documentElement.scrollHeight,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      h1: document.querySelector("h1")?.textContent?.trim().slice(0, 40) ?? "(none)",
      // Large light rectangles on a dark canvas were a named defect. Alpha has
      // to be part of the test: the raised surfaces are white at one or two
      // percent, which is a tint, not a slab.
      whiteSlabs: Array.from(document.querySelectorAll("body *")).filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width < 200 || r.height < 80) return false;
        const bg = getComputedStyle(el).backgroundColor;
        const m2 = bg.match(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?/);
        if (!m2) return false;
        const alpha = m2[4] === undefined ? 1 : Number(m2[4]);
        if (alpha < 0.5) return false;
        return Number(m2[1]) > 180 && Number(m2[2]) > 180 && Number(m2[3]) > 180;
      }).length,
    }));

    console.log(
      `${tag.padEnd(34)} ${res?.status()}  h=${String(m.height).padEnd(6)} overflow=${
        m.overflow ? "YES" : "no"
      }  whiteSlabs=${m.whiteSlabs}  errors=${errors.length}  h1="${m.h1}"`
    );
    if (errors.length) errors.forEach((e) => console.log(`      ! ${e}`));

    page.off("console", onConsole);
  }

  await browser.close();
  console.log(`\nWrote to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
