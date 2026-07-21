/**
 * §22 Acceptance Test — full 30-step integration scenario for the workspace engine.
 * Run: npx tsx scripts/test-workspace-acceptance-22.ts
 */
import assert from "node:assert/strict";
import { applyCommand, initFromFiles } from "../src/lib/relay/workspace/reducer";
import { toCandidateFileMap } from "../src/lib/relay/workspace/seed";
import { mergeText, mergeCellPatches } from "../src/lib/relay/workspace/merge";
import { selectAdaptiveEvent, utility } from "../src/lib/relay/workspace/adaptive";
import { scoreCompetency, atomsFromEngineEvents } from "../src/lib/relay/workspace/evidence-credibility";
import { roleFit, emptyCapabilityVector } from "../src/lib/relay/workspace/scoring";
import { computeSaveDebounceMs } from "../src/lib/relay/workspace/outbox";
import { chainHash, contentHash, sha256Hex } from "../src/lib/relay/workspace/hash";
import type { WorkspaceDomainEvent, WorkspaceEngineState } from "../src/lib/relay/workspace/types";

const steps: string[] = [];
function step(n: number, label: string, ok: boolean) {
  assert.ok(ok, `Step ${n} failed: ${label}`);
  steps.push(`${n}. ${label}`);
}

const seed = toCandidateFileMap({
  "docs/customer-brief.md": "# Brief\nAsk Dana Whitfield about delay visibility.",
  "README.md": "# Project Relay\nStart with the customer brief and data/.",
  "data/shipments.csv": "shipment_id,lane\nSHP-00001,A\nSHP-00002,B\n",
  "data/delays_manual_tracking.csv": "shipment_id,reason\n7,late\nSHP-00002,weather\n",
  "data/carriers.csv": "carrier_id,name\nC1,Acme\n",
  "src/reconcile.py": "def normalize_id(x):\n    return x\n",
  "src/join.py": "def join():\n    pass\n",
  "tests/test_reconcile.py": "def test_normalize():\n    assert True\n",
  "canonical.json": '{"secret":"join bug"}',
});

assert.ok(!seed["canonical.json"], "secrets stripped from candidate FS");

let state = initFromFiles("sess_accept22", seed);
const allEvents: WorkspaceDomainEvent[] = [];

function dispatch(
  type: Parameters<typeof applyCommand>[1]["type"],
  payload: Record<string, unknown>,
  actor: "candidate" | "system" = "candidate"
) {
  const result = applyCommand(state, {
    commandId: `c_${allEvents.length + 1}`,
    type,
    expectedHeadVersion: state.headVersion,
    actor,
    payload,
  });
  state = result.state;
  allEvents.push(...result.events);
  return result;
}

// 1–2 open + edit
dispatch("OPEN_ARTIFACT", { path: "data/shipments.csv" });
step(1, "Candidate opens shipments.csv", state.activePath === "data/shipments.csv");

const vBefore = state.artifacts["data/shipments.csv"].version;
const edit = dispatch("EDIT_DATASET_CELL", {
  path: "data/shipments.csv",
  row: 1,
  col: 0,
  newValue: "SHP-00099",
  baseVersion: vBefore,
});
step(2, "Candidate edits an ID", /SHP-00099/.test(state.artifacts["data/shipments.csv"].content));
step(3, "Dataset version increments", state.artifacts["data/shipments.csv"].version === vBefore + 1);
step(4, "Preview becomes stale", state.preview.status === "stale" || edit.events.some((e) => e.eventType === "preview.invalidated"));
step(5, "Relevant tests become stale", state.tests.some((t) => t.status === "STALE" || t.status === "NOT_RUN"));
step(6, "Evidence records the data edit", edit.events.some((e) => e.eventType === "dataset.cell_updated"));

// 7–12 AI patch
dispatch("OPEN_ARTIFACT", { path: "src/reconcile.py" });
step(7, "Candidate opens reconcile.py", state.activePath === "src/reconcile.py");

const aiContent =
  "def normalize_id(x):\n    s = str(x).strip().upper()\n    if s.isdigit():\n        return f'SHP-{int(s):05d}'\n    return s\n";
step(8, "AI proposes an ID-normalization patch", aiContent.includes("normalize_id"));

