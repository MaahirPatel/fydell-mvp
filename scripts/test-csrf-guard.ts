/**
 * Deterministic test for the CSRF guard (SEC-07).
 * Run: npx tsx scripts/test-csrf-guard.ts
 */
import { checkCsrf } from "../src/lib/security/csrf";

let passed = 0;
let failed = 0;

function check(name: string, actual: string | null, expected: "pass" | "block") {
  const ok = expected === "pass" ? actual === null : actual !== null;
  if (ok) {
    passed++;
    console.log(`ok   - ${name}`);
  } else {
    failed++;
    console.log(`FAIL - ${name} (expected ${expected}, got ${actual === null ? "pass" : "block"})`);
  }
}

function req(method: string, origin?: string): Request {
  const headers: Record<string, string> = {};
  if (origin) headers["origin"] = origin;
  return new Request("http://localhost:3000/api/test", { method, headers });
}

// GET requests always pass (no state change).
check("GET without origin passes", checkCsrf(req("GET")), "pass");
check("GET with foreign origin passes", checkCsrf(req("GET", "https://evil.example")), "pass");

// POST without origin passes (same-origin form submission).
check("POST without origin passes", checkCsrf(req("POST")), "pass");

// POST with matching local origin passes.
check("POST localhost:3000 passes", checkCsrf(req("POST", "http://localhost:3000")), "pass");
check("POST 127.0.0.1:3000 passes", checkCsrf(req("POST", "http://127.0.0.1:3000")), "pass");

// POST with foreign origin is blocked.
check("POST evil.example blocked", checkCsrf(req("POST", "https://evil.example")), "block");
check("POST lookalike domain blocked", checkCsrf(req("POST", "https://localhost:3000.evil.example")), "block");

// PUT/DELETE/PATCH are also guarded.
check("PUT foreign origin blocked", checkCsrf(req("PUT", "https://evil.example")), "block");
check("DELETE foreign origin blocked", checkCsrf(req("DELETE", "https://evil.example")), "block");
check("PATCH foreign origin blocked", checkCsrf(req("PATCH", "https://evil.example")), "block");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
