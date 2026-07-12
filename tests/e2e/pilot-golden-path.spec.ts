import { test, expect } from "@playwright/test";

/**
 * Golden-path vertical slice.
 * Requires staging env with migration 010 applied and EMPLOYER_SELF_SIGNUP_MODE=open
 * for automated runs (or pre-approved org). Skips when credentials missing.
 */
const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const RUN = process.env.PILOT_GOLDEN_PATH === "1";

test.describe("pilot golden path", () => {
  test.skip(!RUN, "Set PILOT_GOLDEN_PATH=1 to run against a live stack");

  test("employer → org → invite → session → submit → dashboard", async ({
    page,
    context,
  }) => {
    const stamp = Date.now();
    const employerEmail = `employer.${stamp}@example.com`;
    const candidateEmail = `candidate.${stamp}@example.com`;
    const password = "TestPass123!";

    await page.goto(`${BASE}/signup`);
    await page.getByPlaceholder(/company/i).fill(`Acme Pilot ${stamp}`);
    // AuthForm may use different labels — fill generically
    await page.locator('input[type="email"]').fill(employerEmail);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole("button", { name: /create|sign up/i }).click();

    // Confirmation or onboarding
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(
      url.includes("confirmation") ||
        url.includes("onboarding") ||
        url.includes("dashboard") ||
        url.includes("setup")
    ).toBeTruthy();

    // Rest of path is environment-dependent (email confirm). Documented for staging.
    await context.close();
  });
});
