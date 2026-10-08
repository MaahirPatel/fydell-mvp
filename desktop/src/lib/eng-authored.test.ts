import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  authoredHandoffBlockers,
  authoredStage,
  environmentCheckState,
  evaluationNote,
  newClientMsgId,
  outcomeLabel,
  publicRunWaitSeconds,
  runHeadline,
  runTally,
  type PublicRun,
} from "./eng-authored.js";

function run(over: Partial<PublicRun> = {}): PublicRun {
  return {
    id: "r1",
    purpose: "workspace",
    status: "ran",
    filesSha256: "x",
    runnerLabel: "Local development runner",
    isolated: false,
    command: "pytest",
    exitCode: 1,
    durationMs: 1200,
    tests: [],
    output: "",
    detail: null,
    createdAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}

function attempt(status: string, consentedAt: string | null = null) {
  return { attempt: { status, consentedAt } } as Parameters<typeof authoredStage>[0];
}

describe("authoredStage", () => {
  it("follows the server status and consent", () => {
    assert.equal(authoredStage(attempt("accepted")), "consent");
    assert.equal(authoredStage(attempt("accepted", "2026-01-01T00:00:00Z")), "setup");
    assert.equal(authoredStage(attempt("preflight_passed", "2026-01-01T00:00:00Z")), "ready");
    assert.equal(authoredStage(attempt("in_progress", "2026-01-01T00:00:00Z")), "working");
    assert.equal(authoredStage(attempt("submitted")), "submitted");
    assert.equal(authoredStage(attempt("withdrawn")), "withdrawn");
    assert.equal(authoredStage(attempt("expired")), "expired");
  });
});

describe("runHeadline", () => {
  it("reports only what the runner returned", () => {
    const r = run({ tests: [{ name: "a", outcome: "passed" }, { name: "b", outcome: "failed" }, { name: "c", outcome: "missing" }] });
    assert.deepEqual(runTally(r), { passed: 1, total: 3 });
    assert.equal(runHeadline(r), "1 of 3 public tests passed");
    assert.equal(runHeadline(run()), "The runner finished but reported no tests.");
  });

  it("never blames the candidate for platform failures", () => {
    assert.match(runHeadline(run({ status: "runner_unavailable" })), /platform problem/);
    assert.match(runHeadline(run({ status: "infrastructure_error" })), /platform problem/);
    assert.match(runHeadline(run({ status: "timeout" })), /time limit/);
  });
});

describe("environmentCheckState", () => {
  it("only counts environment check runs", () => {
    assert.equal(environmentCheckState(null), "none");
    assert.equal(environmentCheckState(run({ purpose: "workspace" })), "none");
    assert.equal(environmentCheckState(run({ purpose: "environment_check" })), "ran");
    assert.equal(environmentCheckState(run({ purpose: "environment_check", status: "runner_unavailable" })), "unavailable");
    assert.equal(environmentCheckState(run({ purpose: "environment_check", status: "timeout" })), "failed");
  });
});

describe("publicRunWaitSeconds", () => {
  const started = "2026-01-01T00:00:00Z";
  const t0 = Date.parse(started);
  it("counts down from the last run on the server clock", () => {
    assert.equal(publicRunWaitSeconds(started, 20, t0), 20);
    assert.equal(publicRunWaitSeconds(started, 20, t0 + 19_100), 1);
    assert.equal(publicRunWaitSeconds(started, 20, t0 + 20_000), 0);
    assert.equal(publicRunWaitSeconds(started, 20, t0 + 60_000), 0);
  });
  it("does not block when there is no usable last run", () => {
    assert.equal(publicRunWaitSeconds(null, 20, t0), 0);
    assert.equal(publicRunWaitSeconds("not a date", 20, t0), 0);
  });
});

describe("authoredHandoffBlockers", () => {
  const prompts = [
    { id: "what", label: "What changed" },
    { id: "risk", label: "Risks" },
  ];
  it("needs one answer when prompts exist", () => {
    assert.deepEqual(authoredHandoffBlockers(prompts, {}, ""), ["Answer at least one handoff question."]);
    assert.deepEqual(authoredHandoffBlockers(prompts, { risk: "none" }, ""), []);
    assert.deepEqual(authoredHandoffBlockers([], {}, ""), []);
  });
  it("enforces the server's length limits", () => {
    const out = authoredHandoffBlockers(prompts, { what: "x".repeat(8001) }, "y".repeat(4001));
    assert.equal(out.length, 2);
  });
});

describe("labels", () => {
  it("maps outcomes and evaluation states", () => {
    assert.equal(outcomeLabel("missing"), "Did not run");
    assert.equal(outcomeLabel("weird"), "weird");
    assert.match(evaluationNote("delayed"), /never counted against you/);
    assert.equal(evaluationNote("unknown"), "Not submitted yet.");
  });
  it("makes client message ids the server accepts", () => {
    const id = newClientMsgId(() => 0.5);
    assert.equal(id.length, 24);
    assert.match(id, /^d[0-9a-z]+$/);
  });
});
