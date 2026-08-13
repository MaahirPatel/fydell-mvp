/**
 * Reproduces the paid-product audit measurements locally.
 *
 * The upgrade brief quoted page heights and hero coordinates from the deployed
 * site. Numbers taken from a different build are not evidence, so this measures
 * the same things against whatever is running locally before any edits land.
 *
 *   npx tsx scripts/measure-baseline.ts [baseUrl] [width] [height]
 */
import { chromium } from "@playwright/test";

const BASE = process.argv[2] || "http://localhost:3000";
const WIDTH = Number(process.argv[3] || 1363);
const HEIGHT = Number(process.argv[4] || 936);

const ROUTES = [
  "/",
  "/product",
  "/simulations",
  "/trust",
  "/signup",
  "/login",
  "/request-pilot",
  "/pricing",
  "/privacy",
  "/terms",
  "/security",
];

type Row = {
  route: string;
  status: number;
  scrollHeight: number;
  viewports: string;
  sections: number;
  h1: string;
  h1Box: string;
  firstSection: number | null;
  images: number;
  svgs: number;
  overflow: boolean;
  consoleErrors: number;
};

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });

  const rows: Row[] = [];

  for (const route of ROUTES) {
    let consoleErrors = 0;
    const onError = (msg: { type: () => string }) => {
      if (msg.type() === "error") consoleErrors += 1;
    };
    page.on("console", onError);

    const res = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(250);

    const data = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      const box = h1?.getBoundingClientRect();
      const first = document.querySelector("main section, main > div > section");
      return {
        scrollHeight: document.documentElement.scrollHeight,
        sections: document.querySelectorAll("section").length,
        h1: h1?.textContent?.trim().slice(0, 60) ?? "(none)",
        h1Box: box
          ? `x${Math.round(box.x)} y${Math.round(box.y + window.scrollY)} w${Math.round(box.width)}`
          : "(none)",
        firstSection: first ? Math.round(first.getBoundingClientRect().height) : null,
        images: document.querySelectorAll("img").length,
        svgs: document.querySelectorAll("svg").length,
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    });

    rows.push({
      route,
      status: res?.status() ?? 0,
      viewports: (data.scrollHeight / HEIGHT).toFixed(1),
      consoleErrors,
      ...data,
    });

    page.off("console", onError);
  }

  await browser.close();

  console.log(`\nBaseline at ${WIDTH}x${HEIGHT} against ${BASE}\n`);
  console.log(
    [
      "route".padEnd(16),
      "st".padEnd(4),
      "height".padEnd(8),
      "vp".padEnd(5),
      "sec".padEnd(4),
      "hero".padEnd(6),
      "img".padEnd(4),
      "svg".padEnd(4),
      "ovf".padEnd(4),
      "err",
    ].join("")
  );
  for (const r of rows) {
    console.log(
      [
        r.route.padEnd(16),
        String(r.status).padEnd(4),
        String(r.scrollHeight).padEnd(8),
        r.viewports.padEnd(5),
        String(r.sections).padEnd(4),
        String(r.firstSection ?? "-").padEnd(6),
        String(r.images).padEnd(4),
        String(r.svgs).padEnd(4),
        (r.overflow ? "YES" : "no").padEnd(4),
        String(r.consoleErrors),
      ].join("")
    );
  }

  console.log("\nH1 geometry\n");
  for (const r of rows) {
    console.log(`${r.route.padEnd(16)} ${r.h1Box.padEnd(22)} ${r.h1}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
