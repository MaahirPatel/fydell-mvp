import "server-only";
import type { ArtifactContent } from "../types";
import { ACME_ROLLOUT_FIXTURE } from "./fixture";
import { analyzePassA, analyzePassB } from "./analysis";
import { sandboxAdmin } from "./client";
import { streamForEventType, type SandboxEventType } from "./events";
import {
  ArtifactWorkReceiptIssuer,
  ProofEvidenceAnalysisRepository,
  ProofSimulationRunRepository,
} from "./proof-repos";
import { scriptedReviewLabel, visitorReviewLabel, type SandboxReviewRecord } from "./repositories";
import { assertTransition, proofStageFor, proofStatusFor, type SandboxStep } from "./steps";
import { nextWorldState, type SandboxWorldStateV1 } from "./world-state";
import type { SimulationRunRecord } from "./repositories";

const runs = new ProofSimulationRunRepository();
const analysis = new ProofEvidenceAnalysisRepository();
const receipts = new ArtifactWorkReceiptIssuer();

export type SandboxAction =
  | { type: "start"; idempotencyKey?: string }
  | { type: "save_work"; artifact: ArtifactContent; idempotencyKey?: string }
  | { type: "commit_initial"; artifact?: ArtifactContent; idempotencyKey?: string }
  | { type: "deliver_constraint"; idempotencyKey?: string }
  | { type: "submit_revised"; artifact?: ArtifactContent; idempotencyKey?: string }
  | { type: "begin_defense"; idempotencyKey?: string }
  | { type: "submit_defense"; answer: string; idempotencyKey?: string }
  | { type: "review"; decision?: SandboxReviewRecord["decision"]; scripted?: boolean; idempotencyKey?: string }
  | {
      type: "record_outcome";
      finding: "confirmed" | "contradicted" | "still_unclear" | "not_asked";
      outcome: "advance" | "hold" | "close" | "hired";
      idempotencyKey?: string;
    }
  | { type: "advance"; idempotencyKey?: string }
  | { type: "retry_analysis" };

function seen(state: SandboxWorldStateV1, key: string): boolean {
  return state.seenIdempotencyKeys.includes(key);
}

function remember(state: SandboxWorldStateV1, key: string): Pick<SandboxWorldStateV1, "lastIdempotencyKey" | "seenIdempotencyKeys"> {
  const keys = state.seenIdempotencyKeys.includes(key) ? state.seenIdempotencyKeys : [...state.seenIdempotencyKeys, key].slice(-200);
  return { lastIdempotencyKey: key, seenIdempotencyKeys: keys };
}

async function transition(run: SimulationRunRecord, to: SandboxStep, patch: Partial<SandboxWorldStateV1> = {}) {
  assertTransition(run.worldState.currentStep, to);
  const next = nextWorldState(run.worldState, { ...patch, currentStep: to });
  await runs.updateWorldState(run.id, run.worldState, next, proofStageFor(to), proofStatusFor(to));
  await append(run.id, "STAGE_CHANGED", "system", `${run.id}:step:${to}`, { from: run.worldState.currentStep, to });
  return runs.load(run.id);
}

async function append(
  runId: string,
  eventType: SandboxEventType,
  actorType: string,
  idempotencyKey: string,
  payload: Record<string, unknown>,
) {
  return runs.appendEvent({
    runId,
    eventType,
    stream: streamForEventType(eventType),
    actorType,
    correlationId: runId,
    idempotencyKey,
    payload,
  });
}

function fixtureArtifact(kind: "initial" | "revised"): ArtifactContent {
  const f = ACME_ROLLOUT_FIXTURE;
  if (kind === "initial") {
    return {
      diagnosis: f.discoveryNotes,
      recommendation: f.initialRecommendation,
      customer_message: f.customerEmailInitial,
      internal_note: f.architectureBrief,
      assumptions: f.assumptions,
      limitations: f.unverifiedAssumptions.join(" "),
    };
  }
  return {
    diagnosis: f.discoveryNotes,
    recommendation: f.revisedRecommendation,
    customer_message: f.customerEmailRevised,
    internal_note: f.architectureBrief,
    assumptions: f.assumptions,
    limitations: "Production access blocked for six weeks. WAU is unverified.",
  };
}

