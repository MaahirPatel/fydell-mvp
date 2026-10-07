// Criterion-level assessment checks for scenario v2.
//   npx tsx --conditions react-server scripts/test-eng-criteria.ts
import { CURRENT_SCENARIO, getScenario, verifySetupCode, expectedSetupCodes } from "../src/lib/eng/scenarios";
import { criteriaOf, criterionProblems, observedFor, observedSentence, suggestState } from "../src/lib/eng/criteria";
import { normalizeBrief } from "../src/lib/eng/reports";
import { parseBrief } from "../src/lib/eng/citations";
import { projectCandidateReport } from "../src/lib/eng/candidate-report";
import { EXPECTATIONS } from "../src/lib/eng/scenarios/backend-webhook-retry/hidden.generated";
import type { ProbeResult, ReportBrief } from "../src/lib/eng/types";

let failed = 0;
function ok(name: string, cond: boolean, detail?: unknown) {
  if (cond) console.log(`PASS ${name}`);
  else {
    failed++;
    console.log(`FAIL ${name}`, detail ?? "");
  }
}

const v1 = getScenario("backend-webhook-retry", 1)!;
const v2 = CURRENT_SCENARIO;
ok("current scenario is v2", v2.version === 2 && v2.rubricVersion.endsWith("rubric-v2"));
ok("v1 stays registered for existing attempts", v1?.version === 1 && v1.rubricVersion.endsWith("rubric-v1"));
ok("v2 known issues no longer claim a fixed rule set", !v2.knownIssues.some((k) => /fixed rule set/i.test(k)));

const defs = criteriaOf(v2.rubric);
const probeIds = new Set(EXPECTATIONS.probes.map((p) => p.id));
ok("every criterion probe exists in the evaluator", defs.every((d) => d.probeIds.every((id) => probeIds.has(id))));
const covered = new Set(defs.flatMap((d) => d.probeIds));
ok("every evaluator probe belongs to exactly one criterion", [...probeIds].every((id) => covered.has(id)) && defs.flatMap((d) => d.probeIds).length === probeIds.size);
ok("every criterion has a not-assessed anchor", defs.every((d) => d.anchors.some((a) => a.state === "not_assessed")));
ok("dimension anchors use the v2 scale", v2.rubric.every((r) => r.anchors.every((a) => !["strong", "adequate", "weak", "insufficient_evidence"].includes(a.level))));

function results(outcomes: Record<string, ProbeResult["outcome"]>): ProbeResult[] {
  return EXPECTATIONS.probes.map((p) => ({
    id: p.id,
    title: p.title,
    visibility: p.visibility as ProbeResult["visibility"],
    phase: p.phase as ProbeResult["phase"],
    outcome: outcomes[p.id] ?? "passed",
    failedChecks: [],
    detail: null,
  }));
}

const dup = defs.find((d) => d.id === "duplicate_safety")!;
const allPass = observedFor(dup, results({}));
ok("observed counts all passing cases", allPass?.passed === 2 && allPass.total === 2 && allPass.notRun === 0);
ok("all passing suggests demonstrated", suggestState(allPass) === "demonstrated");
const half = observedFor(dup, results({ P4: "failed" }));
ok("one failure suggests partially demonstrated", suggestState(half) === "partially_demonstrated");
ok("sentence keeps the denominator", observedSentence(half!) === "1 of 2 defined cases passed");
const none = observedFor(dup, results({ P4: "failed", H5: "candidate_error" }));
ok("no passes suggests concern observed", suggestState(none) === "concern_observed");
const notRun = observedFor(dup, results({ P4: "no_result", H5: "timeout" }));
ok("checks that never ran suggest not assessed", suggestState(notRun) === "not_assessed");
ok("probe-less criteria have no observed result", observedFor(defs.find((d) => d.id === "added_tests")!, results({})) === null);
ok("probe-less criteria start as not assessed", suggestState(null) === "not_assessed");

function brief(states: Record<string, string>): ReportBrief {
  const parsed = parseBrief({
    summary: "Summary.",
    strengths: [],
    gaps: [],
    limitations: ["Limit."],
    followUps: ["Ask."],
    dimensions: v2.rubric.map((r) => ({ key: r.key, level: "demonstrated", rationale: "Because." })),
    criteria: defs.map((d) => ({ id: d.id, state: states[d.id] ?? "demonstrated", rationale: "Cited in F1." })),
  });
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.brief;
}

