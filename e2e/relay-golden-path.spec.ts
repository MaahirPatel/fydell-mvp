import { test, expect } from "@playwright/test";

/**
 * Smoke coverage for the public Relay marketing/auth surfaces plus a
 * structural check that legacy Project Meridian / FP&A copy is gone from
 * the homepage. This is intentionally shallow — it must pass against a
 * fresh `npm run dev` with no seeded data and no Supabase configured.
 *
 * The authenticated employer → invite → session → submit path is real but
 * environment-dependent (Supabase project, seeded org, email confirm), so it
 * only runs when RELAY_E2E=1 plus RELAY_E2E_EMPLOYER_EMAIL / _PASSWORD are set.
 * Everything else in this file always runs in CI.
 */

const PUBLIC_PAGES = ["/signup", "/login", "/pricing", "/simulation", "/work-receipts", "/trust"];

test.describe("Relay golden path — public surfaces", () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path} loads without crashing`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));

      const response = await page.goto(path);
      expect(response?.ok(), `${path} should return a 2xx/3xx response`).toBeTruthy();

      // No unhandled client exceptions (Next.js error overlay, React crash, etc).
      await expect(page.locator("body")).toBeVisible();
      expect(pageErrors, `unhandled page errors on ${path}: ${pageErrors.join(", ")}`).toEqual([]);
    });
  }

  test("/app/employer redirects to login instead of crashing when unauthenticated", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    const response = await page.goto("/app/employer");
    expect(response?.ok(), "unauthenticated /app/employer should still resolve (redirect)").toBeTruthy();
    expect(page.url()).toContain("/login");
    expect(pageErrors).toEqual([]);
  });

  test("SiteNav exposes Sign up and Log in", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("banner");
    await expect(nav.getByRole("link", { name: "Log in", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Sign up", exact: true })).toBeVisible();
  });

  test("homepage does not contain retired Project Meridian / Forecast Model copy", async ({
    page,
  }) => {
    await page.goto("/");
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toContain("Project Meridian");
    expect(bodyText).not.toContain("Forecast Model");
  });
});

// ---------------------------------------------------------------------------
// Authenticated Relay path — soft-skipped unless explicitly enabled with
// real credentials for a seeded environment.
// ---------------------------------------------------------------------------

const RUN_AUTH_PATH = process.env.RELAY_E2E === "1";
const EMPLOYER_EMAIL = process.env.RELAY_E2E_EMPLOYER_EMAIL;
const EMPLOYER_PASSWORD = process.env.RELAY_E2E_EMPLOYER_PASSWORD;

test.describe("Relay golden path — authenticated employer flow", () => {
  test.skip(
    !RUN_AUTH_PATH || !EMPLOYER_EMAIL || !EMPLOYER_PASSWORD,
    "Set RELAY_E2E=1 with RELAY_E2E_EMPLOYER_EMAIL / RELAY_E2E_EMPLOYER_PASSWORD to run against a seeded environment"
  );

  test("employer can log in and reach Mission Control", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(EMPLOYER_EMAIL!);
    await page.locator('input[type="password"]').fill(EMPLOYER_PASSWORD!);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL(/\/app\/employer/, { timeout: 20000 });
    await expect(page.getByText("Mission control", { exact: false })).toBeVisible({
      timeout: 20000,
    });
  });
});
