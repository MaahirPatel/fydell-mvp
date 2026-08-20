import { test, expect } from "@playwright/test";

test.describe("sandbox isolation", () => {
  test.skip(!process.env.FYDELL_SANDBOX_E2E, "Set FYDELL_SANDBOX_E2E=true against a running sandbox-enabled server");

  test("two browser contexts cannot see each other", async ({ browser }) => {
    const a = await browser.newContext();
    const b = await browser.newContext();
    const pageA = await a.newPage();
    const pageB = await b.newPage();
    await pageA.goto("/sandbox");
    await pageA.getByRole("button", { name: "Start demo" }).click();
    await pageB.goto("/sandbox");
    await pageB.getByRole("button", { name: "Start demo" }).click();
    const sessionA = await pageA.evaluate(async () => (await fetch("/api/sandbox").then((response) => response.json())).session);
    const sessionB = await pageB.evaluate(async () => (await fetch("/api/sandbox").then((response) => response.json())).session);
    expect(sessionA.runId).not.toEqual(sessionB.runId);
    await a.close();
    await b.close();
  });

  test("golden path produces evidence, receipt, outcome, and resets", async ({ page }) => {
    await page.goto("/sandbox");
    await page.getByRole("button", { name: "Start demo" }).click();

    await page.goto("/sandbox/work");
    await page.getByRole("button", { name: "Start candidate work" }).click();
    await page.getByLabel("Rollout recommendation").fill(
      "Launch one controlled production cohort after discovery.",
    );
    await page.getByLabel("Customer email").fill(
      "We recommend a controlled production rollout after discovery.",
    );
    await page.getByRole("button", { name: "Commit recommendation" }).click();
    await page.getByRole("button", { name: "Receive engineering update" }).click();
    await expect(page.getByText("Changed information", { exact: true })).toBeVisible();
    await page.getByLabel("Rollout recommendation").fill(
      "Enable sandbox now and defer production until the security review completes.",
    );
    await page.getByRole("button", { name: "Submit revised recommendation" }).click();

    await expect(page.getByRole("heading", { name: "Oral defense" })).toBeVisible();
    await page.locator("form textarea").fill(
      "Validate active use by team, reduce cohort size when data is absent, and notify stakeholders.",
    );
    await page.getByRole("button", { name: "Submit defense" }).click();
    await page.goto("/sandbox/evidence");
    await expect(page.getByRole("heading", { name: "Decision Brief" })).toBeVisible();
    await page.getByRole("button", { name: "approve" }).click();

    await page.goto("/sandbox/receipts");
    await expect(page.getByText("Demo Work Receipt", { exact: true })).toBeVisible();

    await page.goto("/sandbox/outcomes");
    await page.getByRole("button", { name: "Confirmed" }).click();
    await page.getByRole("button", { name: "Advance" }).click();
    await page.getByRole("button", { name: "Record outcome" }).click();
    await expect(page.getByRole("button", { name: "Update outcome" })).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Reset demo" }).click();
    await page.goto("/sandbox");
    await expect(page.getByText("Demo not started")).toBeVisible();
  });
});
