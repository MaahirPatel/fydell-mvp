/**
 * Employer grind — report assembly and sharing (REP-01/02/03/04/07).
 *
 * REP-01: decision brief assembled from real analysis artifacts.
 * REP-02: every finding links to its source; anchors resolve losslessly.
 * REP-03: separated result categories; no universal hireability number.
 * REP-04: identifiers correct; fixes create versioned updates; history immutable.
 * REP-07: secure share links are scoped to one report version and expire.
 * In-process with fakes.
 */

import { assembleDecisionBrief, assertNoGlobalScore } from "../src/lib/reports/assemble";
import { findingLink, resolveAnchor } from "../src/lib/reports/links";
import {
  publishReport,
  updateReport,
  getReportVersion,
  listReportVersions,
  createReportMemoryStore,
} from "../src/lib/reports/versions";
import {
  createReportShare,
  resolveReportShare,
  revokeReportShare,
  createShareMemoryStore,
} from "../src/lib/reports/sharing";
import type {
  CompetencyResult,
  Finding,
} from "../src/lib/reports/types";

let failures = 0;
function ok(name: string, condition: boolean, detail = "") {
  if (condition) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name}${detail ? `\n         ${detail}` : ""}`);
    failures += 1;
  }
}
function section(title: string) {
  console.log(`\n${title}`);
}

function sampleArtifacts() {
  const competencies: CompetencyResult[] = [
    { competency: "Root-cause analysis", category: "coding", band: "strong", score: 88, summary: "Isolated the defect to the retry policy." },
    { competency: "Test design", category: "coding", band: "developing", score: 55, summary: "Tests cover happy path only." },
    { competency: "Requirement interpretation", category: "interpretation", band: "adequate", score: 70, summary: "Read the updated spec correctly." },
    { competency: "Status communication", category: "communication", band: "adequate", score: 72, summary: "Clear handoff note." },
    { competency: "Workspace health", category: "infrastructure", band: "strong", score: 95, summary: "Submission package verified." },
  ];
  const findings: Omit<Finding, "flagged" | "flagReason">[] = [
    {
      id: "f-1",
      category: "coding",
      title: "Correctly isolated the retry-policy defect",
      detail: "Candidate traced duplicate deliveries to the retry policy in webhooks.ts.",
      severity: "strength",
      sources: [{ kind: "diff", ref: "src/webhooks.ts", label: "webhooks.ts diff" }],
    },
    {
      id: "f-2",
      category: "coding",
      title: "No regression test for the retry path",
      detail: "Submitted tests do not exercise the retry backoff.",
      severity: "gap",
      sources: [{ kind: "test", ref: "tests/retry.test.ts", label: "retry tests" }],
    },
    {
      id: "f-3",
      category: "communication",
      title: "Handoff note is clear and actionable",
      detail: "Message to the on-call names the defect, the fix, and the remaining risk.",
      severity: "strength",
      sources: [{ kind: "message", ref: "msg-42", label: "handoff message" }],
    },
  ];
  return { competencies, findings };
}

function sampleInput() {
  const { competencies, findings } = sampleArtifacts();
  return {
    reportId: "rep-1",
    reportVersion: 1,
    candidateName: "Ada Lovelace",
    candidateEmail: "ada@example.com",
    roleTitle: "Backend Engineer",
    roleKey: "backend_engineer",
    scenarioTitle: "Webhook retry incident",
    scenarioVersion: "v1.0.0",
    rubricVersion: "v1.0.0",
    invitationId: "inv-1",
    sessionId: "sess-1",
    competencies,
    findings,
    limitations: [
      "The assessment covers one incident scenario; it does not measure system design or production on-call experience.",
      "AI tooling was permitted; self-reported use is noted separately from observed interactions.",
    ],
    interviewFollowUps: [
      "Walk me through how you would design a regression test for the retry backoff.",
      "What would you monitor after deploying this fix?",
    ],
  };
}

/* REP-01: decision brief from real data ------------------------------------------- */

section("REP-01: decision brief assembled from real analysis artifacts");

{
  const brief = assembleDecisionBrief(sampleInput());
  ok("brief names the candidate", brief.brief.includes("Ada Lovelace"));
  ok("brief names the role and task", brief.brief.includes("Backend Engineer") && brief.brief.includes("Webhook retry incident"));
  ok("brief carries scenario + rubric versions", brief.scenarioVersion === "v1.0.0" && brief.rubricVersion === "v1.0.0");
  ok("brief cites a demonstrated strength", brief.brief.includes("Correctly isolated the retry-policy defect"));
  ok("brief cites a material gap", brief.brief.includes("No regression test for the retry path"));
  ok("brief states evidence limitations", brief.limitations.length === 2 && brief.brief.includes("Limitation:"));
  ok("brief offers interview follow-ups", brief.interviewFollowUps.length === 2);
  ok("brief is short, not a transcript dump", brief.brief.length < 2000);
  ok("identifiers carried through", brief.invitationId === "inv-1" && brief.sessionId === "sess-1" && brief.candidateEmail === "ada@example.com");
}

/* REP-03: separated categories, no global score ----------------------------------- */

section("REP-03: separated result categories; no universal hireability number");

{
  const brief = assembleDecisionBrief(sampleInput());
  const cats = brief.categories.map((c) => c.category);
  ok(
    "four separated categories",
    cats.join(",") === "coding,interpretation,communication,infrastructure"
  );
  const coding = brief.categories.find((c) => c.category === "coding");
  ok("coding band rolls up conservatively (weakest observed)", coding?.band === "developing");
  const infra = brief.categories.find((c) => c.category === "infrastructure");
  ok("infrastructure status is distinct from coding results", infra?.band === "strong");
  ok("each category links its findings", coding?.findingIds.join(",") === "f-1,f-2");

  const guard = assertNoGlobalScore(brief);
  ok("no universal hireability number present", guard.ok);

  // The guard actually catches a violation.
  const polluted = { ...brief, hireabilityScore: 87 } as never;
  const caught = assertNoGlobalScore(polluted);
  ok("guard rejects a report with a global score", !caught.ok);
}

/* REP-02: evidence one click away -------------------------------------------------- */

section("REP-02: every finding links to its source; anchors resolve losslessly");

{
  const brief = assembleDecisionBrief(sampleInput());
  const finding = brief.findings.find((f) => f.id === "f-1");
  if (!finding) throw new Error("setup failed");
  const link = findingLink("rep-1", finding);
  ok("finding anchor is stable", link.anchor === "/reports/rep-1#finding-f-1");
  ok("source anchor names kind + ref", link.sources[0].anchor.includes("source-diff-src%2Fwebhooks.ts"));

  const resolved = resolveAnchor(brief.findings, link.sources[0].anchor);
  ok("source anchor resolves to the exact finding + source", resolved?.finding.id === "f-1" && resolved?.source?.ref === "src/webhooks.ts");
  const resolvedFinding = resolveAnchor(brief.findings, link.anchor);
  ok("finding anchor resolves to the finding", resolvedFinding?.finding.id === "f-1" && resolvedFinding?.source === null);
  ok("bogus anchor resolves to nothing", resolveAnchor(brief.findings, "/reports/rep-1#finding-nope") === null);
}

/* REP-04: versioned report updates --------------------------------------------------- */

section("REP-04: consistent identifiers; fixes create versioned updates");

{
  const store = createReportMemoryStore();
  const pub = publishReport(store, assembleDecisionBrief(sampleInput()), "u-reviewer", {
    sessionId: "sess-1",
    invitationId: "inv-1",
  });
  ok("report publishes as v1", pub.ok && pub.value.version === 1);
  if (!pub.ok) throw new Error("setup failed");

  const wrongSession = publishReport(store, assembleDecisionBrief(sampleInput()), "u-reviewer", {
    sessionId: "sess-OTHER",
    invitationId: "inv-1",
  });
  ok("identifier mismatch rejected at publish", !wrongSession.ok && wrongSession.code === "identifier_mismatch");

  // A correction creates v2; v1 stays immutable.
  const corrected = assembleDecisionBrief({
    ...sampleInput(),
    findings: sampleArtifacts().findings.map((f) =>
      f.id === "f-2" ? { ...f, detail: "Submitted tests do not exercise the retry backoff (corrected file ref)." } : f
    ),
  });
  const upd = updateReport(store, "rep-1", corrected, "u-reviewer", "Corrected the test file reference in finding f-2.");
  ok("correction publishes as v2", upd.ok && upd.value.version === 2);
  if (!upd.ok) throw new Error("update failed");

  const v1 = getReportVersion(store, "rep-1", 1);
  ok("v1 remains retrievable and immutable", v1?.version === 1 && v1.brief.findings.find((f) => f.id === "f-2")?.detail.includes("corrected file ref") === false);
  ok("latest resolves to v2", getReportVersion(store, "rep-1")?.version === 2);
  ok("version history lists both", listReportVersions(store, "rep-1").length === 2);

  const sneaky = assembleDecisionBrief({ ...sampleInput(), candidateEmail: "mallory@example.com" });
  const badUpdate = updateReport(store, "rep-1", sneaky, "u-reviewer", "note");
  ok("correction cannot repoint the report at another candidate", !badUpdate.ok && badUpdate.code === "identifier_mismatch");

  const noNote = updateReport(store, "rep-1", corrected, "u-reviewer", "   ");
  ok("update requires a change note", !noNote.ok);
}

/* REP-07: secure scoped sharing ------------------------------------------------------ */

section("REP-07: secure report links are scoped and expiring");

{
  const shares = createShareMemoryStore();
  const { share, token } = createReportShare(shares, {
    reportId: "rep-1",
    reportVersion: 2,
    orgId: "org-1",
    createdBy: "u-reviewer",
  });
  ok("share token is 256-bit", token.length >= 43);
  ok(
    "plaintext share token never stored",
    ![...shares.shares.values()].some((s) => JSON.stringify(s).includes(token.slice(0, 12)))
  );
  ok("share scope is report_view only", share.scope === "report_view");

  const res = resolveReportShare(shares, token);
  ok("share resolves to the exact report version", res.ok && res.value.reportId === "rep-1" && res.value.reportVersion === 2);
  if (res.ok) {
    ok("grant carries no broader capability", res.value.scope === "report_view" && !("notes" in res.value));
  }
  ok("unknown token rejected", !resolveReportShare(shares, "bogus").ok);

  revokeReportShare(shares, share.id);
  const revoked = resolveReportShare(shares, token);
  ok("revoked share link stops working", !revoked.ok && revoked.code === "revoked");
}

/* Summary ------------------------------------------------------------------------ */

console.log("");
if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log("All employer report checks passed.");