export async function applySandboxAction(run: SimulationRunRecord, action: SandboxAction): Promise<SimulationRunRecord> {
  const key = "idempotencyKey" in action && action.idempotencyKey ? action.idempotencyKey : `${run.id}:${action.type}:${run.worldState.revision}`;
  if (seen(run.worldState, key) && action.type !== "save_work" && action.type !== "retry_analysis") {
    return run;
  }
  if (
    run.worldState.currentStep === "finalized" &&
    action.type !== "advance" &&
    action.type !== "record_outcome"
  ) {
    throw new Error("Sandbox is finalized");
  }

  if (action.type === "start") {
    if (run.worldState.currentStep !== "invited") return run;
    return transition(run, "active", remember(run.worldState, key));
  }

  if (action.type === "save_work") {
    if (run.worldState.currentStep !== "active" && run.worldState.currentStep !== "defense_in_progress") {
      throw new Error("Work can only be edited while the run is active");
    }
    await runs.saveArtifact(run.id, action.artifact, run.stage);
    await append(run.id, "ARTIFACT_REVISION", "candidate", key, { fields: Object.keys(action.artifact) });
    const next = nextWorldState(run.worldState, remember(run.worldState, key));
    await runs.updateWorldState(run.id, run.worldState, next, run.stage, run.status);
    return runs.load(run.id);
  }

  if (action.type === "commit_initial") {
    if (run.worldState.currentStep !== "active") throw new Error("Initial commit requires an active run");
    if (action.artifact) await runs.saveArtifact(run.id, action.artifact, run.stage);
    await append(run.id, "DECISION_COMMITTED", "candidate", key, { kind: "preliminary" });
    const next = nextWorldState(run.worldState, remember(run.worldState, key));
    await runs.updateWorldState(run.id, run.worldState, next, run.stage, run.status);
    return runs.load(run.id);
  }

  if (action.type === "deliver_constraint") {
    if (run.worldState.currentStep !== "active") throw new Error("Constraint requires an active run");
    if (run.worldState.constraintDelivered) return run;
    const fact = ACME_ROLLOUT_FIXTURE.changedFact;
    await runs.setReleasedFacts(run.id, [...run.releasedFacts, fact.id]);
    await append(run.id, "FACT_RELEASED", "world", key, { fact_id: fact.id, body: fact.body });
    const next = nextWorldState(run.worldState, { ...remember(run.worldState, key), constraintDelivered: true });
    await runs.updateWorldState(run.id, run.worldState, next, "AUTH_CONSTRAINT", run.status);
    return runs.load(run.id);
  }

  if (action.type === "submit_revised") {
    if (run.worldState.currentStep !== "active") throw new Error("Revised submit requires an active run");
    if (!run.worldState.constraintDelivered) throw new Error("Constraint must be delivered before submission");
    if (action.artifact) await runs.saveArtifact(run.id, action.artifact, run.stage);
    await append(run.id, "DECISION_COMMITTED", "candidate", key, { kind: "revised" });
    let current = await transition(run, "initial_work_submitted", remember(run.worldState, key));
    current = await transition(current, "pass_a_processing");
    return runPassA(current);
  }

  if (action.type === "begin_defense") {
    if (run.worldState.currentStep !== "defense_ready") throw new Error("Defense is not ready");
    return transition(run, "defense_in_progress", remember(run.worldState, key));
  }

  if (action.type === "submit_defense") {
    if (run.worldState.currentStep !== "defense_in_progress" && run.worldState.currentStep !== "defense_ready") {
      throw new Error("Defense cannot be submitted yet");
    }
    let current = run;
    if (current.worldState.currentStep === "defense_ready") {
      current = await transition(current, "defense_in_progress");
    }
    const adminSession = await persistDefenseAnswer(current.id, action.answer);
    await append(current.id, "DEFENSE_RESPONSE_RECEIVED", "candidate", key, { question_id: adminSession.questionId });
    current = await transition(current, "defense_submitted", remember(current.worldState, key));
    current = await transition(current, "pass_b_processing");
    return runPassB(current);
  }

  if (action.type === "review") {
    if (run.worldState.currentStep !== "review_pending") throw new Error("Review is not pending");
    const record = action.scripted || !action.decision ? scriptedReviewLabel() : visitorReviewLabel(action.decision);
    await append(run.id, "REVIEW_RECORDED", "reviewer", key, {
      kind: record.kind,
      decision: record.decision,
      label: record.label,
      disclaimer: record.disclaimer,
    });
    const snapshot = await runs.loadSnapshot(run.id);
    const issued = await receipts.issue({
      runId: run.id,
      items: ACME_ROLLOUT_FIXTURE.expectedReceiptItems,
      conditions: [
        `Fixture ${ACME_ROLLOUT_FIXTURE.fixtureVersion}`,
        "Fictional candidate and employer",
        ACME_ROLLOUT_FIXTURE.changedFact.title,
      ],
      eventIds: snapshot.events.map((event) => event.id),
    });
    await append(run.id, "RECEIPT_ISSUED", "system", `${key}:receipt`, {
      publicId: issued.publicId,
      integrityHash: issued.integrityHash,
    });
    await sandboxAdmin().from("proof_decision_briefs").update({ published: true }).eq("run_id", run.id);
    return transition(run, "finalized", {
      ...remember(run.worldState, key),
      reviewKind: record.kind,
      reviewDecision: record.decision,
      receiptPublicId: issued.publicId,
      receiptIntegrityHash: issued.integrityHash,
    });
  }

  if (action.type === "record_outcome") {
    if (run.worldState.currentStep !== "finalized") {
      throw new Error("Outcome can only be recorded after review");
    }
    await append(run.id, "OUTCOME_RECORDED", "reviewer", key, {
      finding: action.finding,
      outcome: action.outcome,
    });
    const next = nextWorldState(run.worldState, {
      ...remember(run.worldState, key),
      interviewFinding: action.finding,
      hiringOutcome: action.outcome,
    });
    await runs.updateWorldState(run.id, run.worldState, next, run.stage, run.status);
    return runs.load(run.id);
  }

  if (action.type === "retry_analysis") {
    if (run.worldState.currentStep === "pass_a_processing") return runPassA(run);
    if (run.worldState.currentStep === "pass_b_processing") return runPassB(run);
    throw new Error("No analysis to retry");
  }

  if (action.type === "advance") {
    return advanceWalkthrough(run);
  }

  throw new Error("Unknown sandbox action");
}

