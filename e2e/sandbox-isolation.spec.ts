import { test, expect } from "@playwright/test";

test.describe("sandbox isolation", () => {
  test.skip(!process.env.FYDELL_SANDBOX_E2E, "Set FYDELL_SANDBOX_E2E=true against a running sandbox-enabled server");

  test("two browser contexts cannot see each other", async ({ browser }) => {
    const a = await browser.newContext();
    const b = await browser.newContext();
    const pageA = await a.newPage();
    const pageB = await b.newPage();
    await pageA.goto("/sandbox");
    await pageA.getByRole("button", { name: "Create sandbox" }).click();
    await expect(pageA.getByText("Current step")).toBeVisible();
    await pageB.goto("/sandbox");
    await pageB.getByRole("button", { name: "Create sandbox" }).click();
    const textA = await pageA.locator("body").innerText();
    const textB = await pageB.locator("body").innerText();
    expect(textA).not.toEqual(textB);
    await a.close();
    await b.close();
  });
});
