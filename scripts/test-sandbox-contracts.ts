/**
 * Credential-free sandbox contracts.
 * Run: npx tsx scripts/test-sandbox-contracts.ts
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";
import { createHash } from "crypto";
import {
  ACME_ROLLOUT_FIXTURE,
  APPLIED_AI_FIXTURE_VERSION,
  APPLIED_AI_REQUIRED_EVENT_ORDER,
  APPLIED_AI_WORKFLOW_FIXTURE,
  canTransition,
  createWorldState,
  nextWorldState,
  parseWorldState,
  parseEventContract,
  analyzePassA,
  analyzePassB,
  canonicalize,
  scriptedReviewLabel,
  visitorReviewLabel,
  readSandboxAvailability,
  SANDBOX_STEPS,
  SANDBOX_EVENT_TYPES,
  streamForEventType,
  createAppliedAiWorkspace,
  evaluateAppliedAiWorkspace,
  candidateLoopMissing,
  releaseLatencyFactOnce,
  APPLIED_AI_RECEIPT_FORMAT_VERSION,
  buildAppliedAiReceiptPayload,
  claimReviewAuditDraft,
  projectClaimEventIds,
  reviewStatusFor,
  shouldPublishBrief,
} from "../src/lib/sim-engine/proof/sandbox/index";
import { sandboxCredentialStatus } from "../src/lib/sim-engine/proof/sandbox/credentials";
import type { RunSnapshot } from "../src/lib/sim-engine/proof/types";

let failures = 0;
function ok(name: string, condition: boolean, detail = "") {
  if (condition) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    failures += 1;
  }
}

const hash = "a".repeat(64);
const expiresAt = new Date(Date.now() + 60_000).toISOString();
const base = createWorldState({
  ownerCapabilityHash: hash,
  createdFromIpHash: "a".repeat(32),
  expiresAt,
});

console.log("\nWorld state");
ok("new runs use schemaVersion 2", base.schemaVersion === 2);
ok("new runs use Applied AI fixture v2", base.fixtureVersion === APPLIED_AI_FIXTURE_VERSION);
ok("revision starts at 0", base.revision === 0);
try {
  parseWorldState({ ...base, ownerCapabilityHash: "short" });
  ok("rejects short capability hash", false);
} catch {
  ok("rejects short capability hash", true);
}
try {
  parseWorldState({ ...base, extra: true });
  ok("rejects unknown fields", false);
} catch {
  ok("rejects unknown fields", true);
}
const bumped = nextWorldState(base, { currentStep: "active" });
ok("revision is monotonic", bumped.revision === 1);
ok("does not silent-default environment", base.environment === "sandbox");
ok("outcome starts empty", base.interviewFinding === null && base.hiringOutcome === null);
const legacyParsed = parseWorldState({
  schemaVersion: 1,
  environment: "sandbox",
  fixtureVersion: "acme-rollout-v1",
  ownerCapabilityHash: hash,
  currentStep: "active",
  revision: 3,
  expiresAt,
  resetAt: null,
  createdFromIpHash: "a".repeat(32),
  cleanupStatus: "ok",
  constraintDelivered: false,
  reviewKind: "none",
  reviewDecision: null,
  receiptPublicId: null,
  receiptIntegrityHash: null,
  interviewFinding: null,
  hiringOutcome: null,
  lastIdempotencyKey: null,
  seenIdempotencyKeys: [],
});
ok("legacy world state remains readable", legacyParsed.schemaVersion === 2 && legacyParsed.fixtureVersion === "acme-rollout-v1");

console.log("\nState machine");
ok("invited to active", canTransition("invited", "active"));
ok("defense before pass A is illegal", canTransition("active", "defense_ready") === false);
ok("pass A then defense", canTransition("pass_a_processing", "defense_ready"));
ok("ten steps", SANDBOX_STEPS.length === 10);

console.log("\nEvents");
const payload = {
  stream: "candidate_work",
  event_type: "DECISION_COMMITTED",
  correlation_id: "c",
  idempotency_key: "k",
  payload_version: 1,
  payload: {},
};
ok("parses event contract", parseEventContract(payload).stream === "candidate_work");
ok(
  "outcome stays in review stream",
  SANDBOX_EVENT_TYPES.includes("OUTCOME_RECORDED") &&
    streamForEventType("OUTCOME_RECORDED") === "review",
);
try {
  parseEventContract({ ...payload, stream: "mystery" });
  ok("rejects unknown stream", false);
} catch {
  ok("rejects unknown stream", true);
}

console.log("\nFixture");
ok("single fixture version", ACME_ROLLOUT_FIXTURE.fixtureVersion === "acme-rollout-v1");
ok("historical SE fixture remains unchanged", ACME_ROLLOUT_FIXTURE.role.slug === "solutions-engineer");
ok("Applied AI has a separate fixture identity", APPLIED_AI_WORKFLOW_FIXTURE.fixtureVersion === APPLIED_AI_FIXTURE_VERSION);
ok("Applied AI targets PR-AI requirements", APPLIED_AI_WORKFLOW_FIXTURE.requirements.every((item) => item.id.startsWith("PR-AI-")));
ok("defense question is not STAR", !/tell me about a time/i.test(ACME_ROLLOUT_FIXTURE.defenseQuestion.prompt));
ok(
  "sandbox uses four stable Candidate IDs",
  ACME_ROLLOUT_FIXTURE.candidates.map((candidate) => candidate.label).join(",") ===
    "Candidate 01,Candidate 02,Candidate 03,Candidate 04",
);

console.log("\nApplied AI evaluator");
const baselineWorkspace = createAppliedAiWorkspace();
const baselineEvaluation = evaluateAppliedAiWorkspace(baselineWorkspace);
const revisedEvaluation = evaluateAppliedAiWorkspace({
  ...baselineWorkspace,
  config: {
    ...baselineWorkspace.config,
    routing: "deterministic",
    model: "fast",
    modelCalls: 1,
    contextTokens: 4000,
    retryMode: "transient_only",
    semanticValidation: true,
    idempotencyKey: true,
    humanReviewOnMissingInfo: true,
  },
  evalCases: [
    ...baselineWorkspace.evalCases,
    { id: "candidate-critical", title: "Candidate critical regression", slice: "critical_authorization", enabled: true },
  ],
});
ok("config mutation changes evaluator hash", baselineEvaluation.workspaceHash !== revisedEvaluation.workspaceHash);
ok("fixture baseline quality is calibrated", baselineEvaluation.quality === 78);
ok("fixture baseline latency is calibrated", baselineEvaluation.p50LatencySeconds === 6.2 && baselineEvaluation.p95LatencySeconds === 10.8);
ok("fixture baseline cost is calibrated", baselineEvaluation.estimatedCostDollars === 0.18);
ok("config mutation changes quality", baselineEvaluation.quality !== revisedEvaluation.quality);
ok("config mutation changes critical-slice quality", baselineEvaluation.criticalSliceQuality !== revisedEvaluation.criticalSliceQuality);
ok("config mutation changes p50", baselineEvaluation.p50LatencySeconds !== revisedEvaluation.p50LatencySeconds);
ok("config mutation changes p95", baselineEvaluation.p95LatencySeconds !== revisedEvaluation.p95LatencySeconds);
ok("config mutation changes cost", baselineEvaluation.estimatedCostDollars !== revisedEvaluation.estimatedCostDollars);
ok("config mutation changes schema failures", baselineEvaluation.schemaFailureRate !== revisedEvaluation.schemaFailureRate);
ok("config mutation changes semantic failures", baselineEvaluation.semanticFailureRate !== revisedEvaluation.semanticFailureRate);
ok("config mutation changes duplicate side effects", baselineEvaluation.duplicateSideEffectRate !== revisedEvaluation.duplicateSideEffectRate);
ok("critical slice remains separately visible", revisedEvaluation.criticalSliceQuality !== revisedEvaluation.quality);

console.log("\nCandidate loop");
ok("fact is hidden initially", !base.progress.factReleased && !base.constraintDelivered);
const firstRelease = releaseLatencyFactOnce([]);
const secondRelease = releaseLatencyFactOnce(firstRelease);
ok("LATENCY_001 releases once", firstRelease.length === 1 && secondRelease.length === 1);
ok("event contract specifies required ordering", APPLIED_AI_REQUIRED_EVENT_ORDER[0] === "RESOURCE_OPENED" && APPLIED_AI_REQUIRED_EVENT_ORDER[6] === "FACT_RELEASED:LATENCY_001");
ok(
  "required actions report missing work",
  candidateLoopMissing(base.progress).includes("baseline EVAL_RUN") &&
    candidateLoopMissing(base.progress).includes("SUBMISSION_COMPLETED"),
);
ok(
  "sandbox fixture has no synthetic person names",
  !JSON.stringify(ACME_ROLLOUT_FIXTURE.candidates).includes("displayName"),
);

console.log("\nAnalysis");
const snapshot: RunSnapshot = {
  run_id: "test",
  stage: "FINAL_SUBMITTED",
  released_facts: ["SECURITY_REVIEW_001"],
  artifact: {
    diagnosis: ACME_ROLLOUT_FIXTURE.discoveryNotes,
    recommendation: ACME_ROLLOUT_FIXTURE.revisedRecommendation,
    customer_message: ACME_ROLLOUT_FIXTURE.customerEmailRevised,
    internal_note: ACME_ROLLOUT_FIXTURE.architectureBrief,
    assumptions: ACME_ROLLOUT_FIXTURE.assumptions,
    limitations: "",
  },
  events: [
    {
      id: "e1",
      run_id: "test",
      sequence: 1,
      event_type: "DECISION_COMMITTED",
      event_version: 1,
      source: "CANDIDATE",
      actor_type: "candidate",
      actor_id: null,
      stage_id: null,
      occurred_at: null,
      recorded_at: expiresAt,
      payload: {},
    },
    {
      id: "e2",
      run_id: "test",
      sequence: 2,
      event_type: "FACT_RELEASED",
      event_version: 1,
      source: "WORLD",
      actor_type: "world",
      actor_id: null,
      stage_id: null,
      occurred_at: null,
      recorded_at: expiresAt,
      payload: { fact_id: "SECURITY_REVIEW_001" },
    },
  ],
  defense: [{ prompt: ACME_ROLLOUT_FIXTURE.defenseQuestion.prompt, response: ACME_ROLLOUT_FIXTURE.fixtureDefenseAnswer }],
};
const passA = analyzePassA(snapshot);
ok("pass A produces a defense question", passA.defensePrompt === ACME_ROLLOUT_FIXTURE.defenseQuestion.prompt);
ok("pass A keeps counterevidence slot", passA.claims.some((c) => c.competency === "Discovery judgment"));
const passB = analyzePassB(snapshot);
ok("pass B does not recommend Strong interview", passB.brief.recommendation !== "STRONG_INTERVIEW");
ok("pass B preserves concern about WAU", passB.claims.some((c) => c.competency === "Discovery judgment"));

console.log("\nReview honesty");
ok("scripted label", scriptedReviewLabel().disclaimer.includes("fictional sandbox"));
ok("visitor label", visitorReviewLabel("approve").label === "Reviewed by sandbox visitor");
ok("never human reviewer copy", !scriptedReviewLabel().label.toLowerCase().includes("human reviewer"));
ok("approve publishes claims", reviewStatusFor("approve", true) === "PUBLISHED");
ok("limit is reviewed but not approved", reviewStatusFor("limit", true) === "REVIEWED");
ok("follow-up is reviewed but not approved", reviewStatusFor("follow_up", true) === "REVIEWED");
ok("reject maps to rejected", reviewStatusFor("reject", true) === "REJECTED");
ok("only approve publishes brief", shouldPublishBrief(visitorReviewLabel("approve")) && !shouldPublishBrief(visitorReviewLabel("limit")));
const reviewAudit = claimReviewAuditDraft({
  claimId: "claim-1",
  beforeStatus: "REVIEW_REQUIRED",
  record: visitorReviewLabel("limit"),
});
ok(
  "append-only review audit shape records reviewer action reason and before/after",
  reviewAudit.claim_id === "claim-1" &&
    reviewAudit.reviewer === "sandbox_visitor" &&
    reviewAudit.action === "limit" &&
    reviewAudit.reason.length > 0 &&
    reviewAudit.before.review_status === "REVIEW_REQUIRED" &&
    reviewAudit.after.review_status === "REVIEWED",
);
ok(
  "scripted audit remains explicitly non-human",
  claimReviewAuditDraft({
    claimId: "claim-2",
    beforeStatus: "REVIEW_REQUIRED",
    record: scriptedReviewLabel(),
  }).reviewer === "scripted_sandbox",
);

console.log("\nEvidence lineage");
const lineage = projectClaimEventIds([
  { event_id: "e-support-2", relation: "supporting" },
  { event_id: "e-counter", relation: "counterevidence" },
  { event_id: "e-support-1", relation: "supporting" },
]);
ok(
  "claim-event projection retains support and counterevidence separately",
  lineage.supportingEventIds.join(",") === "e-support-1,e-support-2" &&
    lineage.counterevidenceEventIds.join(",") === "e-counter",
);

console.log("\nReceipt integrity hash");
const { canonical } = canonicalize({ publicId: "p", items: ["a"] });
ok("canonical JSON is stable", canonicalize({ items: ["a"], publicId: "p" }).canonical === canonical);
const receiptPayload = buildAppliedAiReceiptPayload({
  fixtureVersion: APPLIED_AI_FIXTURE_VERSION,
  completedWork: ["Ran baseline evaluation"],
  baseline: baselineEvaluation,
  postFact: revisedEvaluation,
  factReleased: true,
  defenseQuestionExists: true,
  defenseResponseExists: true,
  claims: [{
    id: "claim-1",
    requirementId: "PR-AI-04",
    direction: "STRENGTH",
    summary: "Measured evaluation work.",
    reviewStatus: "PUBLISHED",
    supportingEventIds: ["e-support"],
    counterevidenceEventIds: [],
  }],
  sourceEventIds: ["e-support", "e-review"],
  review: visitorReviewLabel("approve"),
  conditions: ["Fictional candidate and employer"],
});
const receiptCanonical = canonicalize({ ...receiptPayload }).canonical;
const receiptHash = createHash("sha256").update(receiptCanonical).digest("hex");
ok("receipt format is versioned", receiptPayload.formatVersion === APPLIED_AI_RECEIPT_FORMAT_VERSION);
ok(
  "receipt carries targeted requirements and LATENCY_001",
  receiptPayload.targetRequirementIds.length === 4 && receiptPayload.changedFact.id === "LATENCY_001",
);
ok(
  "receipt names integrity limitations honestly",
  receiptPayload.integrityNotice.includes("not an independent credential") &&
    receiptPayload.limitations.some((item) => item.includes("tamper-proof")),
);
ok(
  "receipt canonical hash is stable",
  createHash("sha256")
    .update(canonicalize({ ...receiptPayload }).canonical)
    .digest("hex") === receiptHash,
);

console.log("\nKill switch");
const devUrl = "https://btbmvrvynnrhapjdkunz.supabase.co";
const prodUrl = "https://qtrhwrcxthtqvkeerptp.supabase.co";
const devKey = "sb_secret_abcdefghijklmnopqrstuv";

const off = readSandboxAvailability({} as NodeJS.ProcessEnv);
ok("fails closed when disabled", off.enabled === false && off.reason === "disabled");

// A production deployment must still be able to host the sandbox, provided the
// sandbox has its own fydell-dev credentials.
const onProdHost = readSandboxAvailability({
  FYDELL_SANDBOX_ENABLED: "true",
  FYDELL_DEV_PROJECT_REF: "btbmvrvynnrhapjdkunz",
  FYDELL_SANDBOX_FIXTURE_VERSION: APPLIED_AI_FIXTURE_VERSION,
  NEXT_PUBLIC_SUPABASE_URL: prodUrl,
  SUPABASE_SERVICE_ROLE_KEY: devKey,
  FYDELL_SANDBOX_SUPABASE_URL: devUrl,
  FYDELL_SANDBOX_SUPABASE_SERVICE_ROLE_KEY: devKey,
} as NodeJS.ProcessEnv);
ok("enabled on a production host with dev sandbox credentials", onProdHost.enabled === true);

// Without dedicated credentials, a production deployment must refuse.
const noCreds = readSandboxAvailability({
  FYDELL_SANDBOX_ENABLED: "true",
  FYDELL_DEV_PROJECT_REF: "btbmvrvynnrhapjdkunz",
  FYDELL_SANDBOX_FIXTURE_VERSION: APPLIED_AI_FIXTURE_VERSION,
  NEXT_PUBLIC_SUPABASE_URL: prodUrl,
  SUPABASE_SERVICE_ROLE_KEY: devKey,
} as NodeJS.ProcessEnv);
ok("refuses production host without sandbox credentials", noCreds.enabled === false && noCreds.reason === "missing_credentials");

// Sandbox credentials pointed anywhere but fydell-dev must refuse.
const wrongProject = readSandboxAvailability({
  FYDELL_SANDBOX_ENABLED: "true",
  FYDELL_DEV_PROJECT_REF: "btbmvrvynnrhapjdkunz",
  FYDELL_SANDBOX_FIXTURE_VERSION: APPLIED_AI_FIXTURE_VERSION,
  FYDELL_SANDBOX_SUPABASE_URL: prodUrl,
  FYDELL_SANDBOX_SUPABASE_SERVICE_ROLE_KEY: devKey,
} as NodeJS.ProcessEnv);
ok("refuses sandbox credentials aimed at production", wrongProject.enabled === false && wrongProject.reason === "project_mismatch");

// The app-wide pair is accepted only when it already names fydell-dev.
const devDeployment = readSandboxAvailability({
  FYDELL_SANDBOX_ENABLED: "true",
  FYDELL_DEV_PROJECT_REF: "btbmvrvynnrhapjdkunz",
  FYDELL_SANDBOX_FIXTURE_VERSION: APPLIED_AI_FIXTURE_VERSION,
  NEXT_PUBLIC_SUPABASE_URL: devUrl,
  SUPABASE_SERVICE_ROLE_KEY: devKey,
} as NodeJS.ProcessEnv);
ok("a fydell-dev deployment needs no extra configuration", devDeployment.enabled === true);

ok(
  "credential resolver rejects a production URL",
  sandboxCredentialStatus({
    FYDELL_SANDBOX_SUPABASE_URL: prodUrl,
    FYDELL_SANDBOX_SUPABASE_SERVICE_ROLE_KEY: devKey,
  } as NodeJS.ProcessEnv).status === "sandbox_project_mismatch",
);

console.log("\nClient must not query proof tables");
const forbidden = [".from(\"proof_", ".from('proof_", ".from(\"work_receipts", ".from('work_receipts", ".from(\"receipt_versions", ".from('receipt_versions"];
const clientHits: string[] = [];
function walk(dir: string) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(full);
    } else if (/\.(ts|tsx)$/.test(name)) {
      const text = readFileSync(full, "utf8");
      if (!text.includes('"use client"') && !text.includes("'use client'")) continue;
      if (forbidden.some((needle) => text.includes(needle))) clientHits.push(full);
    }
  }
}
walk(resolve("src"));
ok("no client proof/receipt table access", clientHits.length === 0, clientHits.join(", "));

console.log("\nSandbox boundary");
const sandboxSourceRoots = [
  resolve("src/app/api/sandbox"),
  resolve("src/lib/sim-engine/proof/sandbox"),
  resolve("src/components/sandbox"),
];
const sandboxSource = sandboxSourceRoots
  .flatMap((root) => {
    const files: string[] = [];
    const collect = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) collect(full);
        else if (/\.(ts|tsx)$/.test(name)) files.push(full);
      }
    };
    collect(root);
    return files;
  })
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");
ok("sandbox does not call production sim APIs", !sandboxSource.includes("/api/sim/"));
ok("sandbox does not import WorkbenchRunner", !sandboxSource.includes("WorkbenchRunner"));
ok("sandbox does not write sim_session_events", !sandboxSource.includes("sim_session_events"));
ok(
  "sandbox does not send candidate email",
  !/\b(resend|sendEmail|sendInvitationEmail)\b/.test(sandboxSource),
);
ok(
  "demo receipt remains explicitly labelled",
  sandboxSource.includes("Demo Work Receipt") &&
    /not valid for employment verification/i.test(sandboxSource),
);
const appliedAiEvidenceSource = readFileSync(resolve("src/components/sandbox/SandboxEvidence.tsx"), "utf8");
const appliedAiReceiptSource = readFileSync(resolve("src/components/sandbox/SandboxWorkReceipt.tsx"), "utf8");
ok(
  "Applied AI evidence and receipt contain no static Solutions Engineer copy",
  !/Solutions Engineer|Acme rollout|SAMPLE_/.test(`${appliedAiEvidenceSource}\n${appliedAiReceiptSource}`),
);

console.log("\nActive sandbox shell copy");

/**
 * The modules the sandbox routes actually render. Orphaned historical fixture
 * modules stay on disk for backward compatibility and are deliberately not
 * listed, so this assertion tracks what a visitor can see.
 */
