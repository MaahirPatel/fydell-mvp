/**
 * Lightweight unit checks for the FDE vertical-slice pure helpers:
 * token hashing, idempotent submit logic, and receipt number formatting.
 *
 * These reimplement the exact logic in src/lib/fde/relay-session.ts and
 * src/lib/fde/receipts.ts inline (rather than importing "@/..." aliased
 * modules) to keep this script runnable standalone via `npx tsx`, matching
 * the existing scripts/test-pilot-validation.ts convention.
 *
 * Run: npx tsx scripts/test-fde-loop-unit.ts
 */
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";

// ---------------------------------------------------------------------------
// Token hashing (mirrors hashInviteToken / mintInviteToken / hashShareToken)
// ---------------------------------------------------------------------------

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function mintToken(): string {
  return randomBytes(24).toString("base64url");
}

{
  const token = mintToken();
  const hash1 = hashToken(token);
  const hash2 = hashToken(token);

  assert.equal(hash1, hash2, "hashing the same token twice must be deterministic");
  assert.equal(hash1.length, 64, "sha256 hex digest must be 64 characters");
  assert.notEqual(hash1, token, "hash must not equal the raw token");
  assert.notEqual(hashToken(mintToken()), hashToken(mintToken()), "two minted tokens must hash differently");
  assert.ok(/^[0-9a-f]{64}$/.test(hash1), "hash must be lowercase hex");
}

console.log("token hashing checks passed");

// ---------------------------------------------------------------------------
// Idempotent submit decision (mirrors decideSubmission in relay-session.ts)
// ---------------------------------------------------------------------------

function decideSubmission(
  status: string,
  existingSnapshot: Record<string, unknown> | null,
  candidateSnapshot: Record<string, unknown>
): { shouldFreeze: boolean; snapshot: Record<string, unknown> } {
  const alreadyFrozen = ["submitted", "processing", "receipt_ready"].includes(status);
  if (alreadyFrozen && existingSnapshot) {
    return { shouldFreeze: false, snapshot: existingSnapshot };
  }
  return { shouldFreeze: true, snapshot: candidateSnapshot };
}

{
  const firstSnapshot = { files: { "a.py": "v1" }, submittedAt: "2026-01-01T00:00:00.000Z" };
  const tamperedSnapshot = { files: { "a.py": "TAMPERED" }, submittedAt: "2026-01-01T00:05:00.000Z" };

  // First submit from an active session freezes the candidate's snapshot.
  const first = decideSubmission("active", null, firstSnapshot);
  assert.equal(first.shouldFreeze, true, "first submit from an active session should freeze");
  assert.deepEqual(first.snapshot, firstSnapshot);

  // A retry (double click, network retry) after status has advanced must be a no-op
  // and must return the ORIGINAL snapshot, never the new one.
  const retryAfterSubmitted = decideSubmission("submitted", firstSnapshot, tamperedSnapshot);
  assert.equal(retryAfterSubmitted.shouldFreeze, false, "retry after submitted must not re-freeze");
  assert.deepEqual(retryAfterSubmitted.snapshot, firstSnapshot, "retry must return the original frozen snapshot");

  const retryAfterProcessing = decideSubmission("processing", firstSnapshot, tamperedSnapshot);
  assert.equal(retryAfterProcessing.shouldFreeze, false, "retry after processing must not re-freeze");
  assert.deepEqual(retryAfterProcessing.snapshot, firstSnapshot);

  const retryAfterReceiptReady = decideSubmission("receipt_ready", firstSnapshot, tamperedSnapshot);
  assert.equal(retryAfterReceiptReady.shouldFreeze, false, "retry after receipt_ready must not re-freeze");
  assert.deepEqual(retryAfterReceiptReady.snapshot, firstSnapshot);

  // A "frozen" status with no snapshot on record (shouldn't normally happen) falls back
  // to freezing whatever was just submitted rather than losing the submission entirely.
  const recoveryCase = decideSubmission("submitted", null, firstSnapshot);
  assert.equal(recoveryCase.shouldFreeze, true, "missing snapshot must not silently drop a submission");
}

console.log("idempotent submit logic checks passed");

// ---------------------------------------------------------------------------
// Receipt number format (mirrors formatReceiptNumber / RECEIPT_NUMBER_RE)
// ---------------------------------------------------------------------------

const RECEIPT_NUMBER_RE = /^WR-\d{4}-\d{6}$/;

function formatReceiptNumber(date: Date, sequence: number): string {
  const year = date.getUTCFullYear();
  const seq = String(Math.max(1, sequence)).padStart(6, "0");
  return `WR-${year}-${seq}`;
}

{
  assert.equal(formatReceiptNumber(new Date("2026-03-01T00:00:00Z"), 1), "WR-2026-000001");
  assert.equal(formatReceiptNumber(new Date("2026-03-01T00:00:00Z"), 142), "WR-2026-000142");
  assert.equal(formatReceiptNumber(new Date("2031-12-31T00:00:00Z"), 999999), "WR-2031-999999");
  assert.equal(formatReceiptNumber(new Date("2026-03-01T00:00:00Z"), 0), "WR-2026-000001", "sequence floors at 1");
  assert.equal(formatReceiptNumber(new Date("2026-03-01T00:00:00Z"), -5), "WR-2026-000001", "sequence never goes negative");

  for (const n of [1, 142, 999999]) {
    assert.ok(RECEIPT_NUMBER_RE.test(formatReceiptNumber(new Date(), n)), `receipt number for sequence ${n} must match the canonical format`);
  }
  assert.equal(RECEIPT_NUMBER_RE.test("WR-2026-142"), false, "sequence must be zero-padded to 6 digits");
  assert.equal(RECEIPT_NUMBER_RE.test("wr-2026-000142"), false, "prefix must be uppercase");
}

console.log("receipt number format checks passed");

console.log("fde loop unit checks passed");
