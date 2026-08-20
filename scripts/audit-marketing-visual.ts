/**
 * G0 Reference Scout harness for the marketing visual audit.
 *
 * Captures section screenshots and, more importantly, measures the live
 * computed values that the audit reasons about. Design is judged from renders,
 * not from source, but the corrections have to be driven by real numbers.
 *
 * Run: npx tsx scripts/audit-marketing-visual.ts [baseUrl]
 */
import { chromium, type Page } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.argv[2] || "http://localhost:3000";
const OUT = path.join(process.cwd(), ".shots", "audit");

const VIEWPORTS = [
  { name: "1728", width: 1728, height: 1117 },
  { name: "1440", width: 1440, height: 1000 },
  { name: "1280", width: 1280, height: 900 },
  { name: "1024", width: 1024, height: 900 },
  { name: "768", width: 768, height: 1024 },
  { name: "390", width: 390, height: 844 },
];

type Measurement = Record<string, unknown>;

async function measure(page: Page): Promise<Measurement> {
  return page.evaluate(() => {
    const round = (n: number) => Math.round(n * 100) / 100;

    const describe = (el: Element | null) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        text: (el.textContent || "").trim().slice(0, 70),
        fontFamily: cs.fontFamily.split(",")[0].replace(/["']/g, ""),
        fontSize: round(parseFloat(cs.fontSize)),
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        textTransform: cs.textTransform,
        color: cs.color,
        width: round(rect.width),
      };
    };

    // Every element that paints a visible border box, to count border noise.
    const borderBoxes: Array<{ tag: string; cls: string; radius: string; w: number; h: number }> = [];
    const radii = new Map<string, number>();
    let uppercaseWideLabels = 0;
    let gradients = 0;
    let blurs = 0;
    let leftAccentBars = 0;
    const greenish: string[] = [];

    for (const el of Array.from(document.querySelectorAll("*"))) {
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (rect.width < 4 || rect.height < 4) continue;

      const hasBorder =
        cs.borderTopWidth !== "0px" &&
        cs.borderTopStyle !== "none" &&
        cs.borderTopColor !== "rgba(0, 0, 0, 0)";
      const radius = cs.borderRadius;

      if (hasBorder && rect.width > 180 && rect.height > 120) {
        borderBoxes.push({
          tag: el.tagName.toLowerCase(),
          cls: typeof el.className === "string" ? el.className.slice(0, 48) : "",
          radius,
          w: round(rect.width),
          h: round(rect.height),
        });
      }
      if (radius && radius !== "0px") {
        radii.set(radius, (radii.get(radius) ?? 0) + 1);
      }

      // Horseman 3: wide-tracked uppercase micro labels.
      const tracking = parseFloat(cs.letterSpacing);
      if (cs.textTransform === "uppercase" && !Number.isNaN(tracking)) {
        const em = tracking / parseFloat(cs.fontSize);
        if (em >= 0.06) uppercaseWideLabels += 1;
      }

      // Horseman 1 + 2: gradient washes and blurred glows.
      const bg = cs.backgroundImage;
      if (bg && bg.includes("gradient")) gradients += 1;
      if (cs.filter && cs.filter.includes("blur")) blurs += 1;

      // Horseman 4: coloured left accent rule on a card.
      const lw = parseFloat(cs.borderLeftWidth);
      if (
        lw >= 2 &&
        cs.borderLeftColor !== "rgba(0, 0, 0, 0)" &&
        rect.height > 40 &&
        cs.borderLeftColor !== cs.borderTopColor
      ) {
        leftAccentBars += 1;
      }

      // Saturated success green anywhere in text or surface.
      for (const value of [cs.color, cs.backgroundColor]) {
        const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!m) continue;
        const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
        if (g > 120 && g - r > 40 && g - b > 30) {
          greenish.push(`${el.tagName.toLowerCase()} ${value} "${(el.textContent || "").trim().slice(0, 24)}"`);
        }
      }
    }

    // Selection-like highlights: a run of inline text on a saturated surface.
    const selectionLike: string[] = [];
    for (const el of Array.from(document.querySelectorAll("span, mark, em, strong, p"))) {
      const cs = getComputedStyle(el);
      const m = cs.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
      if (!m) continue;
      const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
      const a = m[4] === undefined ? 1 : Number(m[4]);
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      const rect = el.getBoundingClientRect();
      if (a > 0.25 && sat > 30 && rect.width > 120) {
        selectionLike.push(`${cs.backgroundColor} "${(el.textContent || "").trim().slice(0, 48)}"`);
      }
    }

    const sectionPadding = Array.from(document.querySelectorAll("section")).map((s) => {
      const cs = getComputedStyle(s);
      return {
        cls: typeof s.className === "string" ? s.className.slice(0, 40) : "",
        top: cs.paddingTop,
        bottom: cs.paddingBottom,
        height: round(s.getBoundingClientRect().height),
      };
    });

    const h1 = document.querySelector("h1");
    const containers = Array.from(document.querySelectorAll("div"))
      .map((d) => round(d.getBoundingClientRect().width))
      .filter((w) => w > 700);
    const containerMode = [...new Set(containers)]
      .map((w) => ({ w, n: containers.filter((x) => x === w).length }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 4);

    // Any element pushing past the viewport is a responsive defect.
    const overflow = Array.from(document.querySelectorAll("*"))
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 6)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 36)}`);

    return {
      docWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      overflowingElements: overflow,
      h1: describe(h1),
      h2s: Array.from(document.querySelectorAll("h2")).slice(0, 12).map(describe),
      containerMode,
      sectionPadding,
      borderBoxCount: borderBoxes.length,
      borderBoxes: borderBoxes.slice(0, 20),
      radiiHistogram: [...radii.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10),
      horsemen: {
        gradients,
        blurs,
        uppercaseWideLabels,
        leftAccentBars,
        selectionLikeHighlights: selectionLike.length,
        selectionSamples: selectionLike.slice(0, 6),
        greenishCount: greenish.length,
        greenishSamples: [...new Set(greenish)].slice(0, 8),
      },
      fonts: [...new Set(
        Array.from(document.querySelectorAll("h1,h2,h3,p,span,a,button"))
          .map((el) => getComputedStyle(el).fontFamily.split(",")[0].replace(/["']/g, "")),
      )].slice(0, 10),
      monospaceUsage: Array.from(document.querySelectorAll("*"))
        .filter((el) => {
          const f = getComputedStyle(el).fontFamily.toLowerCase();
          return (f.includes("mono") || f.includes("spline")) && (el.textContent || "").trim().length > 0;
        })
        .slice(0, 24)
        .map((el) => (el.textContent || "").trim().slice(0, 40)),
    };
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const report: Record<string, Measurement> = {};

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      colorScheme: "dark",
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    try {
      await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForLoadState("load").catch(() => {}); await page.waitForTimeout(2500);

      await page.screenshot({ path: path.join(OUT, `home-${vp.name}-fold.png`) });
      if (vp.name === "1440" || vp.name === "390") {
        await page.screenshot({ path: path.join(OUT, `home-${vp.name}-full.png`), fullPage: true });
      }

      report[vp.name] = await measure(page);
      console.log(`ok ${vp.name}`);
    } catch (err) {
      console.log(`FAIL ${vp.name}: ${err instanceof Error ? err.message.split("\n")[0] : err}`);
    }
    await context.close();
  }

  // Section-level captures at the primary desktop width.
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("load").catch(() => {}); await page.waitForTimeout(2500);

  const sections = await page.$$("section");
  for (let i = 0; i < sections.length; i += 1) {
    try {
      await sections[i].screenshot({ path: path.join(OUT, `section-${String(i).padStart(2, "0")}.png`) });
    } catch {
      /* a section taller than the capture limit is not an audit failure */
    }
  }
  const nav = await page.$("header, nav");
  if (nav) await nav.screenshot({ path: path.join(OUT, "nav.png") });
  const footer = await page.$("footer");
  if (footer) await footer.screenshot({ path: path.join(OUT, "footer.png") });
  console.log(`captured ${sections.length} sections`);

  await context.close();
  await browser.close();

  await writeFile(path.join(OUT, "measurements.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(`\nwrote ${path.join(OUT, "measurements.json")}`);
}

void main();