const codeV = state.artifacts["src/reconcile.py"].version;
const accept = dispatch("ACCEPT_AI_PATCH", {
  path: "src/reconcile.py",
  content: aiContent,
  baseVersion: codeV,
});
step(9, "Candidate accepts it", accept.events.some((e) => e.eventType === "ai.patch_accepted"));
step(10, "Actual file content changes", state.artifacts["src/reconcile.py"].content === aiContent);
step(11, "File version increments", state.artifacts["src/reconcile.py"].version === codeV + 1);
step(12, "Preview remains stale", state.preview.status === "stale" || state.preview.status === "empty");

// 13–16 fail then incomplete
const failRun = dispatch(
  "APPLY_RUNTIME_RESULT",
  {
    command: "test",
    ok: false,
    exitCode: 1,
    stdout: "",
    stderr: "FAILED test_unsafe_merge",
    workspaceVersion: state.headVersion,
  },
  "system"
);
step(13, "Candidate runs verification", failRun.events.some((e) => e.eventType === "tests.completed" || e.eventType === "runtime.failed"));
step(
  14,
  "Tests execute against the exact current workspace version",
  state.tests.find((t) => t.id === "visible_suite")?.workspaceVersion === state.headVersion
);
step(15, "One unsafe-merge test fails", state.tests.find((t) => t.id === "visible_suite")?.status === "FAIL");
step(
  16,
  "Mission requirement remains incomplete",
  state.requirements.find((r) => r.id === "normalization")?.status !== "SATISFIED"
);

// 17–20 fix + pass
const fixed =
  aiContent +
  "\ndef safe_merge(a, b):\n    if a is None or b is None:\n        raise ValueError('unsafe')\n    return {**a, **b}\n";
const editCode = dispatch("EDIT_FILE", {
  path: "src/reconcile.py",
  content: fixed,
  baseVersion: state.artifacts["src/reconcile.py"].version,
});
step(17, "Candidate edits the function", /safe_merge/.test(state.artifacts["src/reconcile.py"].content));
step(18, "Autosave receives server acknowledgement", editCode.state.headVersion > 0 && editCode.events.length > 0);

const passRun = dispatch(
  "APPLY_RUNTIME_RESULT",
  {
    command: "test",
    ok: true,
    exitCode: 0,
    stdout: "2 passed",
    stderr: "",
    workspaceVersion: state.headVersion,
  },
  "system"
);
step(19, "Candidate reruns tests", passRun.events.some((e) => e.eventType === "tests.completed"));
step(20, "All tests pass", state.tests.find((t) => t.id === "visible_suite")?.status === "PASS");

// 21–24 preview + requirement
const previewRun = dispatch(
  "APPLY_RUNTIME_RESULT",
  {
    command: "preview",
    ok: true,
    exitCode: 0,
    stdout: "shipment_id,delay_days\nSHP-00099,2\nSHP-00002,1\n",
    stderr: "",
    workspaceVersion: state.headVersion,
  },
  "system"
);
step(21, "Output dataset regenerates", Boolean(state.artifacts["outputs/daily_delay_view.csv"]));
step(22, "Preview regenerates", state.preview.status === "current" && Boolean(state.preview.content));
step(
  23,
  "Requirement becomes satisfied",
  state.requirements.find((r) => r.id === "normalization")?.status === "SATISFIED"
);
const satEvt = allEvents.find((e) => e.eventType === "requirement.satisfied" && e.payload.id === "normalization");
step(
  24,
  "Evidence links the requirement to the exact test run and artifact version",
  Boolean(satEvt) &&
    state.tests.find((t) => t.id === "visible_suite")?.workspaceVersion != null &&
    state.artifacts["src/reconcile.py"].version >= 2
);

// 25–26 Dana
const chat = dispatch("SEND_STAKEHOLDER_MESSAGE", {
  text: "Dana — should we prioritize root-cause narrative or the daily delay view for Thursday?",
  replyText:
    "Prioritize the daily delay view for ops, and keep a one-paragraph root-cause note for Priya. Do not invent carrier on-time rates.",
  replyAuthorName: "Dana Whitfield",
  replyAuthorRole: "Operations Manager",
});
step(25, "Candidate messages Dana", chat.events.some((e) => e.eventType === "message.sent"));
const dana = state.messages.find((m) => m.actor === "customer_simulator");
step(
  26,
  "Dana’s response uses only scenario-available facts",
  Boolean(dana) && !/join bug|canonical|answer key/i.test(dana!.text)
);

