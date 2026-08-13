/**
 * Phase 1 direction gate capture.
 *
 * Shoots the three surfaces the upgrade brief gates on, at the two widths it
 * names, plus a first-viewport-only crop so the "is the upper right still
 * empty" question can be answered without scrolling a full-page image.
 *
 *   npx tsx scripts/capture-gate.ts [baseUrl]
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.argv[2] || "http://localhost:3000";
const OUT = "docs/screenshots/gate";

const SURFACES = [
  { name: "home", path: "/" },
  { name: "signup", path: "/signup" },
];

const SIZES = [
  { w: 1440, h: 900 },
  { w: 1280, h: 800 },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();

  for (const size of SIZES) {
    const page = await browser.newPage({
      viewport: { width: size.w, height: size.h },
    });

    for (const surface of SURFACES) {
      await page.goto(`${BASE}${surface.path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);

      const tag = `${surface.name}-${size.w}x${size.h}`;

      // First viewport only. This is the image the gate is actually about.
      await page.screenshot({ path: `${OUT}/${tag}-fold.png` });
      await page.screenshot({ path: `${OUT}/${tag}-full.png`, fullPage: true });

      const m = await page.evaluate(() => {
        const h1 = document.querySelector("h1");
        const b = h1?.getBoundingClientRect();
        // How much of the first viewport carries painted content on the right
        // half, measured as the lowest element bottom found there.
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        let rightMostBottom = 0;
        let rightMostTop = vh;
        document.querySelectorAll("body *").forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width < 8 || r.height < 8) return;
          if (r.top > vh || r.bottom < 0) return;
          if (r.left < vw * 0.52) return;
          rightMostBottom = Math.max(rightMostBottom, Math.min(r.bottom, vh));
          rightMostTop = Math.min(rightMostTop, Math.max(r.top, 0));
        });
        return {
          pageHeight: document.documentElement.scrollHeight,
          overflow: document.documentElement.scrollWidth > vw + 1,
          h1: b ? `x${Math.round(b.x)} y${Math.round(b.y)} w${Math.round(b.width)}` : "-",
          rightTop: Math.round(rightMostTop),
          rightBottom: Math.round(rightMostBottom),
          vh,
        };
      });

      console.log(
        `${tag.padEnd(22)} page=${String(m.pageHeight).padEnd(6)} h1=${m.h1.padEnd(22)} rightHalf=${m.rightTop}..${m.rightBottom} of ${m.vh}  overflow=${m.overflow ? "YES" : "no"}`
      );
    }

    await page.close();
  }

  await browser.close();
  console.log(`\nWrote to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
