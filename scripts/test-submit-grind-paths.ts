/**
 * UP-04 / UP-07 adversarial tests: hostile filenames and contents.
 *
 * The snapshot validator must reject traversal paths, absolute paths,
 * backslashes, NUL bytes, control characters, empty segments, overlong
 * paths, and case-insensitive duplicates — and must enforce file count /
 * per-file / total byte limits. Hostile-but-legal names (HTML/JS) must be
 * renderable safely via sanitizeDisplayPath + escapeHtml.
 *
 * Symlinks: the JSON snapshot format carries no file-type metadata, so a
 * symlink cannot be represented or created from a snapshot; extraction must
 * create regular files only (asserted via the shape check below).
 *
 * Pure in-process tests: no Supabase, no network, no database.
 * Run via `npx tsx scripts/test-submit-grind-paths.ts`
 */
import { createHash } from "node:crypto";
import {
  collectSnapshotIssues,
  escapeHtml,
  findCaseInsensitiveDuplicate,
  isValidFileSnapshotShape,
  sanitizeDisplayPath,
  unsafeSnapshotPathReason,
  validateFileSnapshot,
  MAX_SNAPSHOT_FILE_BYTES,
  MAX_SNAPSHOT_FILES,
  MAX_SNAPSHOT_TOTAL_BYTES,
  type FileSnapshotInput,
} from "../src/lib/simulations/submission-files";

let failures = 0;
let count = 0;