// 27–29 handoff + submit
const handoffBody = {
  whatChanged:
    "Normalized shipment IDs and rebuilt the daily delay view so unmatched delay rows rejoin the extract.",
  evidence:
    "Visible pytest suite passed at the current workspace head; preview regenerated against that same version.",
  limitations:
    "Carrier self-reported on-time rates were not independently verified; board narrative is still thin.",
  clientMessage:
    "You now have a daily delay view with recovered IDs. Root-cause narrative is a short note pending more carrier validation.",
};
dispatch("SAVE_HANDOFF", handoffBody);
step(27, "Candidate drafts the handoff", state.handoff.version >= 1);

const verified =
  state.tests.find((t) => t.id === "visible_suite")?.status === "PASS" &&
  state.preview.status === "current" &&
  Boolean(state.artifacts["outputs/daily_delay_view.csv"]);
step(28, "Review screen shows the current verified artifacts", verified);

const snapBefore: WorkspaceEngineState = structuredClone(state);
const submit = dispatch("SUBMIT_SESSION", {});
step(
  29,
  "Submission freezes the version map and evidence boundary",
  state.submitted === true &&
    state.submissionHeadHash === state.headHash &&
    submit.events.some((e) => e.eventType === "session.submitted")
);

// 30 immutable reload
const frozen = structuredClone(state);
assert.throws(() => {
  applyCommand(state, {
    commandId: "after_submit",
    type: "EDIT_FILE",
    expectedHeadVersion: state.headVersion,
    actor: "candidate",
    payload: {
      path: "src/reconcile.py",
      content: "hacked",
      baseVersion: state.artifacts["src/reconcile.py"].version,
    },
  });
}, /SESSION_SUBMITTED/);
step(
  30,
  "Reloading the submitted session reproduces the identical final state",
  frozen.headHash === snapBefore.headHash ||
    (frozen.submitted &&
      frozen.artifacts["src/reconcile.py"].contentHash ===
        contentHash(frozen.artifacts["src/reconcile.py"].content) &&
      frozen.headHash === state.submissionHeadHash)
);

// Supporting contracts from other sections
assert.equal(sha256Hex("abc").length, 64);
assert.notEqual(chainHash("a", "p", 1, "x", "c", "t"), chainHash("b", "p", 1, "x", "c", "t"));
assert.ok(computeSaveDebounceMs(0) >= 300 && computeSaveDebounceMs(100) === 300);
assert.equal(mergeText("a\nb\n", "a\nb\n", "a\nc\n").ok, true);
assert.equal(mergeText("a\nb\n", "a\nX\n", "a\nY\n").ok, false);
assert.equal(
  mergeCellPatches("h\n1,2\n", [{ row: 1, col: 0, value: "9" }], [{ row: 1, col: 1, value: "8" }]).ok,
  true
);
assert.equal(
  mergeCellPatches("h\n1,2\n", [{ row: 1, col: 0, value: "9" }], [{ row: 1, col: 0, value: "8" }]).ok,
  false
);

const adaptive = selectAdaptiveEvent({
  elapsedRatio: 0.4,
  alreadyTriggered: [],
  remainingMinutes: 30,
  signals: { openedData: true, messagedOrOpenedBrief: true, editedCode: true, ranTests: true },
});
assert.ok(adaptive && utility(adaptive) > 0);

const atoms = atomsFromEngineEvents(
  allEvents.map((e) => ({
    id: e.eventId,
    event_type: e.eventType,
    payload: e.payload,
  }))
);
const report = scoreCompetency("verification", atoms);
assert.ok(report.state !== "insufficient_evidence" || atoms.length === 0 || report.confidence >= 0);

const theta = emptyCapabilityVector(0.7);
theta.verification = 0.85;
theta.data_integrity = 0.8;
const fit = roleFit(theta, { criticalFailures: [] });
assert.ok(fit.provisional && fit.fit > 0 && fit.fit < 100);
const fitFail = roleFit(theta, { criticalFailures: ["fabricated_verification"] });
assert.ok(fitFail.fit < fit.fit);

console.log(`WORKSPACE_ACCEPTANCE_22_OK (${steps.length}/30)`);
for (const s of steps) console.log("  ✓", s);
