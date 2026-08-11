/**
 * October pilot primary path (Playwright).
 *
 * Full live path requires seeded templates, applied 021 migration, and auth.
 * This spec always covers public honesty; the authenticated loop runs when
 * E2E_PILOT_EMAIL / E2E_PILOT_PASSWORD are set.
 */
import { test, expect } from "@playwright/test";

test.describe("October pilot public surfaces", () => {
  test("homepage sells the real October product", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /See how candidates work before deciding whom to interview/i
    );
    await expect(page.getByRole("link", { name: /Request a pilot/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Sign in/i }).first()).toBeVisible();
  });

  test("malformed invite fails safely", async ({ page }) => {
    await page.goto("/invite/not-a-real-token");
    await expect(page.getByRole("heading")).toContainText(/Invitation not found|not found/i);
  });
});

test.describe("October pilot authenticated loop", () => {
  test.skip(!process.env.E2E_PILOT_EMAIL || !process.env.E2E_PILOT_PASSWORD, "Needs E2E_PILOT_*");

  test("employer cohort page loads", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(process.env.E2E_PILOT_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.E2E_PILOT_PASSWORD!);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.goto("/app/employer/cohort");
    await expect(page.getByRole("heading", { name: /Pilot cohort/i })).toBeVisible();
  });
});
