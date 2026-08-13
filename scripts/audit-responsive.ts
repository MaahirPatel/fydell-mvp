/**
 * Responsive sweep across every route at the four widths in the brief.
 *
 * Reports only defects, so a clean run is a short run: horizontal overflow,
 * large light slabs on the graphite canvas, console errors, non-200 responses,
 * and text small enough to be a readability problem.
 *
 * Usage: npx tsx scripts/audit-responsive.ts [baseUrl]
 * Authenticated and candidate routes need the preview server.
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:3000";
const WIDTHS = [390, 768, 1280, 1440];

const ROUTES = [
  "/",
  "/product",
  "/simulations",
  "/trust",
  "/pricing",
  "/request-pilot",
  "/privacy",
  "/terms",
  "/security",
  "/login",
  "/signup",
  "/app/employer",
  "/app/employer/assessments",
  "/app/employer/candidates",
  "/app/employer/reports",
  "/app/employer/settings",
  "/app/employer/assessments/report/sess-s6",
  "/sim/sess-s6/result",
];

// An IIFE, not a bare arrow: evaluate() treats a string as an expression to
// evaluate rather than a function to call.
const PROBE = `(() => {
  const doc = document.documentElement;
  const overflow = doc.scrollWidth - window.innerWidth;

  const slabs = Array.from(document.querySelectorAll("body *")).filter((el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 200 || r.height < 80) return false;
    const m = getComputedStyle(el).backgroundColor.match(
      /rgba?\\((?<r>\\d+), (?<g>\\d+), (?<b>\\d+)(?:, (?<a>[\\d.]+))?/
    );
    if (!m || !m.groups) return false;
    const a = m.groups.a === undefined ? 1 : Number(m.groups.a);
    if (a < 0.5) return false;
    return Number(m.groups.r) > 180 && Number(m.groups.g) > 180 && Number(m.groups.b) > 180;
  }).length;

  // Anything wider than the viewport is what causes the sideways scroll.
  const wide = Array.from(document.querySelectorAll("body *"))
    .filter((el) => el.getBoundingClientRect().width > window.innerWidth + 1)
    .slice(0, 3)
    .map((el) => el.tagName.toLowerCase() + "." + String(el.className).slice(0, 60));

  const tiny = Array.from(document.querySelectorAll("p, li, dd, dt, span, a, label"))
    .filter((el) => {
      const t = el.textContent || "";
      if (t.trim().length < 12) return false;
      return parseFloat(getComputedStyle(el).fontSize) < 11.5;
    }).length;

  return { overflow, slabs, wide, tiny };
})()`;

async function main() {
  const browser = await chromium.launch();
  let defects = 0;
  let checked = 0;

  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });

    for (const route of ROUTES) {
      errors.length = 0;
      let status = 0;
      try {
        const res = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
        status = res?.status() ?? 0;
      } catch (err) {
        console.log(`FAIL ${width} ${route}: ${(err as Error).message}`);
        defects += 1;
        continue;
      }
      await page.waitForTimeout(250);
      const probe = (await page.evaluate(PROBE)) as {
        overflow: number;
        slabs: number;
        wide: string[];
        tiny: number;
      };
      checked += 1;

      const problems: string[] = [];
      if (status !== 200) problems.push(`status ${status}`);
      if (probe.overflow > 1)
        problems.push(`overflows by ${probe.overflow}px (${probe.wide.join(", ")})`);
      if (probe.slabs > 0) problems.push(`${probe.slabs} light slab(s)`);
      if (probe.tiny > 0) problems.push(`${probe.tiny} run(s) of text under 11.5px`);
      if (errors.length > 0) problems.push(`${errors.length} console error(s): ${errors[0]}`);

      if (problems.length > 0) {
        defects += 1;
        console.log(`${String(width).padEnd(5)} ${route.padEnd(44)} ${problems.join(" | ")}`);
      }
    }
    await page.close();
  }

  await browser.close();
  console.log(
    `\n${checked} page renders checked across ${WIDTHS.join("/")}. ${defects} defect(s).`
  );
  if (defects > 0) process.exitCode = 1;
}

void main();
