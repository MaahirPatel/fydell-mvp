import type {
  AnalysisJob,
  ArtifactRevision,
  DecisionBrief,
  DefenseQuestion,
  EvidenceClaim,
  EvidenceWorkerResult,
  GoldenPathEvent,
  GoldenPathEventType,
  GoldenPathRun,
  LedgerSource,
  WorkerRunSnapshot,
} from "./contracts";

const CHANGED_FACT: GoldenPathRun["changedFact"] = {
  factId: "AUTH_001",
  fact: "selected_endpoint_incompatible_with_customer_auth",
  invalidates: ["recommendation.endpoint_choice"],
  materiality: "critical",
};

function id(_prefix: string): string {
  void _prefix;
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function appendEvent(
  run: GoldenPathRun,
  eventType: GoldenPathEventType,
  source: LedgerSource,
  actorType: GoldenPathEvent["actorType"],
  stageId: GoldenPathEvent["stageId"],
  payload: GoldenPathEvent["payload"],
  now = new Date().toISOString()
): { run: GoldenPathRun; event: GoldenPathEvent } {
  const event: GoldenPathEvent = {
    id: id("evt"),
    runId: run.id,
    sequence: run.events.length + 1,
    eventType,
    eventVersion: 1,
    actorType,
    stageId,
    occurredAt: now,
    recordedAt: now,
    source,
    payload,
  };
  return { run: { ...run, events: [...run.events, event] }, event };
}

export function createGoldenPathRun(candidateLabel = "Pilot candidate"): GoldenPathRun {
  return {
    id: id("run"),
    candidateLabel,
    roleKey: "solutions_engineer",
    scenarioVersion: "northstar-pilot-1.0.0",
    engineVersion: "golden-path-0.1.0",
    rubricVersion: "se-adaptation-1.0.0",
    promptVersion: "evidence-initial-1.0.0",
    status: "INVITED",
    changedFact: CHANGED_FACT,
    events: [],
    artifacts: [],
    analysisJob: null,
    initialClaim: null,
    defenseQuestions: [],
    claim: null,
    brief: null,
  };
}

export function acceptInvite(run: GoldenPathRun): GoldenPathRun {
  if (run.status !== "INVITED") return run;
  const accepted = appendEvent(run, "INVITE_ACCEPTED", "CANDIDATE", "CANDIDATE", "INVITE", {
    roleKey: run.roleKey,
  }).run;
  return {
    ...appendEvent(
      accepted,
      "SIMULATION_STARTED",
      "SYSTEM",
      "SYSTEM",
      "SIMULATION",
      { scenarioVersion: run.scenarioVersion, seed: "pilot-seed-001" }
    ).run,
    status: "IN_PROGRESS",
  };
}

export function submitPreliminaryRecommendation(
  run: GoldenPathRun,
  content: string
): GoldenPathRun {
  if (run.status !== "IN_PROGRESS" || run.artifacts.length > 0 || !content.trim()) return run;
  const preliminary = appendEvent(
    run,
    "PRELIMINARY_RECOMMENDATION_SUBMITTED",
    "CANDIDATE",
    "CANDIDATE",
    "SIMULATION",
    { artifactId: "recommendation", endpointChoice: "oauth-proxy" }
  );
  const revision: ArtifactRevision = {
    id: id("rev"),
    artifactId: "recommendation",
    revision: 1,
    content: content.trim(),
    createdAt: preliminary.event.recordedAt,
    beforeFact: true,
    sourceEventId: preliminary.event.id,
  };
  const withArtifact = { ...preliminary.run, artifacts: [revision] };
  return appendEvent(withArtifact, "FACT_RELEASED", "WORLD", "SYSTEM", "SIMULATION", {
    factId: run.changedFact.factId,
    fact: run.changedFact.fact,
    invalidates: run.changedFact.invalidates,
    materiality: run.changedFact.materiality,
  }).run;
}

export function completeSimulation(run: GoldenPathRun, revisedContent: string): GoldenPathRun {
  if (run.status !== "IN_PROGRESS" || run.artifacts.length !== 1 || !revisedContent.trim()) {
    return run;
  }
  const artifactEvent = appendEvent(
    run,
    "ARTIFACT_REVISION",
    "CANDIDATE",
    "CANDIDATE",
    "SIMULATION",
    { artifactId: "recommendation", revision: 2, afterFact: true }
  );
  const revision: ArtifactRevision = {
    id: id("rev"),
    artifactId: "recommendation",
    revision: 2,
    content: revisedContent.trim(),
    createdAt: artifactEvent.event.recordedAt,
    beforeFact: false,
    sourceEventId: artifactEvent.event.id,
  };
  const completed = appendEvent(
    { ...artifactEvent.run, artifacts: [...run.artifacts, revision] },
    "SIMULATION_COMPLETED",
    "SYSTEM",
    "SYSTEM",
    "SIMULATION",
    { artifactIds: ["recommendation"], revisionCount: 2 }
  ).run;
  const job: AnalysisJob = {
    id: id("job"),
    runId: run.id,
    jobType: "EXTRACT_EVIDENCE_INITIAL",
    inputVersion: "1",
    status: "PENDING",
    attempts: 0,
    lockedAt: null,
    startedAt: null,
    completedAt: null,
    lastError: null,
    resultVersion: null,
    idempotencyKey: `${run.id}:EXTRACT_EVIDENCE_INITIAL:1`,
  };
  return {
    ...appendEvent(completed, "ANALYSIS_JOB_ENQUEUED", "SYSTEM", "SYSTEM", "ANALYSIS", {
      jobId: job.id,
      jobType: job.jobType,
      idempotencyKey: job.idempotencyKey,
    }).run,
    status: "COMPLETED",
    analysisJob: job,
  };
}

export function buildWorkerSnapshot(run: GoldenPathRun): WorkerRunSnapshot {
  if (!["COMPLETED", "DEFENSE_COMPLETED"].includes(run.status) || !run.analysisJob) {
    throw new Error("The simulation must be completed before analysis starts.");
  }
  assertOrderedEvents(run.events);
  return {
    runId: run.id,
    analysisPass: run.status === "COMPLETED" ? "A" : "B",
    scenarioVersion: run.scenarioVersion,
    engineVersion: run.engineVersion,
    rubricVersion: run.rubricVersion,
    promptVersion: run.promptVersion,
    changedFact: run.changedFact,
    events: run.events,
    artifacts: run.artifacts,
    initialClaim: run.initialClaim,
    defenseQuestions: run.defenseQuestions,
  };
}

export function acceptWorkerResult(
  run: GoldenPathRun,
  result: EvidenceWorkerResult
): GoldenPathRun {
  if (!run.analysisJob || result.runId !== run.id) throw new Error("Worker result run mismatch.");
  const expectedPass = run.status === "COMPLETED" ? "A" : run.status === "DEFENSE_COMPLETED" ? "B" : null;
  if (!expectedPass || result.analysisPass !== expectedPass) {
    throw new Error("Worker result analysis pass mismatch.");
  }
  const eventIds = new Set(run.events.map((event) => event.id));
  const artifactIds = new Set(run.artifacts.map((artifact) => artifact.id));
  for (const eventId of [...result.claim.supportingEventIds, ...result.claim.counterEventIds]) {
    if (!eventIds.has(eventId)) throw new Error(`Claim references unknown event ${eventId}.`);
  }
  for (const artifactId of result.claim.sourceArtifactIds) {
    if (!artifactIds.has(artifactId)) throw new Error(`Claim references unknown artifact ${artifactId}.`);
  }
  const claim: EvidenceClaim = {
    ...result.claim,
    id: id("claim"),
    reviewStatus: result.analysisPass === "A" ? "GENERATED" : "REVIEW_REQUIRED",
    reviewerNote: null,
  };
  const now = new Date().toISOString();
  const withClaimEvent = appendEvent(run, "CLAIM_GENERATED", "SYSTEM", "SYSTEM", "ANALYSIS", {
    claimId: claim.id,
    pass: result.analysisPass,
    supportingEventIds: claim.supportingEventIds,
    counterEventIds: claim.counterEventIds,
  }).run;
  const completedJob: AnalysisJob = {
    ...run.analysisJob,
    status: "COMPLETE",
    attempts: run.analysisJob.attempts + 1,
    lockedAt: now,
    startedAt: now,
    completedAt: now,
    resultVersion: result.resultVersion,
  };

  if (result.analysisPass === "A") {
    if (result.defenseQuestions.length === 0) {
      throw new Error("Pass A must produce at least one defense question.");
    }
    let nextRun = withClaimEvent;
    const questions: DefenseQuestion[] = [];
    for (const prompt of result.defenseQuestions) {
      const question: DefenseQuestion = {
        id: id("defense"),
        prompt,
        target: "ADAPTATION",
        sourceClaimId: claim.id,
        response: null,
      };
      questions.push(question);
      nextRun = appendEvent(
        nextRun,
        "DEFENSE_QUESTION_GENERATED",
        "SYSTEM",
        "SYSTEM",
        "ANALYSIS",
        { questionId: question.id, sourceClaimId: claim.id }
      ).run;
    }
    return {
      ...nextRun,
      status: "DEFENSE_REQUIRED",
      initialClaim: claim,
      defenseQuestions: questions,
      claim: null,
      analysisJob: completedJob,
    };
  }

  return {
    ...withClaimEvent,
    status: "REVIEW_REQUIRED",
    claim,
    analysisJob: completedJob,
  };
}

export function submitDefense(run: GoldenPathRun, responses: Record<string, string>): GoldenPathRun {
  if (run.status !== "DEFENSE_REQUIRED" || !run.initialClaim) return run;
  if (
    run.defenseQuestions.length === 0 ||
    run.defenseQuestions.some((question) => !responses[question.id]?.trim())
  ) {
    return run;
  }

  let nextRun = run;
  const answeredQuestions = run.defenseQuestions.map((question) => {
    const response = responses[question.id].trim();
    nextRun = appendEvent(
      nextRun,
      "DEFENSE_RESPONSE_SUBMITTED",
      "CANDIDATE",
      "CANDIDATE",
      "ANALYSIS",
      { questionId: question.id, sourceClaimId: question.sourceClaimId }
    ).run;
    return { ...question, response };
  });
  const job: AnalysisJob = {
    id: id("job"),
    runId: run.id,
    jobType: "EXTRACT_EVIDENCE_FINAL",
    inputVersion: "1",
    status: "PENDING",
    attempts: 0,
    lockedAt: null,
    startedAt: null,
    completedAt: null,
    lastError: null,
    resultVersion: null,
    idempotencyKey: `${run.id}:EXTRACT_EVIDENCE_FINAL:1`,
  };
  nextRun = appendEvent(nextRun, "ANALYSIS_JOB_ENQUEUED", "SYSTEM", "SYSTEM", "ANALYSIS", {
    jobId: job.id,
    jobType: job.jobType,
    idempotencyKey: job.idempotencyKey,
  }).run;
  return {
    ...nextRun,
    status: "DEFENSE_COMPLETED",
    defenseQuestions: answeredQuestions,
    analysisJob: job,
  };
}

export function approveClaim(run: GoldenPathRun, reviewerNote: string): GoldenPathRun {
  if (run.status !== "REVIEW_REQUIRED" || !run.claim) return run;
  const claim: EvidenceClaim = {
    ...run.claim,
    reviewStatus: "PUBLISHED",
    reviewerNote: reviewerNote.trim() || "Evidence and provenance checked.",
  };
  const approved = appendEvent(run, "CLAIM_APPROVED", "SYSTEM", "REVIEWER", "REVIEW", {
    claimId: claim.id,
    reviewerNote: claim.reviewerNote,
  }).run;
  const brief: DecisionBrief = {
    id: id("brief"),
    runId: run.id,
    candidateLabel: run.candidateLabel,
    roleKey: run.roleKey,
    recommendation:
      claim.direction === "STRENGTH" ? "WORTH_INTERVIEWING" : "MORE_EVIDENCE_NEEDED",
    why: claim.statement,
    claimIds: [claim.id],
    interviewProbes: [
      "Walk through what changed after the authentication constraint appeared.",
      "Which part of the original recommendation did you preserve, and why?",
      "What production evidence would you require before committing to the revised path?",
    ],
    publishedAt: new Date().toISOString(),
  };
  return {
    ...appendEvent(approved, "BRIEF_PUBLISHED", "SYSTEM", "REVIEWER", "BRIEF", {
      briefId: brief.id,
      claimIds: brief.claimIds,
    }).run,
    status: "PUBLISHED",
    claim,
    brief,
  };
}

export function rejectClaim(run: GoldenPathRun, reviewerNote: string): GoldenPathRun {
  if (run.status !== "REVIEW_REQUIRED" || !run.claim) return run;
  const note = reviewerNote.trim() || "Generated claim was not sufficiently supported.";
  const claim: EvidenceClaim = {
    ...run.claim,
    direction: "INSUFFICIENT_EVIDENCE",
    confidence: "LOW",
    reviewStatus: "REVIEWED",
    reviewerNote: note,
  };
  const rejected = appendEvent(run, "CLAIM_REJECTED", "SYSTEM", "REVIEWER", "REVIEW", {
    claimId: claim.id,
    reviewerNote: note,
  }).run;
  const brief: DecisionBrief = {
    id: id("brief"),
    runId: run.id,
    candidateLabel: run.candidateLabel,
    roleKey: run.roleKey,
    recommendation: "MORE_EVIDENCE_NEEDED",
    why: "The generated adaptation claim was not approved during human review.",
    claimIds: [],
    interviewProbes: [
      "Ask the candidate to explain the before-and-after recommendation in their own words.",
      "Request the production evidence they would use to validate authentication compatibility.",
      "Probe which parts of the original recommendation remain defensible.",
    ],
    publishedAt: new Date().toISOString(),
  };
  return {
    ...appendEvent(rejected, "BRIEF_PUBLISHED", "SYSTEM", "REVIEWER", "BRIEF", {
      briefId: brief.id,
      claimIds: brief.claimIds,
    }).run,
    status: "PUBLISHED",
    claim,
    brief,
  };
}

export function assertOrderedEvents(events: GoldenPathEvent[]): void {
  events.forEach((event, index) => {
    if (event.sequence !== index + 1) {
      throw new Error(`Event sequence is not monotonic at ${event.id}.`);
    }
  });
}
