/**
 * Motion safety check.
 *
 * The failure mode that matters is a reveal animation that never fires, leaving
 * real content invisible. So this loads the page with JavaScript disabled and
 * with reduced motion, and reports anything that is transparent or displaced.
 */
import { chromium } from "playwright";
import path from "node:path";

const OUT = path.join(process.cwd(), ".shots", "motion-check");

async function audit(label: string, javaScriptEnabled: boolean, reduce: boolean) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    javaScriptEnabled,
    reducedMotion: reduce ? "reduce" : "no-preference",
  });
  const page = await context.newPage();
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const report = await page.evaluate(() => {
    const hidden: string[] = [];
    for (const el of Array.from(document.querySelectorAll("section, article, li, h1, h2, h3, p, svg"))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const s = getComputedStyle(el);
      const opacity = Number.parseFloat(s.opacity);
      const shifted =
        s.transform !== "none" && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(s.transform);
      if (opacity < 0.9 || (shifted && s.transform.includes("matrix"))) {
        const t = (el.textContent || "").trim().slice(0, 48);
        hidden.push(`${el.tagName.toLowerCase()} opacity=${opacity} transform=${s.transform} "${t}"`);
      }
    }
    return {
      hidden: hidden.slice(0, 12),
      total: hidden.length,
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    };
  });

  console.log(`\n[${label}] js=${javaScriptEnabled} reduce=${reduce}`);
  console.log(`  overflow: scrollW=${report.scrollW} clientW=${report.clientW}`);
  console.log(`  low-opacity/displaced elements: ${report.total}`);
  for (const h of report.hidden) console.log(`    ${h}`);

  await page.screenshot({ path: path.join(OUT, `${label}.png`), fullPage: false });
  await browser.close();
}

async function main() {
  await audit("js-off", false, false);
  await audit("reduced-motion", true, true);
  await audit("normal", true, false);
}

void main();
