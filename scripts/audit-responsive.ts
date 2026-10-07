/**
 * Responsive sweep across every route at the four widths in the brief.
 *
 * Reports only defects, so a clean run is a short run: horizontal overflow,
 * console errors, non-200 responses, and text small enough to be a readability
 * problem. Surface luminance is intentionally not policed here: Fydell's
 * committed light theme uses large white focal planes on an ivory canvas.
 *
 * Usage: npx tsx scripts/audit-responsive.ts [baseUrl]
 *
 * Signed-in routes are swept only when these are set (dev accounts only):
 *   A11Y_CANDIDATE_EMAIL / A11Y_CANDIDATE_PASSWORD
 *   A11Y_EMPLOYER_EMAIL / A11Y_EMPLOYER_PASSWORD
 */
import { chromium, type Browser, type Page } from "playwright";
import { PRODUCT_ITEMS } from "../src/components/marketing/site/nav-data";

const BASE = process.argv[2] || "http://localhost:3000";
const WIDTHS = [390, 768, 1280, 1440];
const NAV_TIMEOUT = 120000;

const PUBLIC_ROUTES = [
  "/",
  "/products",
  ...PRODUCT_ITEMS.map((item) => item.href),
  "/developers",
  "/employers",
  "/pricing",
  "/download",
  "/changelog",
  "/demo",
  "/trust",
  "/security",
  "/contact",
  "/login",
  "/signup",
];

const CANDIDATE_ROUTES = [
  "/app/candidate",
  "/app/candidate/profile",
  "/app/candidate/work-record",
  "/app/candidate/applications",
  "/app/candidate/settings",
];

const EMPLOYER_ROUTES = [
  "/app/employer",
  "/app/employer/engineering",
  "/app/employer/settings",
];

type Session = { label: string; routes: string[]; email?: string; password?: string };

function sessions(): Session[] {
  const list: Session[] = [{ label: "public", routes: PUBLIC_ROUTES }];
  const env = process.env;
  if (env.A11Y_CANDIDATE_EMAIL && env.A11Y_CANDIDATE_PASSWORD) {
    list.push({ label: "candidate", routes: CANDIDATE_ROUTES, email: env.A11Y_CANDIDATE_EMAIL, password: env.A11Y_CANDIDATE_PASSWORD });
  } else {
    console.log("Skipping candidate routes: set A11Y_CANDIDATE_EMAIL and A11Y_CANDIDATE_PASSWORD to sweep them.");
  }
  if (env.A11Y_EMPLOYER_EMAIL && env.A11Y_EMPLOYER_PASSWORD) {
    list.push({ label: "employer", routes: EMPLOYER_ROUTES, email: env.A11Y_EMPLOYER_EMAIL, password: env.A11Y_EMPLOYER_PASSWORD });
  } else {
    console.log("Skipping employer routes: set A11Y_EMPLOYER_EMAIL and A11Y_EMPLOYER_PASSWORD to sweep them.");
  }
  return list;
}

// An IIFE, not a bare arrow: evaluate() treats a string as an expression to
// evaluate rather than a function to call.
const PROBE = `(() => {
  const doc = document.documentElement;
  const overflow = doc.scrollWidth - window.innerWidth;

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

  return { overflow, wide, tiny };
})()`;

async function signIn(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: NAV_TIMEOUT });
  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: NAV_TIMEOUT }),
    page.click('form button[type="submit"]'),
  ]);
}

async function sweep(browser: Browser, session: Session): Promise<{ checked: number; defects: number }> {
  console.log(`\n=== ${session.label} routes`);
  let defects = 0;
  let checked = 0;

  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    if (session.email && session.password) await signIn(page, session.email, session.password);

    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });

    for (const route of session.routes) {
      errors.length = 0;
      let status = 0;
      try {
        const res = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: NAV_TIMEOUT });
        status = res?.status() ?? 0;
      } catch (err) {
        console.log(`FAIL ${width} ${route}: ${(err as Error).message}`);
        defects += 1;
        continue;
      }
      await page.waitForTimeout(250);
      const probe = (await page.evaluate(PROBE)) as {
        overflow: number;
        wide: string[];
        tiny: number;
      };
      checked += 1;

      const problems: string[] = [];
      if (status !== 200) problems.push(`status ${status}`);
      if (probe.overflow > 1)
        problems.push(`overflows by ${probe.overflow}px (${probe.wide.join(", ")})`);
      if (probe.tiny > 0) problems.push(`${probe.tiny} run(s) of text under 11.5px`);
      if (errors.length > 0) problems.push(`${errors.length} console error(s): ${errors[0]}`);

      if (problems.length > 0) {
        defects += 1;
        console.log(`${String(width).padEnd(5)} ${route.padEnd(44)} ${problems.join(" | ")}`);
      }
    }
    await context.close();
  }
  return { checked, defects };
}

async function main() {
  const browser = await chromium.launch();
  let defects = 0;
  let checked = 0;
  for (const session of sessions()) {
    const result = await sweep(browser, session);
    defects += result.defects;
    checked += result.checked;
  }
  await browser.close();
  console.log(
    `\n${checked} page renders checked across ${WIDTHS.join("/")}. ${defects} defect(s).`
  );
  if (defects > 0) process.exitCode = 1;
}

void main();
