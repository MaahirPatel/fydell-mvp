/**
 * Lightweight unit checks for pilot request validation helpers.
 * Run: node --experimental-strip-types scripts/test-pilot-validation.mjs
 * or: npx tsx scripts/test-pilot-validation.ts
 */
import assert from "node:assert/strict";

function clean(value: unknown, max = 500): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function formatReference(year: number, seq: number): string {
  return `FYD-${year}-${String(seq).padStart(6, "0")}`;
}

assert.equal(clean("  Acme  "), "Acme");
assert.equal(clean("a\nb"), "ab");
assert.equal(clean("x".repeat(10), 5), "xxxxx");
assert.equal(isValidEmail("a@b.com"), true);
assert.equal(isValidEmail("not-an-email"), false);
assert.equal(formatReference(2026, 142), "FYD-2026-000142");

console.log("pilot validation checks passed");