async function persistDefenseAnswer(runId: string, answer: string): Promise<{ questionId: string }> {
  const admin = sandboxAdmin();
  const { data: session } = await admin.from("proof_defense_sessions").select("id").eq("run_id", runId).maybeSingle();
  if (!session) throw new Error("Defense session missing");
  const { data: question } = await admin
    .from("proof_defense_questions")
    .select("id")
    .eq("session_id", session.id)
    .order("sort_order")
    .limit(1)
    .maybeSingle();
  if (!question) throw new Error("Defense question missing");
  await admin.from("proof_defense_responses").upsert({ question_id: question.id, body: answer }, { onConflict: "question_id" });
  return { questionId: question.id as string };
}

async function runPassA(run: SimulationRunRecord): Promise<SimulationRunRecord> {
  await append(run.id, "ANALYSIS_STARTED", "system", `${run.id}:pass_a_start:${run.worldState.revision}`, { pass: "A" });
  const snapshot = await runs.loadSnapshot(run.id);
  const result = analyzePassA(snapshot);
  await analysis.persistPassA(run.id, result.claims, result.defensePrompt, result.defenseTarget);
  await append(run.id, "DEFENSE_QUESTION_ASKED", "system", `${run.id}:defense_q`, { prompt: result.defensePrompt });
  await append(run.id, "ANALYSIS_COMPLETED", "system", `${run.id}:pass_a_done`, { pass: "A" });
  return transition(run, "defense_ready");
}

async function runPassB(run: SimulationRunRecord): Promise<SimulationRunRecord> {
  await append(run.id, "ANALYSIS_STARTED", "system", `${run.id}:pass_b_start:${run.worldState.revision}`, { pass: "B" });
  const snapshot = await runs.loadSnapshot(run.id);
  const result = analyzePassB(snapshot);
  await analysis.persistPassB(run.id, result.claims, result.brief);
  await append(run.id, "ANALYSIS_COMPLETED", "system", `${run.id}:pass_b_done`, { pass: "B" });
  return transition(run, "review_pending");
}

