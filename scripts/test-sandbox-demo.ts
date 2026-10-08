/**
 * Unit tests for the public sandbox demo's pure logic: the in-browser test
 * harness (CommonJS and Node ESM), the catalog contract, the event inbox
 * scenario, report derivation, the line diff, per-scenario state with
 * migration from versions 1 and 2, and the team client helpers.
 *
 * Run: npx tsx scripts/test-sandbox-demo.ts
 */
import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { HARNESS_SOURCE, completeResults, parseHarnessOutput, parseWorkerMessage } from "../src/lib/sandbox-demo/harness";
import { buildPayload, testsForScope, toRunRecord } from "../src/lib/sandbox-demo/payload";
import { DEMO_CATALOG, RESERVED_KEYS, catalogByTrack, catalogProblems, demoScenario, playableScenarios, referenceSolution } from "../src/lib/sandbox-demo/catalog";
import type { DemoScenario } from "../src/lib/sandbox-demo/catalog-types";
import { runtimeFor, scenarioProblems, testId } from "../src/lib/sandbox-demo/runtime";
import { SOLUTIONS, type SolutionId } from "../src/lib/sandbox-demo/scenario";
import { deriveReport, deriveState, validationChecks, writtenEvidence, type SupportingTest } from "../src/lib/sandbox-demo/report";
import { changedRanges, diffFile, diffLines, toHunks } from "../src/lib/sandbox-demo/diff";
import { candidateFinding, defaultFollowUp, reviewerObservation } from "../src/lib/sandbox-demo/review";
import {
  LEGACY_STORAGE_KEYS,
  STORAGE_KEY,
  emptyHandoff,
  initialProgress,
  initialState,
  loadState,
  parseState,
  progressOf,
  progressStatus,
  resetState,
  saveState,
  withProgress,
  withoutProgress,
  type KeyValueStorage,
  type TeamMessage,
} from "../src/lib/sandbox-demo/state";
import { dueCheckin } from "../src/lib/sandbox-demo/team";
import {
  appendReply,
  buildWorkspace,
  checkinInput,
  checkinSenderId,
  interpretTeamCall,
  parseTeamResponse,
  summarizeRun,
  toHistory,
  workspaceChanges,
} from "../src/lib/sandbox-demo/team-client";
import type { HarnessPayload, RunOutcome, TestResult } from "../src/lib/sandbox-demo/types";

type HarnessFn = (payload: HarnessPayload) => Promise<unknown>;
const runHarness = new Function(`${HARNESS_SOURCE}\nreturn runHarness;`)() as HarnessFn;

let passed = 0;
const failures: string[] = [];
async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (error) {
    failures.push(name);
    console.log(`  FAIL ${name}\n       ${error instanceof Error ? error.message.split("\n").join("\n       ") : String(error)}`);
  }
}

async function runInProcess(payload: HarnessPayload): Promise<RunOutcome> {
  const raw = await runHarness(payload);
  const output = parseHarnessOutput(raw);
  if (!output) throw new Error("harness output did not parse");
  return { kind: "completed", output };
}

async function runFiles(files: Record<string, string>, testFiles: string[]) {
  const outcome = await runInProcess({ files, testFiles });
  if (outcome.kind !== "completed") throw new Error("did not complete");
  return outcome.output;
}

function byName(tests: { name: string; status: string; message: string | null }[]) {
  return Object.fromEntries(tests.map((t) => [t.name, t]));
}

/** Mirrors the browser runner with a Node worker thread, including the terminate-on-timeout path. */
function runInNodeWorker(payload: HarnessPayload, timeoutMs: number): Promise<RunOutcome> {
  const source = `${HARNESS_SOURCE}
const { parentPort } = require("node:worker_threads");
parentPort.on("message", (data) => {
  runHarness(data).then(
    (output) => parentPort.postMessage({ ok: true, output }),
    (error) => parentPort.postMessage({ ok: false, message: String(error && error.message || error) }),
  );
});`;
  const worker = new Worker(source, { eval: true });
  return new Promise((resolve) => {
    let settled = false;
    const finish = (outcome: RunOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void worker.terminate();
      resolve(outcome);
    };
    const timer = setTimeout(() => finish({ kind: "timeout", timeoutMs }), timeoutMs);
    worker.on("message", (data: unknown) => finish(parseWorkerMessage(data)));
    worker.on("error", (error: Error) => finish({ kind: "error", message: error.message }));
    worker.postMessage(payload);
  });
}

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

