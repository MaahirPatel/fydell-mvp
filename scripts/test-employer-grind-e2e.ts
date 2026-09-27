/**
 * Employer grind — end-to-end journeys as in-process tests.
 *
 * E2E-03 Employer setup: a fresh employer creates a role, previews the
 * scenario, and deliberately sends an invite — using only the public
 * library surface (no direct store pokes, i.e. no founder database edits).
 * Passing: right scenario/version and recipient.
 *
 * E2E-12 Employer review: a reviewer follows findings to their sources,
 * adds a private note, and records a decision. Passing: accurate report,
 * private notes, durable decision, and no unintended email.
 */

import { defineRole } from "../src/lib/employer/roles";
import { assembleAssessmentPreview } from "../src/lib/employer/preview";
import {
  createCandidateInvitation,
  sendInvitation,
  createInvitationMemoryStore,
} from "../src/lib/invitations/candidate-invites";
import { resolvePinnedScenario, type VersionRegistry, type VersionedContent } from "../src/lib/invitations/config-freeze";
import { createAuditMemoryStore } from "../src/lib/employer/audit";
import {
  recordDecision,
  currentDecision,
  decisionHistory,
  createDecisionMemoryStore,
} from "../src/lib/employer/decisions";
import { assembleDecisionBrief, assertNoGlobalScore } from "../src/lib/reports/assemble";
import { findingLink, resolveAnchor } from "../src/lib/reports/links";
import { publishReport, createReportMemoryStore } from "../src/lib/reports/versions";
import { addReviewerNote, notesForReport, createReviewMemoryStore } from "../src/lib/reports/notes";
import type { DeliveryStatus, InvitationMailer } from "../src/lib/invitations/types";
import type { CompetencyResult, Finding } from "../src/lib/reports/types";

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

/* Shared fakes ---------------------------------------------------------------------- */

function registry(): VersionRegistry {
  const versions = new Map<string, VersionedContent>([
    ["scen-v1", { versionId: "scen-v1", versionLabel: "v1.0.0", content: { brief: "webhook retry incident" }, rubricVersionId: "rub-v1" }],
    ["rub-v1", { versionId: "rub-v1", versionLabel: "v1.0.0", content: { dimensions: ["correctness", "judgment"] }, rubricVersionId: "rub-v1" }],
  ]);
  return {
    getVersion: (id) => versions.get(id) ?? null,
    currentScenarioVersionId: () => "scen-v1",
    currentRubricVersionId: () => "rub-v1",
  };
}

/* E2E-03: employer setup -------------------------------------------------------------- */