const activeSandboxShellFiles = [
  "src/components/sandbox/SandboxApp.tsx",
  "src/components/sandbox/SandboxWorkbench.tsx",
  "src/components/sandbox/SandboxEvidence.tsx",
  "src/components/sandbox/SandboxWorkReceipt.tsx",
  "src/components/sandbox/WorkReceiptView.tsx",
  "src/components/sandbox/DemoGuide.tsx",
];
const activeSandboxShellSource = activeSandboxShellFiles
  .map((file) => readFileSync(resolve(file), "utf8"))
  .join("\n");

const staleShellPatterns: Array<[string, RegExp]> = [
  ["Solutions Engineer", /Solutions Engineer|Solutions Engineering/],
  ["Acme", /\bAcme\b/],
  ["live simulation", /live simulation/i],
  ["Northstar sandbox", /Northstar sandbox/],
  ["discovery/rollout framing", /rollout plan|technical discovery|discovery call/i],
];
for (const [name, pattern] of staleShellPatterns) {
  ok(
    `active sandbox shell has no ${name} copy`,
    !pattern.test(activeSandboxShellSource),
    (activeSandboxShellSource.match(pattern) ?? []).join(", "),
  );
}
ok(
  "active sandbox shell does not depend on the historical SE fixture label",
  !activeSandboxShellSource.includes("FIXTURE_LABEL") &&
    !activeSandboxShellSource.includes("ACME_ROLLOUT_FIXTURE"),
);
ok(
  "historical SE fixture and legacy parsing remain available",
  ACME_ROLLOUT_FIXTURE.fixtureVersion === "acme-rollout-v1" &&
    legacyParsed.fixtureVersion === "acme-rollout-v1",
);

