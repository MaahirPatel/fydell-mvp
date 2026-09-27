import { test, expect } from "@playwright/test";

/**
 * These run only against a sandbox-enabled server with fydell-dev credentials.
 * Without them the sandbox API returns 503 and no session can exist, so the
 * suite skips rather than asserting against a shell that never loaded data.
 */
test.describe("sandbox isolation", () => {
  test.skip(
    !process.env.FYDELL_SANDBOX_E2E,
    "Set FYDELL_SANDBOX_E2E=true against a running sandbox-enabled server",
  );

  test("canonical shell uses the Applied AI proof sequence", async ({ page }) => {
    await page.goto("/sandbox");

    const nav = page.getByRole("navigation", { name: "Sandbox" });
    for (const label of [
      "Proof overview",
      "Role proof",
      "Verification episode",
      "Evidence",
      "Work receipt",
      "Outcomes",
    ]) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }

    // The replaced label and the removed fake shell controls must stay gone.
    await expect(page.getByRole("link", { name: "Live simulation" })).toHaveCount(0);
    await expect(page.getByRole("searchbox")).toHaveCount(0);
    await expect(page.getByText("Northstar sandbox")).toHaveCount(0);

    await expect(page.getByRole("heading", { name: "Applied AI proof workflow" })).toBeVisible();
    await expect(page.getByText("Sandbox · Fictional data")).toBeVisible();
  });

  test("canonical routes redirect to the surfaces that own them", async ({ page }) => {
    await page.goto("/sandbox/overview");
    await expect(page).toHaveURL(/\/sandbox\/roles$/);

    await page.goto("/sandbox/simulation");
    await expect(page).toHaveURL(/\/sandbox\/work$/);
  });

  test("role proof reports coverage for all eight requirements", async ({ page }) => {
    await page.goto("/sandbox/roles");

    await expect(page.getByRole("heading", { name: /Applied AI Engineer role proof/ })).toBeVisible();
    for (const id of [
      "PR-AI-01",
      "PR-AI-02",
      "PR-AI-03",
      "PR-AI-04",
      "PR-AI-05",
      "PR-AI-06",
      "PR-AI-07",
      "PR-AI-08",
    ]) {
      await expect(page.getByText(id, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByText(/6\/8 supported/)).toBeVisible();
    await expect(page.getByText(/not a published employer evaluation/)).toBeVisible();
  });

  test("two browser contexts cannot see each other", async ({ browser }) => {
    const a = await browser.newContext();
    const b = await browser.newContext();
    const pageA = await a.newPage();
    const pageB = await b.newPage();

    await pageA.goto("/sandbox");
    await pageA.getByRole("button", { name: "Start verification episode" }).click();
    await pageB.goto("/sandbox");
    await pageB.getByRole("button", { name: "Start verification episode" }).click();

    const sessionA = await pageA.evaluate(
      async () => (await fetch("/api/sandbox").then((response) => response.json())).session,
    );
    const sessionB = await pageB.evaluate(
      async () => (await fetch("/api/sandbox").then((response) => response.json())).session,
    );
    expect(sessionA.runId).not.toEqual(sessionB.runId);

    await a.close();
    await b.close();
  });

  test("evidence and receipt refuse to invent state before the work exists", async ({ page }) => {
    await page.goto("/sandbox");
    await page.getByRole("button", { name: "Start verification episode" }).click();

    await page.goto("/sandbox/evidence");
    await expect(
      page.getByRole("heading", { name: "Evidence is created from completed work" }),
    ).toBeVisible();
    await expect(page.getByText("No sample evidence is shown.")).toBeVisible();

    await page.goto("/sandbox/receipts");
    await expect(
      page.getByRole("heading", { name: "Work receipt is not issued yet" }),
    ).toBeVisible();
  });

  test("verification episode records the Applied AI candidate loop", async ({ page }) => {
    await page.goto("/sandbox/work");
    await page.getByRole("button", { name: "Create verification workspace" }).click();
    await page.getByRole("button", { name: "Start candidate work" }).click();

    await expect(page.getByRole("heading", { name: "Executable workflow config" })).toBeVisible();
    await expect(page.getByText(/Proposal code is saved but never executed/)).toBeVisible();

    // Opening a failed trace is the gate for the baseline evaluation.
    await page.getByRole("button", { name: /Trace 024/ }).click();
    await page.getByRole("button", { name: "Run baseline" }).click();
    await expect(page.getByRole("button", { name: "Rerun evaluation" })).toBeVisible();

    await page.getByRole("button", { name: "Save config mutation" }).click();
    await page.getByRole("button", { name: "Add / update case" }).click();
    await page.getByRole("button", { name: "Commit approach & release fact" }).click();

    // LATENCY_001 is the one changed fact and is released exactly once.
    await expect(page.getByText(/LATENCY_001 · released once/)).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Reset demo" }).click();
  });

  test("outcome recording stays gated until the session is finalized", async ({ page }) => {
    await page.goto("/sandbox");
    await page.getByRole("button", { name: "Start verification episode" }).click();

    await page.goto("/sandbox/outcomes");
    // A fresh session is not finalized, so the control is present but disabled
    // rather than reporting an outcome that was never recorded.
    await expect(page.getByRole("button", { name: "Record outcome" })).toBeDisabled();
  });
});
