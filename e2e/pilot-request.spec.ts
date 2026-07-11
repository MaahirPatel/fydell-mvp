import { test, expect } from "@playwright/test";

/**
 * Core pilot-request acceptance path.
 * Requires a running app (playwright webServer) and CAPTCHA_DISABLED=true in test env.
 */
test.describe("Pilot request durable flow", () => {
  test("submits form and shows FYD reference only after success", async ({ page }) => {
    await page.goto("/request-pilot");
    await page.getByLabel("Name").fill("Playwright Tester");
    await page.getByLabel("Work email").fill("playwright@example.com");
    await page.getByLabel("Company").fill("Example Finance Co");
    await page.getByLabel("Role you are hiring for").fill("FP&A Analyst");
    await page.getByRole("button", { name: /Request a pilot/i }).click();

    await expect(page.getByText("Request received")).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/Reference:\s*FYD-/)).toBeVisible();
  });
});