const sandboxAppSource = readFileSync(resolve("src/components/sandbox/SandboxApp.tsx"), "utf8");
ok(
  "canonical sandbox nav labels follow the proof sequence",
  [
    '"Proof overview"',
    '"Role proof"',
    '"Verification episode"',
    '"Evidence"',
    '"Work receipt"',
    '"Outcomes"',
  ].every((label) => sandboxAppSource.includes(label)),
);
ok(
  "sandbox shell ships no nonfunctional search, help, or settings control",
  !/type="search"/.test(sandboxAppSource) &&
    !/\bCircleHelp\b/.test(sandboxAppSource) &&
    !/\bSettings\b/.test(sandboxAppSource) &&
    !/\bChevronDown\b/.test(sandboxAppSource),
);
ok(
  "sandbox shell provides a mobile navigation region",
  /aria-label="Sandbox mobile navigation"/.test(sandboxAppSource) &&
    /md:hidden/.test(sandboxAppSource),
);
ok(
  "sandbox shell keeps the fictional-data banner and reset",
  /Sandbox · Fictional data/.test(sandboxAppSource) && /Reset demo/.test(sandboxAppSource),
);
ok(
  "sandbox candidate counts are derived, not hardcoded",
  !/4 demo candidates/.test(sandboxAppSource) && /fixture\.candidates/.test(sandboxAppSource),
);
ok(
  "role proof reads coverage from the canonical proof domain",
  sandboxAppSource.includes("APPLIED_AI_PROOF_REQUIREMENTS") &&
    sandboxAppSource.includes("createCandidate01PreWorkProfile"),
);
ok(
  "candidate 01 states 6/8 supported with the exact gaps",
  /6\/8 supported/.test(sandboxAppSource) &&
    /PR-AI-04, PR-AI-05, PR-AI-07, PR-AI-08/.test(sandboxAppSource),
);

