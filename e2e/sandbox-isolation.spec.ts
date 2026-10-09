import { test, expect } from "@playwright/test";

/**
 * The public sandbox is retired. The employer Demo workspace replaced it, and its
 * per-user isolation is covered by scripts/test-employer-demo-isolation.ts.
 * Old URLs must route through /demo and the old anonymous API must stay gone.
 */
test.describe("retired public sandbox", () => {
  const redirects: Array<[string, string]> = [
    ["/sandbox", "/app/employer/demo"],
    ["/sandbox/roles", "/app/employer/demo"],
    ["/sandbox/work", "/app/demo/task"],
    ["/sandbox/simulation", "/app/demo/task"],
    ["/sandbox/evidence", "/app/employer/demo/applicants/amara-osei"],
  ];

  for (const [from, target] of redirects) {
    test(`${from} routes through /demo`, async ({ request }) => {
      const response = await request.get(from, { maxRedirects: 0 });
      expect([302, 307]).toContain(response.status());
      const location = response.headers()["location"] ?? "";
      expect(location).toContain("/demo?next=");
      expect(decodeURIComponent(location)).toContain(target);
    });
  }

  test("the anonymous sandbox API is gone", async ({ request }) => {
    const response = await request.get("/api/sandbox");
    expect(response.status()).toBe(410);
  });
});