async function advanceWalkthrough(run: SimulationRunRecord): Promise<SimulationRunRecord> {
  const step = run.worldState.currentStep;
  const key = `advance:${step}:${run.worldState.revision}`;
    if (step === "invited") return applySandboxAction(run, { type: "start", idempotencyKey: key });
  if (step === "active" && !run.worldState.seenIdempotencyKeys.some((item) => item.includes("commit_initial"))) {
    const artifact = fixtureArtifact("initial");
    const afterSave = await applySandboxAction(run, { type: "save_work", artifact, idempotencyKey: `${key}:save` });
    return applySandboxAction(afterSave, { type: "commit_initial", artifact, idempotencyKey: `${key}:commit` });
  }
  if (step === "active" && !run.worldState.constraintDelivered) {
    return applySandboxAction(run, { type: "deliver_constraint", idempotencyKey: key });
  }
  if (step === "active") {
    const artifact = fixtureArtifact("revised");
    const afterSave = await applySandboxAction(run, { type: "save_work", artifact, idempotencyKey: `${key}:revsave` });
    return applySandboxAction(afterSave, { type: "submit_revised", artifact, idempotencyKey: `${key}:submit` });
  }
  if (step === "pass_a_processing") return runPassA(run);
  if (step === "defense_ready") return applySandboxAction(run, { type: "begin_defense", idempotencyKey: key });
  if (step === "defense_in_progress") {
    return applySandboxAction(run, {
      type: "submit_defense",
      answer: ACME_ROLLOUT_FIXTURE.fixtureDefenseAnswer,
      idempotencyKey: key,
    });
  }
  if (step === "pass_b_processing") return runPassB(run);
  if (step === "review_pending") {
    return applySandboxAction(run, { type: "review", scripted: true, idempotencyKey: key });
  }
  return run;
}

export async function buildSandboxView(run: SimulationRunRecord) {
  const snapshot = await runs.loadSnapshot(run.id);
  const claims = await analysis.loadClaims(run.id);
  const admin = sandboxAdmin();
  const { data: brief } = await admin.from("proof_decision_briefs").select("*").eq("run_id", run.id).maybeSingle();
  const { data: session } = await admin.from("proof_defense_sessions").select("id, status").eq("run_id", run.id).maybeSingle();
  let question: { id: string; prompt: string; answer: string } | null = null;
  if (session) {
    const { data: questions } = await admin
      .from("proof_defense_questions")
      .select("id, prompt, proof_defense_responses(body)")
      .eq("session_id", session.id)
      .order("sort_order");
    const first = questions?.[0];
    if (first) {
      const responses = first.proof_defense_responses as { body: string }[] | { body: string } | null;
      const body = Array.isArray(responses) ? responses[0]?.body : responses?.body;
      question = { id: first.id as string, prompt: first.prompt as string, answer: body ?? "" };
    }
  }
  const f = ACME_ROLLOUT_FIXTURE;
  return {
    runId: run.id,
    step: run.worldState.currentStep,
    revision: run.worldState.revision,
    expiresAt: run.worldState.expiresAt,
    constraintDelivered: run.worldState.constraintDelivered,
    reviewKind: run.worldState.reviewKind,
    reviewDecision: run.worldState.reviewDecision,
    receiptPublicId: run.worldState.receiptPublicId,
    receiptIntegrityHash: run.worldState.receiptIntegrityHash,
    interviewFinding: run.worldState.interviewFinding,
    hiringOutcome: run.worldState.hiringOutcome,
    fixture: {
      organization: f.organization,
      role: f.role,
      candidate: f.candidate,
      candidates: f.candidates,
      resources: f.resources,
      changedFact: f.changedFact,
      defenseQuestion: f.defenseQuestion,
      competencies: f.rubric.competencies,
    },
    artifact: snapshot.artifact,
    events: snapshot.events.map((event) => ({
      id: event.id,
      sequence: event.sequence,
      eventType: event.event_type,
      stream: (event.payload as { stream?: string } | null)?.stream ?? null,
      payload: event.payload,
    })),
    claims: claims.map((claim) => ({
      id: claim.id,
      pass: claim.pass,
      claim: claim.claim,
      competency: claim.competency,
      direction: claim.direction,
      confidence: claim.confidence,
      reviewStatus: claim.review_status,
    })),
    brief: brief
      ? {
          recommendation: brief.recommendation as string,
          why: brief.why as string,
          strengths: brief.strengths as string[],
          concerns: brief.concerns as string[],
          probes: brief.probes as string[],
          published: Boolean(brief.published),
        }
      : null,
    defense: question,
    labels: {
      banner: "Fictional candidate data. Actions in this sandbox do not affect live hiring.",
      review:
        run.worldState.reviewKind === "sandbox_visitor"
          ? "Reviewed by sandbox visitor."
          : run.worldState.reviewKind === "scripted"
            ? "Demonstration review generated from a fictional sandbox workflow."
            : null,
      receipt: "Fictional sandbox work receipt. Not valid for employment verification.",
    },
  };
}

export { fixtureArtifact };