console.log("\nEmployer demo honesty");
const demoModuleSource = readFileSync(
  resolve("src/components/employer/AppliedAiDemoModule.tsx"),
  "utf8",
);
ok(
  "employer demo module is labelled a flagship demo",
  demoModuleSource.includes("Applied AI flagship demo"),
);
ok(
  "employer demo module says it is fictional and not published",
  /fictional/i.test(demoModuleSource) &&
    /not a published role or employer evaluation/i.test(demoModuleSource),
);
ok(
  "employer demo module links into the sandbox only",
  [...demoModuleSource.matchAll(/href=\{?"([^"]+)"/g)].every((match) =>
    match[1].startsWith("/sandbox/"),
  ),
);

const employerDemoSurfaces = [
  "src/app/app/employer/page.tsx",
  "src/app/app/employer/roles/page.tsx",
  "src/app/app/employer/receipts/page.tsx",
  "src/app/app/employer/outcomes/page.tsx",
  "src/app/app/employer/evidence/page.tsx",
];
for (const file of employerDemoSurfaces) {
  const source = readFileSync(resolve(file), "utf8");
  ok(`${file} reuses the shared demo module`, source.includes("AppliedAiDemoModule"));
}

/**
 * Every employer link into the sandbox has to arrive through the labelled
 * module, so a visitor is never sent to fictional data by a bare CTA.
 */