function check(label: string, cond: boolean, detail = ""): void {
  count += 1;
  if (!cond) {
    failures += 1;
    console.error(`FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

function sha(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function makeSnapshot(
  files: Record<string, string>,
  scenarioId = "harbor-webhooks",
  scenarioVersion = "1.0.0"
): FileSnapshotInput {
  const manifest: Record<string, string> = {};
  for (const [p, c] of Object.entries(files)) manifest[p] = sha(c);
  return { scenarioId, scenarioVersion, files, manifest };
}

const PIN = { scenarioId: "harbor-webhooks", scenarioVersion: "1.0.0" };

function issueCode(snap: FileSnapshotInput): string | null {
  const issues = collectSnapshotIssues(snap, PIN.scenarioId, PIN.scenarioVersion);
  return issues.length > 0 ? issues[0].code : null;
}

// --- sanity: a normal snapshot passes ---------------------------------------
{
  const snap = makeSnapshot({ "src/index.ts": "console.log(1)\n", "README.md": "# hi\n" });
  check("valid snapshot has no issues", issueCode(snap) === null);
  let threw = false;
  try {
    validateFileSnapshot(snap, PIN.scenarioId, PIN.scenarioVersion);
  } catch {
    threw = true;
  }
  check("validateFileSnapshot accepts valid snapshot", !threw);
}

// --- traversal / absolute / separator attacks --------------------------------
const hostilePaths: Array<[string, string]> = [
  ["../../etc/passwd", "parent traversal"],
  ["a/../../etc/passwd", "nested traversal"],
  ["..\\windows\\system32\\x", "backslash traversal"],
  ["C:\\windows\\x", "windows absolute"],
  ["/etc/passwd", "posix absolute"],
  ["a//b.ts", "empty segment"],
  ["/leading.ts", "leading slash"],
  ["trailing/", "trailing slash"],
  ["a/./b.ts", "dot segment"],
  ["a/../b.ts", "dotdot segment"],
  ["a\0b.ts", "NUL byte in path"],
  ["a\x01b.ts", "control char in path"],
  ["a\x7fb.ts", "DEL char in path"],
  ["", "empty path"],
];

for (const [p, label] of hostilePaths) {
  check(`unsafeSnapshotPathReason flags ${label}`, unsafeSnapshotPathReason(p) !== null, JSON.stringify(p));
  const snap = makeSnapshot({ [p]: "x\n" });
  check(`snapshot rejects ${label}`, issueCode(snap) === "PATH_UNSAFE", JSON.stringify(p));
}

// --- overlong paths -----------------------------------------------------------
{
  const long = `a/${"x".repeat(300)}.ts`;
  check("overlong path flagged", unsafeSnapshotPathReason(long) !== null);
  check("snapshot rejects overlong path", issueCode(makeSnapshot({ [long]: "x" })) === "PATH_UNSAFE");

  const longSeg = `${"y".repeat(200)}.ts`;
  check("overlong segment flagged", unsafeSnapshotPathReason(longSeg) !== null);
  check("snapshot rejects overlong segment", issueCode(makeSnapshot({ [longSeg]: "x" })) === "PATH_UNSAFE");
}

// --- duplicates (incl. case-insensitive) ---------------------------------------
{
  check(
    "findCaseInsensitiveDuplicate spots case collision",
    findCaseInsensitiveDuplicate(["src/App.ts", "src/app.ts"]) !== null
  );
  check(
    "findCaseInsensitiveDuplicate ignores distinct paths",
    findCaseInsensitiveDuplicate(["src/App.ts", "src/Other.ts"]) === null
  );
  const snap = makeSnapshot({ "src/App.ts": "a", "src/app.ts": "b" });
  check("snapshot rejects case-insensitive duplicate", issueCode(snap) === "DUPLICATE_PATH");
}

// --- size / count limits ---------------------------------------------------------
{
  const big = "a".repeat(MAX_SNAPSHOT_FILE_BYTES + 1);
  check("snapshot rejects oversized file", issueCode(makeSnapshot({ "big.ts": big })) === "FILE_TOO_LARGE");

  const oneMiB = "b".repeat(1024 * 1024);
  const files: Record<string, string> = {};
  for (let i = 0; i < 6; i++) files[`f${i}.ts`] = oneMiB; // 6 MiB > 5 MiB total
  check("snapshot rejects oversized total", issueCode(makeSnapshot(files)) === "TOTAL_TOO_LARGE");

  const many: Record<string, string> = {};
  for (let i = 0; i < MAX_SNAPSHOT_FILES + 1; i++) many[`f${i}.ts`] = "x";
  check("snapshot rejects too many files", issueCode(makeSnapshot(many)) === "TOO_MANY_FILES");

  check("empty snapshot rejected", issueCode(makeSnapshot({})) === "EMPTY_SNAPSHOT");
}

// --- manifest / hash integrity -----------------------------------------------------
{
  const good = makeSnapshot({ "a.ts": "const a = 1;\n" });
  const tampered: FileSnapshotInput = {
    ...good,
    files: { "a.ts": "const a = 2;\n" },
  };
  check("hash mismatch rejected", issueCode(tampered) === "HASH_MISMATCH");

  const missing: FileSnapshotInput = {
    ...good,
    manifest: { ...good.manifest, "ghost.ts": sha("x") },
  };
  check("manifest-without-file rejected", issueCode(missing) === "MANIFEST_INCONSISTENT");

  const extra: FileSnapshotInput = {
    ...good,
    files: { ...good.files, "extra.ts": "y" },
  };
  check("file-without-manifest rejected", issueCode(extra) === "MANIFEST_INCONSISTENT");

  const badDigest: FileSnapshotInput = {
    ...good,
    manifest: { "a.ts": "not-a-digest" },
  };
  check("non-hex digest rejected", issueCode(badDigest) === "MANIFEST_DIGEST_INVALID");
}

// --- hostile content ----------------------------------------------------------------
{
  const snap = makeSnapshot({ "a.ts": "ok\0binary" });
  check("NUL byte in content rejected", issueCode(snap) === "CONTENT_UNSAFE");

  // Shape check: contents must be strings — no file-type metadata (e.g. a
  // symlink target record) can ride along.
  check(
    "non-string content fails shape check",
    !isValidFileSnapshotShape({
      scenarioId: "harbor-webhooks",
      scenarioVersion: "1.0.0",
      files: { "link": { target: "/etc/passwd" } },
      manifest: { "link": sha("x") },
    })
  );
}

// --- safe rendering of hostile-but-legal names ---------------------------------------
{
  const evil = `<script>alert("xss")</script>.ts`;
  check("html/js filename is a legal path", unsafeSnapshotPathReason(evil) === null);
  const rendered = escapeHtml(sanitizeDisplayPath(evil));
  check("escaped filename contains no raw script tag", !rendered.includes("<script>"));
  check(
    "escaped filename is fully entity-encoded",
    rendered === "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;.ts",
    rendered
  );

  check("escapeHtml encodes all specials", escapeHtml(`&<>"'`) === "&amp;&lt;&gt;&quot;&#39;");
  check("sanitizeDisplayPath strips control chars", sanitizeDisplayPath("a\x00\x1fb") === "ab");
  check("sanitizeDisplayPath truncates", sanitizeDisplayPath("x".repeat(500)).length === 120);
  check("sanitizeDisplayPath handles empty", sanitizeDisplayPath("") === "(unnamed file)");
  check(
    "sanitized display path never contains raw angle brackets after escape",
    !escapeHtml(sanitizeDisplayPath(`"><img src=x onerror=alert(1)>`)).includes("<img")
  );
}

// --- total-bytes constant sanity ------------------------------------------------------
check("total-bytes cap is 5 MiB", MAX_SNAPSHOT_TOTAL_BYTES === 5 * 1024 * 1024);

console.log(`\n${count - failures}/${count} passed`);
process.exit(failures > 0 ? 1 : 0);
