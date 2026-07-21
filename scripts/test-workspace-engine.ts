/**
 * Vertical slice: edit → stale → run → requirement satisfaction.
 */
import assert from "node:assert/strict";
import { applyCommand, initFromFiles } from "../src/lib/relay/workspace/reducer";
import { toCandidateFileMap, candidateVisibleFacts } from "../src/lib/relay/workspace/seed";

const seed = toCandidateFileMap({
  "docs/customer-brief.md": "# Brief\nAsk Dana.",
  "data/shipments.csv": "shipment_id,lane\nSHP-00001,A\n",
  "data/delays_manual_tracking.csv": "shipment_id,reason\nSHP-7,late\n",
  "src/reconcile.py": "def normalize():\n    return 1\n",
  "canonical.json": '{"canonicalFacts":["secret join bug"]}',
  "docs/data-integrity.md": "SPOILER answer key",
});

assert.ok(!seed["canonical.json"], "evaluator canonical.json must not reach candidate FS");
assert.ok(!seed["docs/data-integrity.md"] || !/SPOILER/.test(seed["docs/data-integrity.md"] || ""), "spoiler doc stripped or sanitized");

let state = initFromFiles("sess_test", seed);
assert.equal(state.headVersion, 1);
assert.ok(state.activePath);

const open = applyCommand(state, {
  commandId: "c1",
  type: "OPEN_ARTIFACT",
  expectedHeadVersion: state.headVersion,
  actor: "candidate",
  payload: { path: "data/shipments.csv" },
});
state = open.state;

const edit = applyCommand(state, {
  commandId: "c2",
  type: "EDIT_DATASET_CELL",
  expectedHeadVersion: state.headVersion,
  actor: "candidate",
  payload: { path: "data/shipments.csv", row: 1, col: 0, newValue: "SHP-00099", baseVersion: 1 },
});
state = edit.state;
assert.ok(state.headVersion > 1);
assert.equal(state.preview.status === "stale" || state.tests.some((t) => t.status === "STALE" || t.status === "NOT_RUN"), true);
assert.ok(edit.events.some((e) => e.eventType === "dataset.cell_updated"));
assert.ok(edit.events.some((e) => e.eventType === "preview.invalidated"));

const codeEdit = applyCommand(state, {
  commandId: "c3",
  type: "EDIT_FILE",
  expectedHeadVersion: state.headVersion,
  actor: "candidate",
  payload: {
    path: "src/reconcile.py",
    content: "def normalize():\n    return 2\n",
    baseVersion: state.artifacts["src/reconcile.py"].version,
  },
});
state = codeEdit.state;

const run = applyCommand(state, {
  commandId: "c4",
  type: "APPLY_RUNTIME_RESULT",
  expectedHeadVersion: state.headVersion,
  actor: "system",
  payload: {
    command: "test",
    ok: true,
    exitCode: 0,
    stdout: "ok",
    stderr: "",
    workspaceVersion: state.headVersion,
  },
});
state = run.state;
assert.equal(state.tests.find((t) => t.id === "visible_suite")?.status, "PASS");
assert.equal(state.requirements.find((r) => r.id === "normalization")?.status, "SATISFIED");

const facts = candidateVisibleFacts(
  ["The ops manager (Dana Whitfield) wants a dashboard", "naive exact-match join will silently drop"],
  ["Dana Whitfield needs a daily view."]
);
assert.deepEqual(facts, ["Dana Whitfield needs a daily view."]);
assert.ok(!facts.some((f) => /silently drop/i.test(f)));

console.log("WORKSPACE_ENGINE_OK");
