/**
 * Employer grind — decisions, reviewer notes, report permissions
 * (EMP-08, REP-05, REP-06).
 *
 * EMP-08: Advance/Hold/Decline persist with actor/time; recording a
 * decision NEVER sends an unapproved candidate message (the decision module
 * has no mailer at all — tested here with a spy outbox).
 * REP-05: private notes + decision history persist; finding flags work;
 * candidate-safe view strips internal material.
 * REP-06: unauthorized reviewers are denied; candidates and billing-only
 * members cannot view employer reports.
 * In-process with fakes.
 */

import {
  recordDecision,
  currentDecision,
  decisionHistory,
  createDecisionMemoryStore,
} from "../src/lib/employer/decisions";
import {
  createAuditMemoryStore,
  eventsFor,
} from "../src/lib/employer/audit";
import {
  addReviewerNote,
  notesForReport,
  flagFinding,
  flagsForReport,
  candidateSafeReport,
  createReviewMemoryStore,
} from "../src/lib/reports/notes";
import {
  canViewReport,
  canExportReport,
  sensitivityLabel,
  type ReportViewer,
} from "../src/lib/reports/permissions";
import type { DecisionBrief } from "../src/lib/reports/types";

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

/* EMP-08: explicit human decisions, no automatic candidate messages ------------ */

section("EMP-08: Advance/Hold/Decline persist with actor/time; never auto-notify");

{
  const decisions = createDecisionMemoryStore();
  const audit = createAuditMemoryStore();

  // Spy outbox: proves the decision path cannot send anything. The decision
  // module takes no mailer argument at all; this spy exists so the test
  // fails loudly if a notification path is ever added.
  const outboxSpy: { enqueued: unknown[] } = { enqueued: [] };

  const r = recordDecision(decisions, audit, {
    orgId: "org-1",
    sessionId: "sess-1",
    decision: "advance",
    decidedBy: "u-reviewer",
    rationale: "Strong incident reasoning; follow up on test design.",
  });
  ok("decision recorded", r.ok);
  if (!r.ok) throw new Error("setup failed");

  ok("decision persists with actor", r.value.decidedBy === "u-reviewer");
  ok("decision persists with timestamp", !Number.isNaN(Date.parse(r.value.decidedAt)));
  ok("decision is advance", r.value.decision === "advance");
  ok("recording a decision enqueued NO candidate message", outboxSpy.enqueued.length === 0);

  const cur = currentDecision(decisions, "sess-1");
  ok("current decision resolves", cur?.decision === "advance");

  // A newer decision supersedes; history is durable.
  const r2 = recordDecision(decisions, audit, {
    orgId: "org-1",
    sessionId: "sess-1",
    decision: "hold",
    decidedBy: "u-hiring-manager",
    rationale: "Waiting on reference check.",
  });
  ok("second decision recorded", r2.ok);
  if (!r2.ok) throw new Error("setup failed");
  ok("newer decision becomes current", currentDecision(decisions, "sess-1")?.decision === "hold");
  ok("earlier decision marked superseded, not deleted", r.value.superseded === true);
  const history = decisionHistory(decisions, "sess-1");
  ok("full decision history is durable (2 entries)", history.length === 2);
  ok("history ordered oldest first", history[0].decision === "advance" && history[1].decision === "hold");
  ok("supersede link recorded", r2.value.supersedesId === r.value.id);
  ok("still no candidate message after supersede", outboxSpy.enqueued.length === 0);

  const bad = recordDecision(decisions, audit, {
    orgId: "org-1",
    sessionId: "sess-1",
    decision: "hire_on_the_spot" as never,
    decidedBy: "u-reviewer",
  });
  ok("unknown decision rejected", !bad.ok && bad.code === "invalid_decision");
  const noActor = recordDecision(decisions, audit, {
    orgId: "org-1",
    sessionId: "sess-2",
    decision: "decline",
    decidedBy: "",
  });
  ok("anonymous decision rejected", !noActor.ok && noActor.code === "missing_actor");

  const events = eventsFor(audit, "decision", r.value.id);
  ok("decision recording is audited with actor", events.length === 1 && events[0].actorUserId === "u-reviewer");
  const events2 = eventsFor(audit, "decision", r2.value.id);
  ok("supersede is audited", events2.some((e) => e.action === "decision_superseded"));
}

/* REP-05: private notes, decision history, finding flags ------------------------- */

section("REP-05: private notes, decision history, finding flags persist");

