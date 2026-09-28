/**
 * W3/W4 tests: versioned file package + atomic file-snapshot submission.
 *
 * W3: the package builder reads ONLY the scenario's `files` allowlist
 * (exclusion by construction), pins the version, hashes every file, and
 * carries the canonical testCommand. Hidden eval material (canonical.json)
 * must provably never enter the package.
 *
 * W4: snapshot validation recomputes every client-claimed hash (mismatch →
 * reject, nothing stored), the receipt hash is deterministic and
 * content-sensitive, and the submission snapshot assembles the file set +
 * receipt into the single jsonb row that `submit_session_atomic` stores
 * transactionally.
 *
 * Pure in-process tests: no Supabase, no network, no database. The
 * `submit_session_atomic` plpgsql transaction itself is reviewed but not
 * executed here (no Postgres in this environment) — noted in ARCHITECTURE.md.
 *
 * Run via `npm run test:file-package`
 * (tsx --conditions react-server, for the `server-only` package builder).
 */
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildScenarioPackage,
  scenarioIdForTemplateSlug,
  sha256Hex,
} from "../src/lib/simulations/scenario-package";
import {
  buildSubmissionSnapshot,
  computeReceiptHash,
  isValidFileSnapshotShape,
  validateFileSnapshot,
  type FileSnapshotInput,
} from "../src/lib/simulations/submission-files";

const REPO = process.cwd();
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

