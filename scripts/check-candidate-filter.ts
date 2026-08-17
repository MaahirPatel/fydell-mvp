/**
 * Verifies that Home's attention queue can link to one candidate and land on a
 * Candidates table already narrowed to that person.
 *
 * Raw HTML cannot answer this: the table is a client component, so every row is
 * serialised into the payload whether it renders or not. Only the built DOM
 * distinguishes "sent to the browser" from "shown to the reader".
 *
 *   npx tsx scripts/check-candidate-filter.ts [baseUrl]
 */
import { chromium } from "@playwright/test";

const BASE = process.argv[2] || "http://localhost:3000";
const TARGET = "indigo@example.com";

async function namesOn(url: string): Promise<string[]> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: "networkidle" });
    // The desktop table is the authoritative view at this width; the stacked
    // list is hidden by a media query and would double every name.
    return await page.evaluate(() =>
      Array.from(document.querySelectorAll("table tbody tr"))
        .map((tr) => tr.querySelector("td")?.textContent?.trim() ?? "")
        .filter(Boolean)
    );
  } finally {
    await browser.close();
  }
}

async function main() {
  const filtered = await namesOn(
    `${BASE}/app/employer/candidates?q=${encodeURIComponent(TARGET)}`
  );
  const all = await namesOn(`${BASE}/app/employer/candidates`);

  console.log(`unfiltered rows : ${all.length}`);
  console.log(`filtered rows   : ${filtered.length}`);
  console.log(`filtered names  : ${filtered.join(" | ") || "(none)"}`);

  const failures: string[] = [];
  if (all.length <= filtered.length) {
    failures.push("The filtered view is not narrower than the full list.");
  }
  if (!filtered.some((n) => n.toLowerCase().includes("indigo"))) {
    failures.push("The linked candidate is missing from the filtered view.");
  }
  if (filtered.some((n) => n.toLowerCase().includes("casey"))) {
    failures.push("An unrelated candidate survived the filter.");
  }

  if (failures.length) {
    failures.forEach((f) => console.error(`FAIL ${f}`));
    process.exit(1);
  }
  console.log("\nPASS the attention queue deep link lands on a filtered table.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