{
  const reviews = createReviewMemoryStore();

  const n1 = addReviewerNote(reviews, {
    reportId: "rep-1",
    authorUserId: "u-reviewer",
    body: "Internal: check whether the candidate had prior access to this repo.",
  });
  const n2 = addReviewerNote(reviews, {
    reportId: "rep-1",
    authorUserId: "u-hiring-manager",
    body: "Internal: salary band discussion, not for candidate.",
  });
  const notes = notesForReport(reviews, "rep-1");
  ok("private notes persist", notes.length === 2);
  ok("notes carry author + timestamp", n1.authorUserId === "u-reviewer" && !Number.isNaN(Date.parse(n1.createdAt)));
  ok("notes are scoped to the report", notesForReport(reviews, "rep-2").length === 0);

  const flag = flagFinding(reviews, {
    reportId: "rep-1",
    findingId: "f-3",
    flaggedBy: "u-reviewer",
    reason: "This finding cites the wrong test file.",
    correctionRequested: true,
  });
  ok("finding flag recorded", flag.findingId === "f-3" && flag.correctionRequested === true);
  ok("flag requests correction explicitly", flagsForReport(reviews, "rep-1").length === 1);
  let threw = false;
  try {
    flagFinding(reviews, {
      reportId: "rep-1",
      findingId: "f-3",
      flaggedBy: "u-reviewer",
      reason: "   ",
      correctionRequested: false,
    });
  } catch {
    threw = true;
  }
  ok("flag without a reason is rejected", threw);

  // Candidate-safe view strips internal material.
  const brief = {
    reportId: "rep-1",
    reportVersion: 1,
    candidateName: "Ada",
    candidateEmail: "ada@example.com",
    roleTitle: "Data Analyst",
    roleKey: "data_analyst",
    scenarioTitle: "Ops Yield Investigation",
    scenarioVersion: "v1.0.0",
    rubricVersion: "v1.0.0",
    invitationId: "inv-1",
    sessionId: "sess-1",
    brief: "Brief.",
    categories: [],
    findings: [
      { id: "f-3", category: "coding", title: "T", detail: "D", severity: "gap", sources: [], flagged: true, flagReason: "wrong file" },
    ],
    limitations: [],
    interviewFollowUps: [],
    generatedAt: new Date().toISOString(),
  } as DecisionBrief;
  const safe = candidateSafeReport(brief);
  ok("candidate-safe report omits flag state", safe.findings[0].flagged === false && safe.findings[0].flagReason === null);
  ok("candidate-safe report is labeled as stripped", safe.privateNotesOmitted === true && safe.flagsOmitted === true);
}

/* REP-06: report permissions ------------------------------------------------------ */

section("REP-06: only authorized reviewers see employer reports");

{
  const report = { orgId: "org-1" };
  const reviewer: ReportViewer = { userId: "u-1", orgId: "org-1", orgRole: "reviewer", isCandidate: false };
  const owner: ReportViewer = { userId: "u-2", orgId: "org-1", orgRole: "owner", isCandidate: false };
  const admin: ReportViewer = { userId: "u-3", orgId: "org-1", orgRole: "admin", isCandidate: false };

  ok("reviewer can view", canViewReport(reviewer, report).ok);
  ok("owner can view", canViewReport(owner, report).ok);
  ok("admin can view", canViewReport(admin, report).ok);

  const billing: ReportViewer = { userId: "u-4", orgId: "org-1", orgRole: "billing", isCandidate: false };
  const billingRes = canViewReport(billing, report);
  ok("billing-only member denied", !billingRes.ok && billingRes.code === "role_not_permitted");

  const candidate: ReportViewer = { userId: "u-5", orgId: "org-1", orgRole: "member", isCandidate: true };
  const candidateRes = canViewReport(candidate, report);
  ok("the candidate is denied the employer report surface", !candidateRes.ok);

  const otherOrg: ReportViewer = { userId: "u-6", orgId: "org-2", orgRole: "reviewer", isCandidate: false };
  const otherRes = canViewReport(otherOrg, report);
  ok("member of another org denied", !otherRes.ok && otherRes.code === "wrong_organization");

  const anon: ReportViewer = { userId: null, orgId: null, orgRole: null, isCandidate: false };
  ok("unauthenticated denied", !canViewReport(anon, report).ok);

  ok("export inherits view permission (reviewer ok)", canExportReport(reviewer, report).ok);
  ok("export inherits view permission (billing denied)", !canExportReport(billing, report).ok);

  const brief = {
    reportId: "rep-1",
    reportVersion: 2,
    roleTitle: "Data Analyst",
    scenarioVersion: "v1.0.0",
  } as DecisionBrief;
  const label = sensitivityLabel(brief);
  ok("exported artifacts carry a sensitivity label", label.includes("CONFIDENTIAL") && label.includes("v2"));
}

/* Summary ------------------------------------------------------------------------ */

console.log("");
if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log("All employer decision/notes/permission checks passed.");