function inbox(): DemoScenario {
  const s = demoScenario("event-inbox");
  if (!s) throw new Error("event-inbox missing from the catalog");
  return s;
}

const PUB = "test/inbox.test.js";
const PROT = "test/inbox.protected.test.js";
const ids = {
  processesOnce: testId(PUB, "processes a new event once"),
  retries: testId(PUB, "retries an event after a temporary handler failure"),
  redeliveryAfterFailure: testId(PROT, "processes a later redelivery of an event that failed every attempt"),
};

const statusOf = (results: TestResult[], id: string) => results.find((r) => r.id === id)?.status;

async function main() {
  const scenario = inbox();
  const rt = runtimeFor(scenario);

  console.log("Harness, CommonJS");

  await check("runs tests and reports pass and fail with Node style messages", async () => {
    const out = await runFiles(
      {
        "src/add.js": "module.exports = { add: (a, b) => a + b };",
        "test/add.test.js": `const { add } = require("../src/add.js");
test("adds", () => { assert.equal(add(2, 3), 5); });
test("deep", () => { assert.deepEqual({ a: [1, 2] }, { a: [1, 2] }); });
test("fails", () => { assert.strictEqual(add(2, 2), 5); });
test("async fails", async () => { await Promise.resolve(); assert.ok(false, "nope"); });`,
      },
      ["test/add.test.js"],
    );
    const t = byName(out.tests);
    assert.equal(t.adds.status, "pass");
    assert.equal(t.deep.status, "pass");
    assert.equal(t.fails.status, "fail");
    assert.match(t.fails.message ?? "", /Expected values to be strictly equal:\n\n4 !== 5/);
    assert.equal(t["async fails"].status, "fail");
    assert.match(t["async fails"].message ?? "", /nope/);
  });

  await check("captures console output and refuses modules outside the task", async () => {
    const out = await runFiles(
      {
        "test/x.test.js": `console.log("hello", { n: 1 });
test("no packages", () => { assert.throws(() => require("fs")); });
test("network is shadowed", () => { assert.equal(typeof fetch, "undefined"); });`,
      },
      ["test/x.test.js"],
    );
    assert.equal(out.logs.length, 1);
    assert.match(out.logs[0], /^hello \{ ?n: 1 ?\}$/);
    assert.ok(out.tests.every((t) => t.status === "pass"), JSON.stringify(out.tests));
  });

  await check("node:test and node:assert work from require", async () => {
    const out = await runFiles(
      {
        "test/r.test.js": `const test = require("node:test");
const assert = require("node:assert/strict");
test("strict", () => { assert.equal(1, 1); assert.throws(() => assert.equal(1, "1")); });`,
      },
      ["test/r.test.js"],
    );
    assert.equal(out.tests[0]?.status, "pass", out.tests[0]?.message ?? "");
  });

  console.log("Harness, ESM");

  await check("named, default and namespace imports with export function, const, class and default", async () => {
    const out = await runFiles(
      {
        "src/math.js": `export function add(a, b) { return a + b; }
export const TWO = 2;
export class Box { constructor(v) { this.v = v; } }
export default function double(n) { return n * TWO; }`,
        "src/index.js": `export { add as plus } from "./math.js";
export * from "./math.js";`,
        "test/m.test.js": `import test from "node:test";
import assert from "node:assert/strict";
import double, { add, TWO, Box } from "../src/math.js";
import * as math from "../src/math.js";
import { plus } from "../src/index.js";
test("imports", () => {
  assert.equal(add(1, 2), 3);
  assert.equal(TWO, 2);
  assert.equal(new Box(4).v, 4);
  assert.equal(double(5), 10);
  assert.equal(math.add(2, 2), 4);
  assert.equal(plus(3, 3), 6);
});`,
      },
      ["test/m.test.js"],
    );
    assert.equal(out.fileErrors.length, 0, JSON.stringify(out.fileErrors));
    assert.equal(out.tests[0]?.status, "pass", out.tests[0]?.message ?? "");
  });

  await check("ESM can import CommonJS and CommonJS can require ESM", async () => {
    const out = await runFiles(
      {
        "src/legacy.js": "module.exports = { greet: (n) => `hi ${n}` }; module.exports.default = 'unused';",
        "src/modern.js": "export const shout = (s) => s.toUpperCase();",
        "src/bridge.js": "const { shout } = require('./modern.js'); module.exports = { loud: (s) => shout(s) };",
        "test/i.test.js": `import test from "node:test";
import assert from "node:assert/strict";
import { greet } from "../src/legacy.js";
import { loud } from "../src/bridge.js";
test("interop", () => { assert.equal(greet("a"), "hi a"); assert.equal(loud("x"), "X"); });`,
      },
      ["test/i.test.js"],
    );
    assert.equal(out.tests[0]?.status, "pass", out.tests[0]?.message ?? JSON.stringify(out.fileErrors));
  });

  await check("assert methods: ok, equal, notEqual, deepStrictEqual, throws, rejects, match", async () => {
    const out = await runFiles(
      {
        "test/a.test.js": `import test from "node:test";
import assert from "node:assert/strict";
test("all pass", async () => {
  assert.ok(1);
  assert.equal("a", "a");
  assert.strictEqual(2, 2);
  assert.notEqual(1, 2);
  assert.deepEqual({ a: [1] }, { a: [1] });
  assert.deepStrictEqual(new Map([[1, { b: 2 }]]), new Map([[1, { b: 2 }]]));
  assert.throws(() => { throw new TypeError("bad input"); }, TypeError);
  assert.throws(() => { throw new Error("bad input"); }, /bad/);
  assert.throws(() => { throw new Error("bad input"); }, { message: "bad input" });
  await assert.rejects(async () => { throw new Error("later"); }, /later/);
  await assert.rejects(Promise.reject(new RangeError("r")), RangeError);
  assert.match("event-42", /\\d+$/);
});
test("deep fails", () => { assert.deepStrictEqual({ a: 1 }, { a: "1" }); });
test("throws fails", () => { assert.throws(() => {}); });
test("rejects fails", async () => { await assert.rejects(async () => 1); });
test("match fails", () => { assert.match("abc", /\\d/); });`,
      },
      ["test/a.test.js"],
    );
    const t = byName(out.tests);
    assert.equal(t["all pass"].status, "pass", t["all pass"].message ?? "");
    assert.match(t["deep fails"].message ?? "", /strictly deep-equal/);
    assert.match(t["throws fails"].message ?? "", /Missing expected exception/);
    assert.match(t["rejects fails"].message ?? "", /Missing expected rejection/);
    assert.equal(t["match fails"].status, "fail");
  });

  await check("async tests, hooks, describe and the done callback", async () => {
    const out = await runFiles(
      {
        "test/h.test.js": `import { test, describe, beforeEach, afterEach, it } from "node:test";
import assert from "node:assert/strict";
const calls = [];
beforeEach(() => calls.push("before"));
afterEach(() => calls.push("after"));
describe("group", () => {
  it("waits", async () => { await new Promise((r) => setTimeout(r, 5)); calls.push("test"); });
  it("callback", (t, done) => { setTimeout(() => { calls.push("done"); done(); }, 1); });
});
test("hooks ran around each test", () => { assert.deepEqual(calls.slice(0, 6), ["before", "test", "after", "before", "done", "after"]); });`,
      },
      ["test/h.test.js"],
    );
    for (const t of out.tests) assert.equal(t.status, "pass", `${t.name}: ${t.message}`);
    assert.equal(out.tests.length, 3);
  });

  await check("a missing named export fails the file with Node's message", async () => {
    const out = await runFiles(
      {
        "src/m.js": "export const a = 1;",
        "test/e.test.js": `import test from "node:test";
import { b } from "../src/m.js";
test("never runs", () => {});`,
      },
      ["test/e.test.js"],
    );
    assert.match(out.fileErrors[0]?.message ?? "", /does not provide an export named "b"/);
  });

  await check("line numbers survive the ESM transform", async () => {
    const out = await runFiles(
      {
        "test/l.test.js": `import test from "node:test";
import assert from "node:assert/strict";

test("line", () => {
  throw new Error("at line five");
});`,
      },
      ["test/l.test.js"],
    );
    assert.equal(out.tests[0]?.status, "fail");
    assert.match(out.tests[0]?.message ?? "", /at line five/);
  });

  console.log("Harness, runner");

  await check("a syntax error in a source file fails every test in the file with the reason", async () => {
    const files = { ...SOLUTIONS.reference.files, "src/inbox.js": "function createInbox( {" };
    const outcome = await runInProcess(buildPayload(scenario, files, "public"));
    const results = completeResults(testsForScope(scenario, "public"), outcome);
    assert.equal(results.length, 4);
    assert.ok(results.every((r) => r.status === "fail"));
    assert.match(results[0].message ?? "", /Could not load the test file: .*src\/inbox\.js: SyntaxError/);
  });

  await check("a worker running an infinite loop is terminated at the timeout", async () => {
    const files = { ...SOLUTIONS.reference.files, "src/inbox.js": "while (true) {}" };
    const started = Date.now();
    const outcome = await runInNodeWorker(buildPayload(scenario, files, "public"), 1000);
    assert.equal(outcome.kind, "timeout");
    assert.ok(Date.now() - started < 3000, "terminated promptly");
    const record = toRunRecord(scenario, "public", outcome, new Date().toISOString(), 1000);
    assert.equal(record.outcome, "timeout");
    assert.ok(record.results.every((r) => r.status === "fail"));
  });

  await check("the Node worker path returns the same results as in-process", async () => {
    const outcome = await runInNodeWorker(buildPayload(scenario, SOLUTIONS.reference.files, "all"), 5000);
    const results = completeResults(rt.tests, outcome);
    assert.ok(results.every((r) => r.status === "pass"), JSON.stringify(results.filter((r) => r.status !== "pass")));
  });

  await check("worker messages are narrowed", () => {
    assert.equal(parseWorkerMessage("junk").kind, "error");
    assert.equal(parseWorkerMessage({ ok: true, output: { tests: [{}] } }).kind, "error");
    assert.deepEqual(parseWorkerMessage({ ok: false, message: "boom" }), { kind: "error", message: "boom" });
  });

  await check("the payload never takes test files from the editor", () => {
    const payload = buildPayload(scenario, { [PUB]: "tampered", "src/inbox.js": "// mine" }, "public");
    assert.equal(payload.files[PUB], rt.starterFiles[PUB]);
    assert.equal(payload.files["src/inbox.js"], "// mine");
    assert.equal(payload.files[PROT], undefined);
    assert.deepEqual(payload.testFiles, [PUB]);
    const all = buildPayload(scenario, {}, "all");
    assert.ok(all.testFiles.includes(PROT) && typeof all.files[PROT] === "string");
  });

  console.log("Catalog");

  await check("every catalog entry is sound", () => {
    assert.deepEqual(catalogProblems(), []);
    for (const s of playableScenarios()) assert.deepEqual(scenarioProblems(s), [], s.key);
  });
  await check("keys are unique and avoid reserved paths", () => {
    const keys = DEMO_CATALOG.map((e) => (e.status === "playable" ? e.scenario.key : e.key));
    assert.equal(new Set(keys).size, keys.length);
    for (const k of keys) assert.equal(RESERVED_KEYS.includes(k), false, k);
  });
  await check("event inbox is the first entry, in Backend & API", () => {
    const first = DEMO_CATALOG[0];
    assert.equal(first.status, "playable");
    assert.equal(scenario.trackId, "backend_api");
    assert.equal(scenario.trackLabel, "Backend & API");
    assert.equal(scenario.taskFamilyLabel, "Reliability debugging");
    assert.equal(catalogByTrack()[0]?.trackId, "backend_api");
    assert.equal(demoScenario("nope"), null);
  });
  await check("scenario problems catch broken contracts", () => {
    const broken: DemoScenario = {
      ...scenario,
      key: "Bad Key",
      tests: [...scenario.tests, { ...scenario.tests[0], criterionIds: ["R99"] }],
      teammates: [...scenario.teammates, { ...scenario.teammates[0], id: "you" }],
    };
    const problems = scenarioProblems(broken).join("\n");
    assert.match(problems, /key/);
    assert.match(problems, /duplicate test/);
    assert.match(problems, /unknown criterion R99/);
    assert.match(problems, /teammate id you/);
  });
  await check("reference solutions only cover editable files", () => {
    const ref = referenceSolution("event-inbox");
    assert.ok(ref);
    for (const path of Object.keys(ref ?? {})) assert.ok(rt.editablePaths.includes(path), path);
    assert.equal(referenceSolution("nope"), null);
  });

  console.log("Event inbox scenario");
  const runSolution = async (id: SolutionId): Promise<TestResult[]> =>
    completeResults(testsForScope(scenario, "all"), await runInProcess(buildPayload(scenario, SOLUTIONS[id].files, "all")));
  const starter = await runSolution("starter");
  const reference = await runSolution("reference");
  const incorrect = await runSolution("incorrect");

  await check("starter fails the retry tests and passes the contract tests", () => {
    assert.equal(statusOf(starter, ids.retries), "fail");
    assert.equal(statusOf(starter, ids.processesOnce), "pass");
  });
  await check("reference solution passes every test", () => {
    for (const t of rt.tests) assert.equal(statusOf(reference, t.id), "pass", t.name);
  });
  await check("incorrect solution passes public tests and is caught by a protected test", () => {
    for (const t of rt.publicTests) assert.equal(statusOf(incorrect, t.id), "pass", t.name);
    assert.equal(statusOf(incorrect, ids.redeliveryAfterFailure), "fail");
  });
  await check("validation checks pass on real runs, and fail when the starter has nothing to fix", () => {
    for (const c of validationChecks(scenario, starter, reference)) assert.ok(c.passed, `${c.label}: ${c.detail}`);
    assert.equal(validationChecks(scenario, reference, reference).find((c) => c.id === "reproduces")?.passed, false);
  });

  console.log("Report derivation");
  await check("no changes means every criterion is not assessed", () => {
    const report = deriveReport(scenario, SOLUTIONS.starter.files, starter);
    assert.equal(report.noChanges, true);
    assert.ok(report.criteria.every((c) => c.state === "not_assessed"));
  });
  await check("reference submission demonstrates every criterion", () => {
    const report = deriveReport(scenario, SOLUTIONS.reference.files, reference);
    assert.ok(report.criteria.every((c) => c.state === "demonstrated"), JSON.stringify(report.criteria.map((c) => [c.criterion.id, c.state])));
    assert.equal(report.diffs[0]?.path, "src/inbox.js");
    assert.deepEqual(report.publicTests, { passed: 4, total: 4 });
    assert.deepEqual(report.protectedTests, { passed: 4, total: 4 });
  });
  await check("incorrect submission is only partially demonstrated on R4", () => {
    const report = deriveReport(scenario, SOLUTIONS.incorrect.files, incorrect);
    const state = (id: string) => report.criteria.find((c) => c.criterion.id === id)?.state;
    assert.equal(state("R4"), "partially_demonstrated");
    assert.equal(state("R5"), "demonstrated");
  });
  await check("states come only from what ran", () => {
    const meta = rt.tests[0];
    const failing: SupportingTest[] = [{ meta, status: "fail", message: null }];
    assert.equal(deriveState(failing, false).state, "concern_observed");
    assert.equal(deriveState([{ meta, status: "not_run", message: null }], false).state, "not_assessed");
    assert.equal(deriveState([], false).state, "not_assessed");
    assert.equal(deriveState([{ meta, status: "pass", message: null }], true).state, "not_assessed");
  });
  await check("written evidence is shown as written and never scored", () => {
    const handoff = { ...emptyHandoff(), changed: "  Claimed keys only after success.  " };
    const transcript: TeamMessage[] = [
      { id: "m1", from: "you", to: "dana", text: "Is retry order important?", kind: "message", trigger: null, factIds: [], at: "2026-10-07T10:00:00.000Z", status: "sent", notice: null },
      { id: "r1", from: "dana", to: null, text: "Not for this task.", kind: "message", trigger: null, factIds: [], at: "2026-10-07T10:00:05.000Z", status: "sent", notice: null },
    ];
    const written = writtenEvidence(scenario, handoff, transcript);
    assert.deepEqual(written.handoff.map((h) => h.text), ["Claimed keys only after success."]);
    assert.equal(written.messages.length, 1);
    assert.equal(written.messages[0].to, "Dana Okafor");
  });
  await check("review drafts come from the first gap, or a general question when there is none", () => {
    const gapReport = deriveReport(scenario, SOLUTIONS.incorrect.files, incorrect);
    const finding = candidateFinding(gapReport);
    assert.equal(finding.criterionId, "R4");
    assert.match(defaultFollowUp(gapReport), /not fully met/);
    assert.match(reviewerObservation(gapReport), /4 of 4 public and 3 of 4 protected tests passed/);
    assert.match(reviewerObservation(gapReport), /Reasoning is not scored/);
    const clean = deriveReport(scenario, SOLUTIONS.reference.files, reference);
    assert.equal(candidateFinding(clean).title, "Tested requirements met");
    assert.match(defaultFollowUp(clean), /production/);
    assert.equal(candidateFinding(deriveReport(scenario, SOLUTIONS.starter.files, starter)).title, "No changes submitted");
  });

  console.log("Diff");
  await check("line diff finds additions, removals and ranges", () => {
    const ops = diffLines("a\nb\nc\nd\n", "a\nB\nc\nd\ne\n");
    assert.deepEqual(
      ops.map((o) => `${o.kind}:${o.text}`),
      ["same:a", "del:b", "add:B", "same:c", "same:d", "add:e"],
    );
    assert.deepEqual(changedRanges(ops), [{ start: 2, end: 2 }, { start: 5, end: 5 }]);
    const removal = diffFile("x", "a\nb\nc\n", "a\nc\n");
    assert.equal(removal.removed, 1);
    assert.deepEqual(removal.ranges, [{ start: 2, end: 2 }]);
    assert.equal(toHunks(ops, 0).length, 2);
    assert.equal(toHunks(ops, 1).length, 1, "adjacent context windows merge");
    assert.equal(diffFile("x", "same\n", "same\n").ranges.length, 0);
  });

  console.log("State");
  await check("progress is kept per scenario and round-trips through storage", () => {
    const storage = memoryStorage();
    let state = withProgress(initialState(), scenario, (p) => ({
      ...p,
      files: { ...p.files, "src/inbox.js": "// edited" },
      startedAt: "2026-10-07T10:00:00.000Z",
      review: { ...p.review, decision: { value: "hold", at: "2026-10-07T11:00:00.000Z" } },
    }));
    saveState(storage, state);
    assert.ok(storage.data.has(STORAGE_KEY));
    state = loadState(storage);
    const p = progressOf(state, scenario);
    assert.equal(p.files["src/inbox.js"], "// edited");
    assert.equal(p.review.decision?.value, "hold");
    assert.equal(progressStatus(p), "in_progress");
    assert.equal(progressStatus(undefined), "not_started");
  });
  await check("resetting one scenario leaves the others; full reset clears storage", () => {
    const state = withProgress(initialState(), scenario, (p) => ({ ...p, startedAt: "2026-10-07T10:00:00.000Z" }));
    const cleared = withoutProgress(state, scenario.key);
    assert.deepEqual(cleared.scenarios, {});
    assert.equal(withoutProgress(cleared, "other"), cleared);
    const storage = memoryStorage();
    saveState(storage, state);
    storage.setItem(LEGACY_STORAGE_KEYS[0], "{}");
    assert.deepEqual(resetState(storage), initialState());
    assert.equal(storage.data.size, 0);
  });
  await check("unknown scenarios and damaged fields are dropped", () => {
    const parsed = parseState({ version: 3, scenarios: { nope: {}, "event-inbox": { files: { "src/inbox.js": 42, "test/inbox.test.js": "x" }, activeFile: "zzz" } } });
    assert.ok(parsed);
    assert.deepEqual(Object.keys(parsed?.scenarios ?? {}), ["event-inbox"]);
    const p = parsed?.scenarios["event-inbox"];
    assert.equal(p?.files["src/inbox.js"], rt.starterFiles["src/inbox.js"]);
    assert.equal(p?.files["test/inbox.test.js"], undefined);
    assert.equal(p?.activeFile, initialProgress(scenario).activeFile);
    assert.equal(parseState({ version: 9 }), null);
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, "{not json");
    assert.deepEqual(loadState(storage), initialState());
  });
  await check("version 2 migrates into the event inbox, with test ids mapped", () => {
    const storage = memoryStorage();
    const v2 = {
      version: 2,
      view: "task",
      candidate: {
        files: { "src/inbox.js": "// v2 edit" },
        startedAt: "2026-10-01T09:00:00.000Z",
        lastRun: {
          at: "2026-10-01T09:05:00.000Z",
          scope: "public",
          outcome: "completed",
          outcomeMessage: null,
          results: [{ id: "public.processes_once", status: "pass", message: null, durationMs: 2 }],
          logs: [],
          durationMs: 5,
        },
        team: [{ id: "m_abcdefgh", from: "you", to: "theo", text: "What did support see?", kind: "message", trigger: null, factIds: [], at: "2026-10-01T09:01:00.000Z", status: "sent", notice: null }],
        delivered: ["kickoff"],
      },
      review: { followUp: "Why?", privateNote: null, decision: null },
      creator: { level: "senior" },
    };
    storage.setItem("fydell-sandbox-v2", JSON.stringify(v2));
    const state = loadState(storage);
    const p = state.scenarios["event-inbox"];
    assert.ok(p, "migrated");
    assert.equal(p.files["src/inbox.js"], "// v2 edit");
    assert.equal(p.lastRun?.results[0]?.id, ids.processesOnce);
    assert.equal(p.team.length, 1);
    assert.deepEqual(p.delivered, ["kickoff"]);
    assert.equal(p.review.followUp, "Why?");
    saveState(storage, state);
    assert.equal(storage.data.has("fydell-sandbox-v2"), false);
    assert.ok(storage.data.has(STORAGE_KEY));
  });
  await check("version 1 migrates without its prepared chat; untouched state migrates to nothing", () => {
    const v1 = {
      version: 1,
      candidate: { files: { "src/inbox.js": "// v1 edit" }, team: [{ id: "m_x", from: "dana", to: null, text: "prepared reply", kind: "message", at: "2026-10-01T09:01:00.000Z" }] },
    };
    const migrated = parseState(v1);
    const p = migrated?.scenarios["event-inbox"];
    assert.equal(p?.files["src/inbox.js"], "// v1 edit");
    assert.deepEqual(p?.team, []);
    assert.deepEqual(parseState({ version: 1, candidate: {} })?.scenarios, {});
  });

  console.log("Team client");
  await check("responses are narrowed against the scenario's teammates", () => {
    const reply = { clientMsgId: "abc12345", teammateId: "dana", kind: "reply", trigger: null, text: " Hello ", factIds: ["f1", 3] };
    const parsed = parseTeamResponse({ status: "answered", reply }, rt.teammateIds);
    assert.equal(parsed?.status, "answered");
    if (parsed?.status === "answered") {
      assert.equal(parsed.reply.text, "Hello");
      assert.deepEqual(parsed.reply.factIds, ["f1"]);
    }
    assert.equal(parseTeamResponse({ status: "answered", reply: { ...reply, teammateId: "mallory" } }, rt.teammateIds), null);
    assert.equal(parseTeamResponse({ status: "answered", reply: { ...reply, kind: "checkin", trigger: null } }, rt.teammateIds), null);
  });
  await check("a failed call never becomes a reply", () => {
    assert.equal(interpretTeamCall(0, null, rt.teammateIds).kind, "unavailable");
    assert.equal(interpretTeamCall(500, { nope: true }, rt.teammateIds).kind, "unavailable");
    const unavailable = interpretTeamCall(503, { status: "unavailable", reason: "not_configured", retryAfterSeconds: null, message: "Not set up." }, rt.teammateIds);
    assert.deepEqual(unavailable, { kind: "unavailable", message: "Not set up.", retryAfterSeconds: null });
  });
  await check("replies are added once, however many retries produced them", () => {
    const reply = { clientMsgId: "abc12345", teammateId: "dana", kind: "reply" as const, trigger: null, text: "Hi", factIds: [] };
    const once = appendReply([], reply, "2026-10-07T10:00:00.000Z");
    assert.equal(appendReply(once, reply, "2026-10-07T10:00:01.000Z"), once);
    assert.equal(once[0].from, "dana");
  });
  await check("history carries answered turns only", () => {
    const team: TeamMessage[] = [
      { id: "a", from: "you", to: "dana", text: "q1", kind: "message", trigger: null, factIds: [], at: "2026-10-07T10:00:00.000Z", status: "sent", notice: null },
      { id: "b", from: "you", to: "dana", text: "q2", kind: "message", trigger: null, factIds: [], at: "2026-10-07T10:00:01.000Z", status: "unavailable", notice: "x" },
      { id: "c", from: "system", to: null, text: "notice", kind: "notice", trigger: null, factIds: [], at: "2026-10-07T10:00:02.000Z", status: "sent", notice: null },
      { id: "d", from: "theo", to: null, text: "a1", kind: "message", trigger: null, factIds: [], at: "2026-10-07T10:00:03.000Z", status: "sent", notice: null },
    ];
    assert.deepEqual(toHistory(team), [
      { from: "you", to: "dana", text: "q1" },
      { from: "theo", to: null, text: "a1" },
    ]);
  });
  await check("workspace context and check-ins are derived from the scenario", async () => {
    assert.equal(checkinSenderId(scenario, "kickoff"), "dana");
    assert.equal(checkinSenderId(scenario, "support_context"), "theo");
    const record = toRunRecord(scenario, "public", await runInProcess(buildPayload(scenario, SOLUTIONS.starter.files, "public")), "2026-10-07T10:05:00.000Z", 10);
    const summary = summarizeRun(scenario, record);
    assert.equal(summary.total, 4);
    assert.deepEqual(summary.failing, ["retries an event after a temporary handler failure"]);
    assert.deepEqual(workspaceChanges(scenario, initialProgress(scenario).files), []);
    const changes = workspaceChanges(scenario, { "src/inbox.js": SOLUTIONS.reference.files["src/inbox.js"] });
    assert.equal(changes[0]?.path, "src/inbox.js");
    assert.ok((changes[0]?.hunks.length ?? 0) > 0);

    const start = Date.parse("2026-10-07T10:00:00.000Z");
    const progress = { ...initialProgress(scenario), startedAt: "2026-10-07T10:00:00.000Z", lastActivityAt: "2026-10-07T10:00:00.000Z" };
    assert.equal(dueCheckin(checkinInput(scenario, progress, start)), "kickoff");
    const afterKickoff = { ...progress, delivered: ["kickoff" as const] };
    assert.equal(dueCheckin(checkinInput(scenario, afterKickoff, start + 60_000)), null);
    assert.equal(dueCheckin(checkinInput(scenario, afterKickoff, start + 5 * 60_000)), "support_context");
    const askedTheo = { ...afterKickoff, team: [{ id: "q", from: "you", to: "theo", text: "hi", kind: "message" as const, trigger: null, factIds: [], at: "2026-10-07T10:01:00.000Z", status: "sent" as const, notice: null }] };
    assert.equal(dueCheckin(checkinInput(scenario, askedTheo, start + 5 * 60_000)), null);
    const ws = buildWorkspace(scenario, { ...afterKickoff, lastRun: record, runCount: 1 }, start + 5 * 60_000);
    assert.equal(ws.elapsedMinutes, 5);
    assert.equal(ws.lastRun?.passed, 3);
  });

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
