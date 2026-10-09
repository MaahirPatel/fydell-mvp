/**
 * Simulation runtime rules: private-material leakage, the incorrect-solution
 * minimum, repeated teammate questions, the session lifecycle and the frozen
 * submission manifest. Pure rules only: no model calls, no database and no
 * candidate code execution.
 *
 * Run: npx tsx --conditions react-server scripts/test-simulation-runtime.ts
 */
import assert from "node:assert/strict";
import { executionChecks, MIN_INCORRECT_SOLUTIONS, staticChecks } from "../src/lib/eng/authoring/checks";
import { packageLeaks } from "../src/lib/eng/authoring/leakage";
import { displayCommand, type Runner, type SuiteRun } from "../src/lib/eng/authoring/runner";
import { repeatedQuestionReply, type Turn } from "../src/lib/eng/authored/collaboration-core";
import { buildManifest, filesMatchManifest, isClientSubmissionId, manifestSha256, receiptStatements, seqRange } from "../src/lib/eng/authored/manifest";
import { EXEMPLARS, buildExemplar } from "../src/lib/eng/exemplars/registry";
import { operationalState, sessionLifecycle, type OperationalState } from "../src/lib/eng/state";

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed += 1;
    console.log(`ok  ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function built(key: string) {
  const b = buildExemplar(key);
  assert.ok(b, `simulation template ${key} builds`);
  return { pkg: structuredClone(b.pkg), prot: structuredClone(b.prot) };
}

async function main() {
  await test("every simulation template keeps private material out of candidate and teammate context", () => {
    for (const ex of EXEMPLARS) {
      const { pkg, prot } = built(ex.key);
      const result = packageLeaks(pkg, prot, displayCommand(pkg.environment.id, pkg.publicTests.map((t) => t.file)));
      assert.deepEqual(result.leaks, [], `${ex.key} leaks private material`);
      assert.ok(result.fingerprints > 0, `${ex.key} has private fingerprints to look for`);
      assert.ok(result.contexts >= 4, `${ex.key} checks the payload, disclosures and prompts`);
    }
  });

  await test("a reference line placed in a teammate fact is detected as a leak", () => {
    const { pkg, prot } = built("webhook-dedupe");
    const refLine = prot.reference.files
      .flatMap((f) => f.content.split("\n"))
      .map((l) => l.trim())
      .find((l) => l.replace(/\s/g, "").length >= 25 && !pkg.starterFiles.some((s) => s.content.includes(l)));
    assert.ok(refLine, "the reference has a distinctive line");
    const coworker = pkg.coworkers[0];
    assert.ok(coworker, "the template has a teammate");
    prot.coworkerFacts[coworker.id] = [...(prot.coworkerFacts[coworker.id] ?? []), { id: "leak", text: `Just write ${refLine} and you are done.` }];
    const result = packageLeaks(pkg, prot, "python3 -m unittest");
    assert.ok(result.leaks.length > 0, "the leak is found");
    const check = staticChecks(pkg, prot).find((c) => c.id === "leakage");
    assert.equal(check?.status, "failed");
  });

  await test("a hidden test name in the brief is detected as a leak", () => {
    const { pkg, prot } = built("job-lease-recovery");
    const names = prot.protectedTests.flatMap((f) => [...f.content.matchAll(/test\(\s*["'`]([^"'`]{12,})["'`]/g)].map((m) => m[1]));
    const hidden = names.find((n) => !pkg.starterFiles.some((s) => s.content.includes(n)));
    assert.ok(hidden, "the template has a distinctive protected test name");
    pkg.brief.context = `${pkg.brief.context}\n\nMake sure "${hidden}" passes.`;
    assert.ok(packageLeaks(pkg, prot, "node --test").leaks.length > 0);
  });

  await test(`fewer than ${MIN_INCORRECT_SOLUTIONS} incorrect solutions fails the check even when each is caught`, async () => {
    const { pkg, prot } = built("webhook-dedupe");
    prot.incorrectSolutions = prot.incorrectSolutions.slice(0, 1);
    const hang: SuiteRun = { kind: "timeout", command: "x", durationMs: 1, output: "" };
    const runner: Runner = {
      info: { name: "local-dev", isolated: false, label: "test", version: "test" },
      runSuites: async (requests) => requests.map(() => hang),
    };
    const checks = await executionChecks(pkg, prot, runner);
    const incorrect = checks.find((c) => c.id === "incorrect");
    assert.equal(incorrect?.status, "failed");
    assert.ok(incorrect?.issues.some((i) => /at least 2/.test(i)));
  });

  await test("a repeated teammate question gets one short sentence and no new detail", () => {
    const facts = [
      { id: "retry", text: "The provider retries deliveries with the same event id but a new delivery id. It retries for up to three days.", topics: ["retry", "event id"] },
      { id: "volume", text: "We see about forty webhooks a minute at peak.", topics: ["volume"] },
    ];
    const fresh: Turn[] = [];
    assert.equal(repeatedQuestionReply("Does the provider reuse the event id on retry?", facts, fresh, "lead"), null, "first time is answered normally");
    const thread: Turn[] = [
      { sender: "candidate", teammateId: "lead", body: "Does the provider reuse the event id on retry?", eventKey: null },
      { sender: "teammate", teammateId: "lead", body: facts[0].text, eventKey: null, factIds: ["retry"] },
    ];
    const again = repeatedQuestionReply("Sorry, on retry is the event id the same?", facts, thread, "lead");
    assert.ok(again, "a repeat is recognised");
    assert.match(again.body, /^As I said earlier, /);
    assert.ok(!again.body.includes("three days"), "only the first sentence is repeated");
    assert.deepEqual(again.factIds, ["retry"]);
    assert.equal(repeatedQuestionReply("What volume do we see?", facts, thread, "lead"), null, "a new topic is answered normally");
    assert.equal(repeatedQuestionReply("Sorry, on retry is the event id the same?", facts, thread, "other"), null, "another teammate has not said it");
  });

  await test("session lifecycle covers every state and never calls a platform fault a result", () => {
    const inv = { status: "accepted" as const, expires_at: "2099-01-01T00:00:00Z" };
    const op = (attempt: string | null, run: string | null = null, released = false): OperationalState =>
      operationalState({
        invitation: inv,
        attempt: attempt ? ({ status: attempt } as { status: "accepted" }) : null,
        run: run ? ({ status: run } as { status: "queued" }) : null,
        releasedReport: released ? { status: "released" } : null,
      });
    const c = (o: OperationalState, extra: { submissionRecorded?: boolean; windowClosed?: boolean } = {}) => sessionLifecycle(o, { audience: "candidate", ...extra }).state;
    assert.equal(c(op(null)), "available");
    assert.equal(c(op("accepted")), "preparing");
    assert.equal(c(op("preflight_passed")), "ready");
    assert.equal(c(op("in_progress")), "active");
    assert.equal(c(op("in_progress"), { submissionRecorded: true }), "submission_pending");
    assert.equal(c(op("in_progress"), { windowClosed: true }), "expired");
    assert.equal(c(op("submitted")), "submitted");
    assert.equal(c(op("submitted", "queued")), "analysis_pending");
    assert.equal(c(op("submitted", "running")), "analysis_pending");
    for (const failed of ["retryable_failure", "blocked"]) {
      const v = sessionLifecycle(op("submitted", failed), { audience: "candidate" });
      assert.equal(v.state, "analysis_failed");
      assert.match(v.detail, /not a result about your work/);
    }
    assert.equal(c(op("submitted", "human_review")), "submitted", "candidates see no result before release");
    assert.equal(sessionLifecycle(op("submitted", "human_review"), { audience: "employer" }).state, "report_ready");
    assert.equal(c(op("submitted", "human_review", true)), "report_ready");
    assert.equal(c(op("withdrawn")), "cancelled");
    assert.equal(c(op("expired")), "expired");
  });

  await test("submission manifest is stable, order independent, and detects any changed file", () => {
    const files = [
      { path: "b.py", content: "print('b')\n" },
      { path: "a.py", content: "print('a')\n" },
    ];
    const input = {
      clientSubmissionId: "web_0123456789abcdef",
      attemptId: "00000000-0000-0000-0000-000000000001",
      scenario: { versionId: "v1", key: "webhook-dedupe", version: 3, harnessSha256: "f".repeat(64), aiPolicy: "assistants_disclosed" },
      files,
      archive: { sha256: "a".repeat(64), bytes: 512 },
      handoff: { what_changed: "", testing: "", risks: "", next_steps: "", authored: [{ id: "what_changed", label: "What changed?", answer: "Deduped on event id." }, { id: "risks", label: "Risks?", answer: " " }] },
      aiDisclosure: "Used the built-in assistant once.",
      builtInAssistantRequests: 1,
      events: seqRange([4, 9, 2]),
      teamMessages: seqRange([]),
      assistantInteractions: seqRange([7]),
      late: false,
    };
    const m1 = buildManifest(input);
    const m2 = buildManifest({ ...input, files: [...files].reverse() });
    assert.equal(manifestSha256(m1), manifestSha256(m2), "file order does not change the hash");
    assert.match(manifestSha256(m1), /^[a-f0-9]{64}$/);
    assert.deepEqual(m1.files.map((f) => f.path), ["a.py", "b.py"]);
    assert.deepEqual(m1.events, { count: 3, firstSeq: 2, lastSeq: 9 });
    assert.deepEqual(m1.teamMessages, { count: 0, firstSeq: null, lastSeq: null });
    assert.deepEqual(m1.handoff.answered, 1);
    assert.ok(filesMatchManifest(files, m1));
    assert.ok(!filesMatchManifest([files[0], { path: "a.py", content: "print('A')\n" }], m1), "a changed byte is detected");
    assert.ok(!filesMatchManifest([files[0]], m1), "a missing file is detected");
    assert.ok(!filesMatchManifest([...files, { path: "c.py", content: "" }], m1), "an extra file is detected");
    assert.notEqual(manifestSha256(buildManifest({ ...input, late: true })), manifestSha256(m1));
    assert.ok(isClientSubmissionId("web_0123456789abcdef"));
    assert.ok(!isClientSubmissionId("short"));
    assert.ok(!isClientSubmissionId("has spaces in it"));
  });

  await test("receipt says what it proves and what it does not", () => {
    const r = receiptStatements({ files: [{ path: "a.py", bytes: 1, sha256: "0".repeat(64) }], scenario: { versionId: "v", key: "k", version: 2, harnessSha256: "", aiPolicy: "" } });
    assert.ok(r.proves.some((p) => /1 file/.test(p)));
    assert.ok(r.proves.some((p) => /version 2/.test(p)));
    assert.ok(r.doesNotProve.some((p) => /correct/.test(p)));
    assert.ok(r.doesNotProve.some((p) => /yourself/.test(p)));
    for (const line of [...r.proves, ...r.doesNotProve]) assert.ok(!line.includes("\u2014"), "no em dashes in candidate copy");
    assert.ok(receiptStatements(null).proves.length >= 1, "older submissions without a manifest still get a receipt");
  });

  console.log(`\n${passed} passed`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
