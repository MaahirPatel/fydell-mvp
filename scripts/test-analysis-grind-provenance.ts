/**
 * AI-02 / AI-10 / AI-12 / AI-13 tests.
 *
 *  AI-02: input bundle pins every input by hash; omissions and truncations
 *         are tracked explicitly.
 *  AI-10: provenance records evaluator/rubric/prompt/model versions and
 *         input hashes; overrides require editor+change+reason and append
 *         to history; revisions retain superseded versions.
 *  AI-12: QA gate state machine — only a human reviewer moves the gate;
 *         unclear cases stay pending; workload is tracked.
 *  AI-13: only allowlisted, authorized content is selected for model review;
 *         secrets/credentials are never sent; the policy is documented.
 *
 * Run: npx tsx scripts/test-analysis-grind-provenance.ts
 */
import { buildInputBundle } from "../src/lib/analysis/inputBundle";
import {
  EVALUATOR_VERSION,
  newProvenance,
  recordOverride,
  reviseReport,
} from "../src/lib/analysis/provenance";
import { decide, mayShip, openGate, trackWorkload } from "../src/lib/analysis/qaGate";
import {
  getMinimizationPolicyDoc,
  selectAuthorizedContent,
} from "../src/lib/analysis/minimization";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = ""): void {
  if (cond) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/* ------------------------------- AI-02 ------------------------------- */

const bundle = buildInputBundle([
  { path: "starter/merge.py", role: "starter", content: "def merge_events(users, events):\n    return [], []\n" },
  { path: "submission/merge.py", role: "submission", content: "def merge_events(users, events):\n    return [], []\n    # normalized\n" },
  { path: "tests/test_merge.py", role: "test", content: "def test_x():\n    assert True\n" },
  { path: ".env", role: "submission", content: "API_KEY=sk-live-real-secret\n" },
  { path: "node_modules/dep/index.js", role: "surrounding", content: "x" },
  { path: "huge.py", role: "submission", content: "x\n".repeat(100_000) },
]);
check("bundle pins files with sha256", bundle.files.every((f) => /^[0-9a-f]{64}$/.test(f.sha256)));
check("bundle hash is pinned", /^[0-9a-f]{64}$/.test(bundle.bundleHash));
check(
  ".env is omitted with a reason",
  bundle.omitted.some((o) => o.path === ".env" && o.reason.length > 0),
);
check(
  "node_modules is omitted",
  bundle.omitted.some((o) => o.path.includes("node_modules")),
);
check(
  "oversize file is truncated and tracked",
  bundle.truncated.some((t) => t.path === "huge.py" && t.keptBytes < t.totalBytes) &&
    bundle.files.find((f) => f.path === "huge.py")?.truncated === true,
);
check("diff summary counts inputs", /starter files: 1/.test(bundle.diffSummary));

// Deterministic: same inputs -> same bundle hash.
const bundle2 = buildInputBundle([
  { path: "starter/merge.py", role: "starter", content: "def merge_events(users, events):\n    return [], []\n" },
  { path: "submission/merge.py", role: "submission", content: "def merge_events(users, events):\n    return [], []\n    # normalized\n" },
  { path: "tests/test_merge.py", role: "test", content: "def test_x():\n    assert True\n" },
  { path: ".env", role: "submission", content: "API_KEY=sk-live-real-secret\n" },
  { path: "node_modules/dep/index.js", role: "surrounding", content: "x" },
  { path: "huge.py", role: "submission", content: "x\n".repeat(100_000) },
]);
check("bundle hash is deterministic", bundle.bundleHash === bundle2.bundleHash);

/* ------------------------------- AI-10 ------------------------------- */

const prov = newProvenance({
  modelId: "deterministic-only",
  bundleHash: bundle.bundleHash,
  submissionHash: "sha256:sub",
  testSuiteHash: "sha256:suite",
});
check("provenance pins evaluator version", prov.evaluatorVersion === EVALUATOR_VERSION);
check("provenance pins rubric version", prov.rubricVersion === "2026-09-27.1");
check("provenance pins prompt version", prov.promptVersion === "2026-09-27.1");
check("provenance pins input hashes", prov.inputRefs.bundleHash === bundle.bundleHash);
check("provenance starts with no overrides", prov.overrides.length === 0);

const prov2 = recordOverride(prov, "reviewer-7", "Demoted c2 to hypothesis", "No reproducing test found");
check("override is recorded with editor+reason", prov2.overrides.length === 1 && prov2.overrides[0].editor === "reviewer-7");
check("original provenance is unchanged (append-only)", prov.overrides.length === 0);

let overrideThrew = false;
try {
  recordOverride(prov, "", "change", "reason");
} catch {
  overrideThrew = true;
}
check("anonymous override is rejected", overrideThrew);

const v1 = { version: 1, report: { a: 1 }, provenance: prov2 };
const { current, history } = reviseReport(v1, { a: 2 }, "corrected citation");
check("revision bumps the version", current.version === 2);
check("revision retains the superseded version", history.length === 1 && history[0].version === 1);
check("superseded version keeps its overrides", history[0].provenance.overrides.length === 1);
check("supersession is timestamped with a reason", !!history[0].supersededAt && !!history[0].supersededReason);

/* ------------------------------- AI-12 ------------------------------- */

const gate = openGate("rep-1", true);
check("consequential report opens pending", gate.state === "pending" && !mayShip(gate));
const approved = decide(gate, "qa-alice", "approved", "Findings verified against t-118.");
check("human approval ships the report", approved.state === "approved" && mayShip(approved));

let anonThrew = false;
try {
  decide(openGate("rep-2", true), "", "approved");
} catch {
  anonThrew = true;
}
check("anonymous QA decision is rejected", anonThrew);

const flagged = decide(openGate("rep-3", true), "qa-bob", "flagged", "Citation merge.py:99 is out of range.");
check("flagged report does not ship", flagged.state === "flagged" && !mayShip(flagged));

let doubleThrew = false;
try {
  decide(approved, "qa-alice", "flagged");
} catch {
  doubleThrew = true;
}
check("decided gate cannot be silently re-decided", doubleThrew);

const workload = trackWorkload([gate, approved, flagged]);
check(
  "workload tracks states",
  workload.pending === 1 && workload.approved === 1 && workload.flagged === 1,
  JSON.stringify(workload),
);
check("turnaround is tracked for decided gates", workload.turnaroundMs.length === 2);

/* ------------------------------- AI-13 ------------------------------- */

const bundle3 = buildInputBundle([
  { path: "submission/merge.py", role: "submission", content: "def merge_events(u, e):\n    return [], []\n" },
  { path: "tests/test_merge.py", role: "test", content: "def test_x():\n    assert True\n" },
  { path: "transcript.jsonl", role: "transcript", content: "{\"m\":\"hi\"}\n" },
  { path: "config/credentials.yaml", role: "surrounding", content: "token: abc\n" },
]);
const min = selectAuthorizedContent(bundle3);
check(
  "authorized roles are included with justification",
  min.included.length === 3 && min.included.every((f) => f.justification.length > 0),
);
check(
  "credential-looking paths are never sent",
  min.excluded.some((e) => e.path.includes("credentials")) && !min.included.some((f) => f.path.includes("credentials")),
);
const doc = getMinimizationPolicyDoc();
check("minimization policy is documented", /NEVER sent/.test(doc) && /provider/i.test(doc));
check("policy refuses unverified no-training claims", /no claim is made here/i.test(doc));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