function throws(label: string, fn: () => void, wantSubstr?: string): void {
  count += 1;
  try {
    fn();
    failures += 1;
    console.error(`FAIL ${label} — expected throw, none thrown`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (wantSubstr && !msg.includes(wantSubstr)) {
      failures += 1;
      console.error(`FAIL ${label} — threw, but message missing ${JSON.stringify(wantSubstr)}: ${msg}`);
    } else {
      console.log(`ok   ${label}`);
    }
  }
}

const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

// ---------------------------------------------------------------- W3: package
const pkg = buildScenarioPackage("project-relay", REPO);

check("W3: scenario version pinned to 2.0.0", pkg.scenarioVersion === "2.0.0", pkg.scenarioVersion);
check("W3: scenario id is project-relay", pkg.scenarioId === "project-relay");

const allowlist: string[] = JSON.parse(
  readFileSync(join(REPO, "scenarios/project-relay/.fydell/scenario.json"), "utf8")
).files;
check(
  "W3: package file set equals the allowlist exactly",
  JSON.stringify(Object.keys(pkg.files).sort()) === JSON.stringify([...allowlist].sort()),
  `got ${Object.keys(pkg.files).length}, allowlist ${allowlist.length}`
);

// Every manifest entry matches a recomputed hash of the served content.
let allMatch = true;
for (const [path, content] of Object.entries(pkg.files)) {
  if (pkg.manifest[path] !== sha256(content)) {
    allMatch = false;
    console.error(`  manifest mismatch: ${path}`);
  }
}
check("W3: every manifest hash matches recomputed file content", allMatch);
check(
  "W3: manifest key set equals file key set",
  JSON.stringify(Object.keys(pkg.manifest).sort()) === JSON.stringify(Object.keys(pkg.files).sort())
);

// Exclusion by construction: server-only material provably absent.
check("W3: canonical.json NOT in package", !("canonical.json" in pkg.files));
check("W3: canonical.json NOT in manifest", !("canonical.json" in pkg.manifest));
check("W3: .fydell/scenario.json NOT in package", !(".fydell/scenario.json" in pkg.files));
check(
  "W3: no file outside the allowlist can enter",
  Object.keys(pkg.files).every((p) => allowlist.includes(p))
);
// Sanity: allowlisted eval runner IS candidate-visible by author intent.
check("W3: allowlisted evals/run_evals.py is present", "evals/run_evals.py" in pkg.files);
check("W3: allowlisted data file is present", "data/shipments.csv" in pkg.files);

check(
  "W3: canonical testCommand",
  JSON.stringify(pkg.testCommand) === JSON.stringify(["pytest", "tests/test_reconcile.py"]),
  JSON.stringify(pkg.testCommand)
);
check("W3: testCommand target is in the package", pkg.testCommand[1] in pkg.files);

// Slug mapping convention.
check(
  "W3: template slug 'project-relay' maps to scenario",
  scenarioIdForTemplateSlug("project-relay", REPO) === "project-relay"
);
check("W3: unknown slug maps to null", scenarioIdForTemplateSlug("micro-data-analytics", REPO) === null);
check("W3: traversal slug rejected", scenarioIdForTemplateSlug("../evil", REPO) === null);
check("W3: empty slug rejected", scenarioIdForTemplateSlug("", REPO) === null);
check("W3: null slug rejected", scenarioIdForTemplateSlug(null, REPO) === null);

// Traversal / missing-file guards, against a fixture scenario dir.
const fixtureBase = join(tmpdir(), `fydell-pkg-test-${Date.now()}`);
const evilDir = join(fixtureBase, "scenarios", "evil");
mkdirSync(join(evilDir, ".fydell"), { recursive: true });
writeFileSync(
  join(evilDir, ".fydell", "scenario.json"),
  JSON.stringify({ id: "evil", version: "1.0.0", files: ["../escape.txt", "ok.txt"] })
);
writeFileSync(join(evilDir, "ok.txt"), "fine");
throws("W3: '..' in allowlist throws", () => buildScenarioPackage("evil", fixtureBase), "Unsafe path");
writeFileSync(
  join(evilDir, ".fydell", "scenario.json"),
  JSON.stringify({ id: "evil", version: "1.0.0", files: ["missing.txt"] })
);
throws("W3: allowlisted-but-missing file throws", () => buildScenarioPackage("evil", fixtureBase), "missing on disk");
throws("W3: unknown scenario throws", () => buildScenarioPackage("nope", REPO), "not found");
throws("W3: traversal scenario id throws", () => buildScenarioPackage("../evil", fixtureBase), "Invalid scenario id");
rmSync(fixtureBase, { recursive: true, force: true });

// ---------------------------------------------------------------- W4: snapshot
function validSnapshot(): FileSnapshotInput {
  return {
    scenarioId: pkg.scenarioId,
    scenarioVersion: pkg.scenarioVersion,
    files: { ...pkg.files },
    manifest: { ...pkg.manifest },
  };
}

check("W4: valid snapshot passes validation", (() => {
  try { validateFileSnapshot(validSnapshot(), pkg.scenarioId, pkg.scenarioVersion); return true; }
  catch { return false; }
})());

const tampered = validSnapshot();
tampered.files["src/join.py"] = tampered.files["src/join.py"] + "# tampered\n";
throws("W4: tampered content rejected", () =>
  validateFileSnapshot(tampered, pkg.scenarioId, pkg.scenarioVersion), "Hash mismatch");

const missingEntry = validSnapshot();
delete missingEntry.manifest["src/join.py"];
throws("W4: file without manifest entry rejected", () =>
  validateFileSnapshot(missingEntry, pkg.scenarioId, pkg.scenarioVersion), "no manifest entry");

const extraEntry = validSnapshot();
extraEntry.manifest["ghost.py"] = sha256Hex("ghost");
throws("W4: manifest entry without file rejected", () =>
  validateFileSnapshot(extraEntry, pkg.scenarioId, pkg.scenarioVersion), "no contents");

const badHash = validSnapshot();
badHash.manifest["src/join.py"] = "not-a-hash";
throws("W4: non-hex manifest digest rejected", () =>
  validateFileSnapshot(badHash, pkg.scenarioId, pkg.scenarioVersion), "not a SHA-256 hex digest");

const wrongVersion = validSnapshot();
wrongVersion.scenarioVersion = "9.9.9";
throws("W4: wrong scenario version rejected", () =>
  validateFileSnapshot(wrongVersion, pkg.scenarioId, pkg.scenarioVersion), "pinned to");

const wrongScenario = validSnapshot();
wrongScenario.scenarioId = "other";
throws("W4: wrong scenario id rejected", () =>
  validateFileSnapshot(wrongScenario, pkg.scenarioId, pkg.scenarioVersion), "is for scenario");

const empty = validSnapshot();
empty.files = {}; empty.manifest = {};
throws("W4: empty snapshot rejected", () =>
  validateFileSnapshot(empty, pkg.scenarioId, pkg.scenarioVersion), "no files");

const tooMany: FileSnapshotInput = { scenarioId: "s", scenarioVersion: "1", files: {}, manifest: {} };
for (let i = 0; i < 501; i++) { tooMany.files[`f${i}.txt`] = "x"; tooMany.manifest[`f${i}.txt`] = sha256("x"); }
throws("W4: >500 files rejected", () => validateFileSnapshot(tooMany, "s", "1"), "max 500");

const tooBigFile: FileSnapshotInput = {
  scenarioId: "s", scenarioVersion: "1",
  files: { "big.bin": "x".repeat(1024 * 1024 + 1) }, manifest: {},
};
tooBigFile.manifest["big.bin"] = sha256(tooBigFile.files["big.bin"]);
throws("W4: >1MiB file rejected", () => validateFileSnapshot(tooBigFile, "s", "1"), "max 1048576");

check("W4: malformed shape rejected (null)", !isValidFileSnapshotShape(null));
check("W4: malformed shape rejected (missing manifest)", !isValidFileSnapshotShape({ scenarioId: "s", scenarioVersion: "1", files: {} }));
check("W4: valid shape accepted", isValidFileSnapshotShape(validSnapshot()));

// Receipt hash: deterministic, content-sensitive, well-formed.
const manifest = validSnapshot().manifest;
const r1 = computeReceiptHash("sess-1", "project-relay", "2.0.0", manifest);
const r2 = computeReceiptHash("sess-1", "project-relay", "2.0.0", manifest);
check("W4: receipt deterministic", r1 === r2);
check("W4: receipt is 64-hex", /^[0-9a-f]{64}$/.test(r1), r1);
const alteredManifest = { ...manifest, "src/join.py": sha256("changed") };
check("W4: receipt changes when any file changes",
  computeReceiptHash("sess-1", "project-relay", "2.0.0", alteredManifest) !== r1);
check("W4: receipt changes across sessions",
  computeReceiptHash("sess-2", "project-relay", "2.0.0", manifest) !== r1);
check("W4: receipt changes across scenario versions",
  computeReceiptHash("sess-1", "project-relay", "2.0.1", manifest) !== r1);

// Snapshot assembly: single jsonb row carries files + server receipt.
const snap = validSnapshot();
const assembled = buildSubmissionSnapshot({
  deliverable: { q1: "a" },
  notes: "n",
  workspace: {},
  completedTaskIds: ["t1"],
  messageCount: 3,
  submittedRevision: 7,
  fileSnapshot: { scenarioId: snap.scenarioId, scenarioVersion: snap.scenarioVersion, files: snap.files, manifest: snap.manifest },
  receiptHash: r1,
});
check("W4: assembled snapshot carries fileSnapshot", (assembled.fileSnapshot as object) !== undefined);
check("W4: assembled snapshot carries receiptHash", assembled.receiptHash === r1);
check("W4: assembled snapshot keeps deliverable", JSON.stringify(assembled.deliverable) === JSON.stringify({ q1: "a" }));
check("W4: assembled snapshot keeps submittedRevision", assembled.submittedRevision === 7);
check(
  "W4: assembled file set is complete (all files or none by construction)",
  Object.keys((assembled.fileSnapshot as FileSnapshotInput).files).length === Object.keys(pkg.files).length
);

console.log(`\n${count - failures}/${count} checks passed`);
if (failures > 0) process.exit(1);
