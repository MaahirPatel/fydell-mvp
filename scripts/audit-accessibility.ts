/**
 * Contrast, heading order and accessible-name audit for the public routes.
 *
 * Usage: npx tsx scripts/audit-accessibility.ts [baseUrl]
 *
 * Contrast is computed from the rendered pixels' declared colours: the text
 * colour against the nearest ancestor with a non-transparent background. That
 * catches the failure this codebase actually had, which was low-alpha text on
 * near-black, without needing a full axe harness.
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:3000";

/** Comma-separated override, so the signed-in app can be audited too. */
const ROUTE_OVERRIDE = (process.argv[3] || "")
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean);

const PUBLIC_ROUTES = [
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
  "/forgot-password",
  "/reset-password",
];

const ROUTES = ROUTE_OVERRIDE.length > 0 ? ROUTE_OVERRIDE : PUBLIC_ROUTES;

type Finding = {
  kind: "contrast" | "heading" | "name" | "alt";
  detail: string;
};

const AUDIT = `() => {
  const findings = [];

  const parse = (c) => {
    const m = c.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(",").map((v) => parseFloat(v.trim()));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };

  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });

  const lum = (c) => {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };

  const ratio = (a, b) => {
    const l1 = lum(a);
    const l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  const backgroundOf = (el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      const bg = parse(getComputedStyle(node).backgroundColor);
      if (bg && bg.a > 0.98) return bg;
      node = node.parentElement;
    }
    return { r: 8, g: 9, b: 10, a: 1 };
  };

  // Contrast on every element that directly renders visible text.
  const seen = new Set();
  document.querySelectorAll("body *").forEach((el) => {
    const text = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(" ")
      .trim();
    if (!text) return;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") return;
    if (parseFloat(style.opacity) < 0.5) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const fg = parse(style.color);
    if (!fg) return;
    const bg = backgroundOf(el);
    const effective = fg.a < 1 ? over(fg, bg) : fg;
    const r = ratio(effective, bg);

    const size = parseFloat(style.fontSize);
    const weight = parseInt(style.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const required = large ? 3 : 4.5;

    if (r < required) {
      const key = style.color + "|" + size + "|" + text.slice(0, 24);
      if (seen.has(key)) return;
      seen.add(key);
      findings.push({
        kind: "contrast",
        detail:
          r.toFixed(2) + ":1 (needs " + required + ") " +
          style.color + " at " + size + "px on rgb(" +
          Math.round(bg.r) + "," + Math.round(bg.g) + "," + Math.round(bg.b) + ") " +
          JSON.stringify(text.slice(0, 48)),
      });
    }
  });

  // Exactly one h1, and no skipped heading level.
  const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"));
  const h1s = headings.filter((h) => h.tagName === "H1");
  if (h1s.length !== 1) {
    findings.push({ kind: "heading", detail: h1s.length + " h1 elements" });
  }
  let previous = 0;
  headings.forEach((h) => {
    const level = Number(h.tagName[1]);
    if (previous && level > previous + 1) {
      findings.push({
        kind: "heading",
        detail: "h" + previous + " followed by h" + level + ": " +
          JSON.stringify((h.textContent || "").trim().slice(0, 40)),
      });
    }
    previous = level;
  });

  // Every interactive control needs an accessible name.
  document.querySelectorAll("a[href],button,input,select,textarea").forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const label =
      (el.getAttribute("aria-label") || "").trim() ||
      (el.textContent || "").trim() ||
      (el.getAttribute("title") || "").trim() ||
      (el.labels && el.labels.length ? (el.labels[0].textContent || "").trim() : "") ||
      (el.getAttribute("placeholder") || "").trim();
    if (!label) {
      findings.push({
        kind: "name",
        detail: el.tagName.toLowerCase() + " has no accessible name: " +
          el.outerHTML.slice(0, 90),
      });
    }
  });

  document.querySelectorAll("img").forEach((img) => {
    if (img.getAttribute("alt") === null) {
      findings.push({ kind: "alt", detail: "img without alt: " + img.src });
    }
  });

  return findings;
}`;

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  let total = 0;

  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(250);
    const findings = (await page.evaluate(`(${AUDIT})()`)) as Finding[];
    if (findings.length === 0) {
      console.log(`  ok   ${route}`);
    } else {
      console.log(`  FAIL ${route} (${findings.length})`);
      findings.forEach((f) => console.log(`         [${f.kind}] ${f.detail}`));
      total += findings.length;
    }
  }

  // WCAG 2.4.7: tabbing through a route must never land on a control with no
  // visible focus indicator. Real Tab presses are used so :focus-visible
  // resolves the way it does for a keyboard user.
  console.log("\nKeyboard focus visibility");
  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(200);
    const invisible: string[] = [];
    let stops = 0;

    // Auth pages autofocus their first field, and Tab resumes from wherever
    // focus sits. Moving the sequential-navigation starting point to the body
    // makes the traversal begin at the top of the document every time.
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      document.body.setAttribute("tabindex", "-1");
      document.body.focus();
      document.body.removeAttribute("tabindex");
    });

    for (let i = 0; i < 60; i += 1) {
      await page.keyboard.press("Tab");
      // Cycle detection marks the node itself. Keying on the label would
      // collide on unlabelled inputs and stop the traversal early.
      const state = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        if (el.dataset.a11ySeen === "1") return { done: true };
        el.dataset.a11ySeen = "1";
        const s = getComputedStyle(el);
        return {
          done: false,
          id:
            el.tagName.toLowerCase() +
            (el.getAttribute("name") ? `[${el.getAttribute("name")}]` : "") +
            ":" +
            (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30),
          outlineWidth: parseFloat(s.outlineWidth) || 0,
          outlineStyle: s.outlineStyle,
          boxShadow: s.boxShadow,
        };
      });
      if (!state || state.done) break;
      stops += 1;

      const hasOutline = (state.outlineWidth ?? 0) > 0 && state.outlineStyle !== "none";
      const hasRing = state.boxShadow !== "none" && state.boxShadow !== "";
      if (!hasOutline && !hasRing) invisible.push(state.id as string);
    }

    if (invisible.length > 0) {
      console.log(`  FAIL ${route}: ${invisible.length} stop(s) with no visible focus`);
      invisible.forEach((i) => console.log(`         ${i}`));
      total += invisible.length;
    } else {
      console.log(`  ok   ${route} (${stops} tab stops)`);
    }
  }

  // WCAG 1.4.10: at 200 percent zoom on a 1280 viewport, nothing may require
  // horizontal scrolling. A 640 CSS-pixel viewport is the equivalent.
  console.log("\n200 percent zoom (640 CSS px, no horizontal scroll)");
  const zoomed = await browser.newContext({
    viewport: { width: 640, height: 800 },
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  const zoomPage = await zoomed.newPage();
  for (const route of ROUTES) {
    await zoomPage.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 30000 });
    await zoomPage.waitForTimeout(200);
    const overflow = await zoomPage.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (overflow > 1) {
      console.log(`  FAIL ${route} overflows by ${overflow}px`);
      total += 1;
    } else {
      console.log(`  ok   ${route}`);
    }
  }
  await zoomed.close();

  await browser.close();
  console.log(`\n${total} finding(s).`);
  if (total > 0) process.exitCode = 1;
}

void main();
