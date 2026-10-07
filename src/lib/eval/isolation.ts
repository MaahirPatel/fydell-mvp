/**
 * RUN-04 - Authoritative tests outside candidate control.
 *
 * Guarantees:
 *  1. The trusted test bundle is sealed by hash. Any candidate-side change
 *     to the tests (or a swapped bundle) fails verification before the run.
 *  2. Test paths resolve inside the sealed bundle only - traversal and
 *     absolute paths are rejected, so candidate code cannot redirect the
 *     harness at a different test file.
 *  3. The harness computes the verdict from process signals (exit code /
 *     timeout / crash). Candidate-printed summaries ("ALL TESTS PASSED")
 *     are treated as untrusted stdout and never as verdicts.
 */

import { createHash } from "crypto";

export interface SealedTestBundle {
  suiteVersion: string;
  /** sha256 over the sorted (path, content) pairs. */
  testsHash: string;
  files: { path: string; content: string }[];
  sealedAt: string;
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

/** Seal a test bundle: hash-pin every file. */
export function sealTestBundle(suiteVersion: string, files: { path: string; content: string }[]): SealedTestBundle {
  const testsHash = sha256Hex(
    files
      .map((f) => `${f.path}\n${f.content}`)
      .sort()
      .join("\n---\n"),
  );
  return { suiteVersion, testsHash, files, sealedAt: new Date().toISOString() };
}

/** Verify a bundle is intact. Returns the failure reason, or null when intact. */
export function verifyTestBundle(bundle: SealedTestBundle): string | null {
  const recomputed = sealTestBundle(bundle.suiteVersion, bundle.files).testsHash;
  if (recomputed !== bundle.testsHash) {
    return "RUN-04: test bundle hash mismatch. The authoritative tests were modified or swapped after sealing";
  }
  return null;
}

/**
 * Resolve a test path inside the sealed bundle. Rejects traversal, absolute
 * paths, and anything outside the bundle. Returns the bundle-relative path.
 */
export function resolveTestPath(bundle: SealedTestBundle, requested: string): string {
  const normalized = requested.replace(/\\/g, "/");
  if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) {
    throw new Error(`RUN-04: absolute test path rejected: ${requested.slice(0, 80)}`);
  }
  const parts: string[] = [];
  for (const seg of normalized.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") throw new Error(`RUN-04: traversal in test path rejected: ${requested.slice(0, 80)}`);
    parts.push(seg);
  }
  const resolved = parts.join("/");
  if (!bundle.files.some((f) => f.path === resolved)) {
    throw new Error(`RUN-04: test path "${resolved}" is not in the sealed bundle`);
  }
  return resolved;
}

export interface HarnessRunResult {
  exitCode: number;
  timedOut: boolean;
  signal?: string;
  /** Raw stdout - UNTRUSTED. May contain candidate-printed lies. */
  stdout: string;
}

export type TestVerdict = "passed" | "failed";

/**
 * Compute the verdict from harness signals ONLY. Candidate-printed summaries
 * in stdout are ignored - even "ALL TESTS PASSED" with exit code 1 is a fail.
 */
export function verdictFromHarness(run: HarnessRunResult): {
  verdict: TestVerdict;
  reason: string;
  ignoredCandidateSummary: boolean;
} {
  const claimsPass = /all tests passed|OK\b.*\bpassed|BUILD SUCCESS/i.test(run.stdout);
  const passed = run.exitCode === 0 && !run.timedOut && !run.signal;
  return {
    verdict: passed ? "passed" : "failed",
    reason: passed
      ? "Harness signals clean: exit 0, no timeout, no crash signal."
      : `Harness signals failure: exit=${run.exitCode} timedOut=${run.timedOut} signal=${run.signal ?? "none"}. Candidate-printed output was not consulted.`,
    ignoredCandidateSummary: claimsPass && !passed,
  };
}