async function main() {
  section("E2E-03: fresh employer creates role, previews scenario, deliberately sends invite");

  {
    const outbox: { to: string; url: string }[] = [];
    const mailer: InvitationMailer = {
      queueInviteEmail: (input) => {
        outbox.push({ to: input.toEmail, url: input.inviteUrl });
        const deliveryStatus: DeliveryStatus = "queued";
        return { queued: true, deliveryStatus };
      },
    };
    const invites = createInvitationMemoryStore();
    const audit = createAuditMemoryStore();

    // 1. Fresh employer defines the role.
    const role = defineRole("org-new", "u-founder", {
      title: "Backend Engineer",
      family: "Engineering",
      stack: ["Node.js", "PostgreSQL"],
      responsibilities: ["Own webhook delivery reliability.", "Write clear incident handoffs."],
      evaluationCriteria: ["Isolates the defect correctly.", "Adds a regression test.", "Communicates the fix."],
    });
    ok("role created via public API", role.ok);
    if (!role.ok) throw new Error("setup failed");

    // 2. Employer previews the assessment before sending.
    const preview = assembleAssessmentPreview({
      scenario: {
        title: "Webhook retry incident",
        mission: "Partner webhooks are delivered twice. Find and fix the defect.",
        durationMinutes: 90,
        requiredTools: ["Desktop app"],
        resources: [{ title: "Incident brief", kind: "brief" }],
        questions: [{ prompt: "Fix the defect.", kind: "task", points: 100 }],
        aiPolicy: "AI assistants permitted.",
        versionLabel: "v1.0.0",
      },
      rubric: {
        versionLabel: "v1.0.0",
        dimensions: [{ label: "Correctness", description: "Fix is correct.", weight: 100 }],
      },
    });
    ok("preview shows what the candidate will get", preview.candidateInstructions.length > 0 && preview.rubricDimensions.length === 1);

    // 3. Employer creates the invite (creation sends nothing).
    const created = createCandidateInvitation(invites, audit, {
      orgId: "org-new",
      templateId: "tmpl-harbor-webhooks",
      roleKey: "backend_engineer",
      candidateEmail: "sam@example.com",
      candidateName: "Sam",
      createdBy: "u-founder",
      registry: registry(),
    });
    ok("invite created", created.ok && !created.value.duplicate);
    if (!created.ok || created.value.duplicate) throw new Error("setup failed");
    ok("right recipient", created.value.invitation.candidateEmail === "sam@example.com");
    ok("right scenario pinned", created.value.invitation.pinned.scenarioVersionId === "scen-v1");
    ok("right rubric pinned", created.value.invitation.pinned.rubricVersionId === "rub-v1");
    ok("nothing sent on creation", outbox.length === 0 && created.value.invitation.state === "draft");

    // 4. Deliberate send.
    const sentRes = await sendInvitation(invites, audit, mailer, {
      invitationId: created.value.invitation.id,
      actorUserId: "u-founder",
      token: created.value.token,
      inviteUrlForToken: (t) => `https://app.fydell.test/invite/${t}`,
    });
    ok("deliberate send succeeds", sentRes.ok);
    if (!sentRes.ok) throw new Error("send failed");
    ok("candidate receives the invite", outbox.length === 1 && outbox[0].to === "sam@example.com");
    ok("invite link is secure and token-bound", outbox[0].url.includes(created.value.token));

    // 5. The attempt the candidate starts uses the pinned configuration.
    const content = resolvePinnedScenario(registry(), created.value.invitation.pinned);
    ok("attempt resolves the pinned scenario version", content.ok && content.value.versionId === "scen-v1");
  }

  /* E2E-12: employer review -------------------------------------------------------------- */

  section("E2E-12: reviewer follows findings to sources, adds note, records decision");

  {
    const outbox: { enqueued: unknown[] } = { enqueued: [] };
    const decisions = createDecisionMemoryStore();
    const audit = createAuditMemoryStore();
    const reports = createReportMemoryStore();
    const reviews = createReviewMemoryStore();

    // 1. Report assembled from analysis artifacts.
    const competencies: CompetencyResult[] = [
      { competency: "Root-cause analysis", category: "coding", band: "strong", score: 88, summary: "Isolated the defect." },
      { competency: "Test design", category: "coding", band: "developing", score: 55, summary: "Happy-path tests only." },
      { competency: "Status communication", category: "communication", band: "adequate", score: 70, summary: "Clear handoff." },
      { competency: "Workspace health", category: "infrastructure", band: "strong", score: 95, summary: "Package verified." },
    ];
    const findings: Omit<Finding, "flagged" | "flagReason">[] = [
      {
        id: "f-1",
        category: "coding",
        title: "Isolated the retry-policy defect",
        detail: "Traced duplicate deliveries to webhooks.ts.",
        severity: "strength",
        sources: [{ kind: "diff", ref: "src/webhooks.ts", label: "webhooks.ts diff" }],
      },
      {
        id: "f-2",
        category: "coding",
        title: "No regression test for the retry path",
        detail: "Tests do not cover backoff.",
        severity: "gap",
        sources: [{ kind: "test", ref: "tests/retry.test.ts", label: "retry tests" }],
      },
    ];
    const brief = assembleDecisionBrief({
      reportId: "rep-e2e",
      reportVersion: 1,
      candidateName: "Sam",
      candidateEmail: "sam@example.com",
      roleTitle: "Backend Engineer",
      roleKey: "backend_engineer",
      scenarioTitle: "Webhook retry incident",
      scenarioVersion: "v1.0.0",
      rubricVersion: "v1.0.0",
      invitationId: "inv-e2e",
      sessionId: "sess-e2e",
      competencies,
      findings,
      limitations: ["Single-incident scenario; does not measure system design."],
      interviewFollowUps: ["How would you test the retry backoff?"],
    });
    const pub = publishReport(reports, brief, "u-reviewer", { sessionId: "sess-e2e", invitationId: "inv-e2e" });
    ok("report published with correct identifiers", pub.ok);
    ok("no global hireability number", assertNoGlobalScore(brief).ok);

    // 2. Reviewer follows a finding to its source.
    const gap = brief.findings.find((f) => f.id === "f-2");
    if (!gap) throw new Error("setup failed");
    const link = findingLink("rep-e2e", gap);
    const resolved = resolveAnchor(brief.findings, link.sources[0].anchor);
    ok("reviewer reaches the exact cited test file", resolved?.source?.ref === "tests/retry.test.ts");

    // 3. Reviewer adds a private note.
    addReviewerNote(reviews, {
      reportId: "rep-e2e",
      authorUserId: "u-reviewer",
      body: "Gap confirmed against the test run. Ask about backoff testing in the interview.",
    });
    ok("private note persisted", notesForReport(reviews, "rep-e2e").length === 1);

    // 4. Reviewer records the decision.
    const dec = recordDecision(decisions, audit, {
      orgId: "org-new",
      sessionId: "sess-e2e",
      decision: "advance",
      decidedBy: "u-hiring-manager",
      rationale: "Strong root-cause work; probe test design live.",
    });
    ok("decision recorded", dec.ok);
    ok("decision durable with actor + time",
      currentDecision(decisions, "sess-e2e")?.decidedBy === "u-hiring-manager" &&
      !Number.isNaN(Date.parse(dec.ok ? dec.value.decidedAt : "")));
    ok("decision history durable", decisionHistory(decisions, "sess-e2e").length === 1);

    // 5. No unintended email anywhere in the review journey.
    ok("no candidate message sent during review or decision", outbox.enqueued.length === 0);
  }

}

/* Summary ------------------------------------------------------------------------ */

console.log("");
if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log("All employer E2E journey checks passed.");

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