const run = results({ P4: "failed" });
const n1 = normalizeBrief(v2, brief({}), run);
ok("normalize fills labels and observed counts from the run", n1.brief.criteria?.find((c) => c.id === "duplicate_safety")?.observed?.passed === 1 && n1.brief.criteria?.[0].label.length > 0);
ok("demonstrated with a failing case is refused", criterionProblems(defs, n1.brief.criteria).some((p) => p.includes("Duplicate-safe retries") && p.includes("cannot be marked demonstrated")));
const n2 = normalizeBrief(v2, brief({ duplicate_safety: "partially_demonstrated" }), run);
ok("consistent states pass", criterionProblems(defs, n2.brief.criteria).length === 0, criterionProblems(defs, n2.brief.criteria));
const n3 = normalizeBrief(v2, brief({ duplicate_safety: "partially_demonstrated", retry_after: "not_assessed" }), run);
ok("cannot hide checks that ran as not assessed", criterionProblems(defs, n3.brief.criteria).some((p) => p.includes("Retry-After")));
const n4 = normalizeBrief(v2, brief({ duplicate_safety: "partially_demonstrated", transport_errors: "concern_observed" }), run);
ok("a concern needs a failing case", criterionProblems(defs, n4.brief.criteria).some((p) => p.includes("Transport errors")));
const missing = normalizeBrief(v2, { ...brief({}), criteria: [] }, run);
ok("every criterion must be assessed", criterionProblems(defs, missing.brief.criteria).length === defs.length);
const forged = parseBrief({ ...brief({}), criteria: [{ id: "duplicate_safety", state: "demonstrated", rationale: "x", observed: { passed: 2, total: 2, notRun: 0 } }] });
const n5 = forged.ok ? normalizeBrief(v2, forged.brief, run) : null;
ok("observed counts sent by the browser are ignored", n5?.brief.criteria?.[0].observed?.passed === 1);
const legacy = normalizeBrief(v2, { ...brief({}), dimensions: [{ key: "correctness", level: "strong", rationale: "x" }] }, run);
ok("v1 levels are refused on a v2 report", legacy.problems.length === 1);
const v1Brief = normalizeBrief(v1, { ...brief({}), dimensions: [{ key: "correctness", level: "strong", rationale: "x" }] }, run);
ok("v1 reports keep their scale and carry no criteria", v1Brief.problems.length === 0 && v1Brief.brief.criteria === undefined);
ok("bad state is rejected at parse", parseBrief({ ...brief({}), criteria: [{ id: "x", state: "great", rationale: "" }] }).ok === false);

{
  const runResults = results({ P4: "failed", H5: "failed", U3: "failed" });
  const b = normalizeBrief(v2, brief({ duplicate_safety: "concern_observed", retry_after: "partially_demonstrated" }), runResults).brief;
  b.followUps = ["PRIVATE-FOLLOWUP: ask about the cap"];
  const report = {
    id: "r1", attempt_id: "a1", evaluation_run_id: "run1", version: 2, status: "released" as const, brief: b,
    findings: [
      { id: "F1", dimension: "correctness" as const, category: "coding_result" as const, kind: "gap" as const, basis: "observed" as const, statement: "Retries change the key.", citations: [{ kind: "test" as const, ref: "H5" }, { kind: "test" as const, ref: "P4" }, { kind: "file" as const, ref: "webhooks/dispatcher.py", lineStart: 10, lineEnd: 12 }] },
    ],
    rubric_version: v2.rubricVersion, reviewer_email: "reviewer-private@example.com", change_reason: "Fixed a citation.", supersedes_id: "r0", review_minutes: 9,
    released_at: "2026-10-07T12:00:00Z", created_at: "2026-10-07T11:00:00Z", updated_at: "2026-10-07T12:00:00Z",
  };
  const old = { ...report, id: "r0", version: 1, status: "superseded" as const, change_reason: null, supersedes_id: null };
  const projected = projectCandidateReport(v2, report as never, runResults, [report, old] as never, []);
  const json = JSON.stringify(projected);
  const hiddenTitles = EXPECTATIONS.probes.filter((p) => p.visibility === "hidden").map((p) => p.title);
  ok("candidate report omits interview follow-ups", !json.includes("PRIVATE-FOLLOWUP"));
  ok("candidate report omits reviewer identity", !json.includes("reviewer-private@example.com"));
  ok("candidate report never names a hidden check", hiddenTitles.every((t) => !json.includes(t)) && !json.includes("\"H5\""));
  ok("hidden checks are reported by count", projected.hiddenChecks?.total === hiddenTitles.length && projected.hiddenChecks.passed === hiddenTitles.length - 2);
  ok("public checks keep titles and outcomes", projected.publicChecks.find((c) => c.id === "P4")?.outcome === "failed");
  ok("finding citations hide the hidden check id", projected.findings[0].citations.some((c) => c.kind === "hidden_check") && projected.findings[0].citations.some((c) => c.kind === "public_check"));
  ok("improvement items cover criteria not demonstrated", projected.improvements.map((i) => i.criterionId).sort().join() === "duplicate_safety,retry_after");
  ok("each improvement has observation, reason, next step, recheck and limit", projected.improvements.every((i) => i.observation && i.whyItMatters && i.nextStep && i.recheck && i.limit.startsWith("Not covered")));
  ok("versions keep the superseded report and the change reason", projected.versions.length === 2 && projected.versions.some((v) => !v.current && v.version === 1) && projected.changeReason === "Fixed a citation.");
}

const v2Code = [...expectedSetupCodes(v2).keys()][0];
const v1Code = [...expectedSetupCodes(v1).keys()][0];
ok("a v1 attempt accepts the code from the served v2 starter", verifySetupCode(v1, v2Code) !== null);
ok("a v2 attempt does not accept an old v1 code", verifySetupCode(v2, v1Code) === null);

console.log(failed ? `\n${failed} failed` : "\nAll criteria checks passed");
process.exit(failed ? 1 : 0);