for (const file of employerDemoSurfaces) {
  const source = readFileSync(resolve(file), "utf8");
  ok(
    `${file} has no unlabelled sandbox call to action`,
    !/href="\/sandbox"/.test(source),
    (source.match(/href="\/sandbox"/g) ?? []).join(", "),
  );
}

/**
 * Wave 1 production data must stay real. An Applied AI row injected into a
 * production catalog, candidate table, or report list would be data fraud.
 */
const employerProductionSurfaces = [
  "src/app/app/employer/page.tsx",
  "src/app/app/employer/roles/page.tsx",
  "src/app/app/employer/candidates/page.tsx",
  "src/app/app/employer/work/page.tsx",
  "src/app/app/employer/evidence/page.tsx",
];
const employerProductionSource = employerProductionSurfaces
  .map((file) => readFileSync(resolve(file), "utf8"))
  .join("\n");
ok(
  "employer production surfaces inject no Applied AI fixture rows",
  !/APPLIED_AI_WORKFLOW_FIXTURE|APPLIED_AI_REQUIREMENTS|candidate-01/.test(
    employerProductionSource,
  ),
);
ok(
  "employer evidence still renders real report records",
  readFileSync(resolve("src/app/app/employer/evidence/page.tsx"), "utf8").includes(
    "getReportRecords",
  ),
);

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nsandbox contracts passed");
