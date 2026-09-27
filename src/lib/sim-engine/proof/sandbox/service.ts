import "server-only";
import type { ArtifactContent } from "../types";
import { ACME_ROLLOUT_FIXTURE, APPLIED_AI_WORKFLOW_FIXTURE } from "./fixture";
import {
  appliedAiConfigSchema,
  appliedAiEvalCaseSchema,
  evaluateAppliedAiWorkspace,
  parseAppliedAiWorkspace,
  type AppliedAiConfig,
  type AppliedAiEvalCase,
} from "./applied-ai-workspace";
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
import { releaseLatencyFactOnce } from "./candidate-loop";
import { buildAppliedAiReceiptPayload } from "./review-outputs";

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

export type AppliedAiSandboxAction =
  | { type: "open_resource"; resourceId: string; idempotencyKey?: string }
  | { type: "open_trace"; resourceId: string; idempotencyKey?: string }
  | { type: "run_eval"; idempotencyKey?: string }
  | { type: "edit_config"; config: AppliedAiConfig; idempotencyKey?: string }
  | { type: "upsert_eval_case"; evalCase: AppliedAiEvalCase; idempotencyKey?: string }
  | { type: "save_proposal"; proposalCode: string; idempotencyKey?: string }
  | { type: "commit_architecture"; architectureDecision: string; idempotencyKey?: string }
  | { type: "write_recommendation"; recommendation: string; idempotencyKey?: string }
  | { type: "submit_episode"; idempotencyKey?: string };

export type SandboxActionInput = SandboxAction | AppliedAiSandboxAction;

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

export async function applySandboxAction(run: SimulationRunRecord, action: SandboxActionInput): Promise<SimulationRunRecord> {
  const key = "idempotencyKey" in action && action.idempotencyKey ? action.idempotencyKey : `${run.id}:${action.type}:${run.worldState.revision}`;
  if (
    seen(run.worldState, key) &&
    action.type !== "save_work" &&
    action.type !== "retry_analysis" &&
    !(action.type === "commit_architecture" && !run.worldState.progress.factReleased)
  ) {
    return run;
  }
  if (
    run.worldState.currentStep === "finalized" &&
    action.type !== "advance" &&
    action.type !== "record_outcome"
  ) {
    throw new Error("Sandbox is finalized");
  }
  const legacySeActions: readonly SandboxActionInput["type"][] = [
    "save_work",
    "commit_initial",
    "deliver_constraint",
    "submit_revised",
    "advance",
  ];
  if (
    run.worldState.fixtureVersion === APPLIED_AI_WORKFLOW_FIXTURE.fixtureVersion &&
    legacySeActions.includes(action.type)
  ) {
    throw new Error(`Action ${action.type} is not supported by the Applied AI fixture`);
  }

  if (action.type === "start") {
    if (run.worldState.currentStep !== "invited") return run;
    return transition(run, "active", remember(run.worldState, key));
  }

  if (action.type === "open_resource" || action.type === "open_trace") {
    if (run.worldState.currentStep !== "active") throw new Error("Resource inspection requires an active run");
    const resource = APPLIED_AI_WORKFLOW_FIXTURE.resources.find((item) => item.id === action.resourceId);
    if (!resource) throw new Error("Unknown workspace resource");
    if (action.type === "open_trace" && resource.kind !== "trace") {
      throw new Error("TRACE_OPENED requires a trace resource");
    }
    await append(run.id, "RESOURCE_OPENED", "candidate", `${key}:resource`, {
      resource_id: resource.id,
      resource_kind: resource.kind,
    });
    if (action.type === "open_trace") {
      await append(run.id, "TRACE_OPENED", "candidate", `${key}:trace`, {
        resource_id: resource.id,
        failure_kind: resource.id.includes("duplicate") ? "duplicate_side_effect" : "semantic_validation",
      });
    }
    const next = nextWorldState(run.worldState, {
      ...remember(run.worldState, key),
      episodeStage: "INSPECTING",
      progress: {
        ...run.worldState.progress,
        resourceOpened: true,
        traceOpened: run.worldState.progress.traceOpened || resource.kind === "trace",
      },
    });
    await runs.updateWorldState(run.id, run.worldState, next, "INVESTIGATION", run.status);
    return runs.load(run.id);
  }

  if (action.type === "run_eval") {
    if (run.worldState.currentStep !== "active") throw new Error("Evaluation requires an active run");
    if (!run.worldState.progress.traceOpened) throw new Error("Open a failed trace before running the baseline");
    const postFact = run.worldState.progress.factReleased;
    if (postFact && !run.worldState.progress.postFactRevision) {
      throw new Error("Make a supported post-fact revision before rerunning evaluation");
    }
    const evaluation = evaluateAppliedAiWorkspace(run.worldState.workspace);
    await runs.saveWorkspaceVersion(run.id, "eval_run", run.worldState.workspace, evaluation, postFact ? "VALIDATING" : "BASELINE_RUN");
    await append(run.id, "EVAL_RUN", "candidate", key, {
      phase: postFact ? "post_fact" : "baseline",
      evaluator_version: evaluation.evaluatorVersion,
      workspace_hash: evaluation.workspaceHash,
      metrics: evaluation,
    });
    const next = nextWorldState(run.worldState, {
      ...remember(run.worldState, key),
      episodeStage: postFact ? "VALIDATING" : "BASELINE_RUN",
      latestEval: evaluation,
      baselineEval: run.worldState.baselineEval ?? evaluation,
      progress: {
        ...run.worldState.progress,
        baselineRun: true,
        postFactEvalRun: postFact || run.worldState.progress.postFactEvalRun,
      },
    });
    await runs.updateWorldState(run.id, run.worldState, next, postFact ? "REASSESSMENT" : "INVESTIGATION", run.status);
    return runs.load(run.id);
  }

  if (action.type === "edit_config") {
    if (run.worldState.currentStep !== "active") throw new Error("Configuration can only be edited during active work");
    if (!run.worldState.progress.baselineRun) throw new Error("Run the baseline before editing executable configuration");
    const config = appliedAiConfigSchema.parse(action.config);
    const workspace = parseAppliedAiWorkspace({ ...run.worldState.workspace, config });
    if (JSON.stringify(config) === JSON.stringify(run.worldState.workspace.config)) {
      throw new Error("A genuine configuration mutation is required");
    }
    const postFact = run.worldState.progress.factReleased;
    await runs.saveWorkspaceVersion(run.id, "workspace_snapshot", workspace, null, postFact ? "REVISING" : "EDITING");
    await append(run.id, postFact ? "CONFIG_REVISION" : "CONFIG_EDITED", "candidate", key, {
      workspace_hash_before: run.worldState.latestEval?.workspaceHash ?? null,
      changed_fields: Object.keys(config).filter(
        (field) => config[field as keyof AppliedAiConfig] !== run.worldState.workspace.config[field as keyof AppliedAiConfig],
      ),
    });
    const next = nextWorldState(run.worldState, {
      ...remember(run.worldState, key),
      workspace,
      latestEval: null,
      episodeStage: postFact ? "REVISING" : "EDITING",
      progress: {
        ...run.worldState.progress,
        configEdited: true,
        postFactRevision: postFact || run.worldState.progress.postFactRevision,
      },
    });
    await runs.updateWorldState(run.id, run.worldState, next, postFact ? "REASSESSMENT" : "INVESTIGATION", run.status);
    return runs.load(run.id);
  }

  if (action.type === "upsert_eval_case") {
    if (run.worldState.currentStep !== "active") throw new Error("Eval cases can only be edited during active work");
    if (!run.worldState.progress.baselineRun) throw new Error("Run the baseline before editing eval coverage");
    const evalCase = appliedAiEvalCaseSchema.parse(action.evalCase);
    const index = run.worldState.workspace.evalCases.findIndex((item) => item.id === evalCase.id);
    const evalCases = [...run.worldState.workspace.evalCases];
    if (index >= 0) evalCases[index] = evalCase;
    else evalCases.push(evalCase);
    const workspace = parseAppliedAiWorkspace({ ...run.worldState.workspace, evalCases });
    const postFact = run.worldState.progress.factReleased;
    await runs.saveWorkspaceVersion(run.id, "workspace_snapshot", workspace, null, postFact ? "REVISING" : "EDITING");
    await append(
      run.id,
      index >= 0 ? (postFact ? "EVAL_REVISION" : "EVAL_CASE_EDITED") : "EVAL_CASE_ADDED",
      "candidate",
      key,
      { case_id: evalCase.id, slice: evalCase.slice },
    );
    const next = nextWorldState(run.worldState, {
      ...remember(run.worldState, key),
      workspace,
      latestEval: null,
      episodeStage: postFact ? "REVISING" : "EDITING",
      progress: {
        ...run.worldState.progress,
        evalCaseEdited: true,
        postFactRevision: postFact || run.worldState.progress.postFactRevision,
      },
    });
    await runs.updateWorldState(run.id, run.worldState, next, postFact ? "REASSESSMENT" : "INVESTIGATION", run.status);
    return runs.load(run.id);
  }

  if (action.type === "save_proposal") {
    if (run.worldState.currentStep !== "active") throw new Error("Proposal can only be saved during active work");
    const workspace = parseAppliedAiWorkspace({ ...run.worldState.workspace, proposalCode: action.proposalCode });
    await runs.saveWorkspaceVersion(run.id, "workspace_snapshot", workspace, null, run.worldState.episodeStage);
    const next = nextWorldState(run.worldState, { ...remember(run.worldState, key), workspace });
    await runs.updateWorldState(run.id, run.worldState, next, run.stage, run.status);
    return runs.load(run.id);
  }

  if (action.type === "commit_architecture") {
    if (run.worldState.currentStep !== "active") throw new Error("Architecture commitment requires active work");
    const p = run.worldState.progress;
    if (!p.traceOpened || !p.baselineRun || !p.configEdited || !p.evalCaseEdited) {
      throw new Error("Commit requires trace inspection, baseline evaluation, a config mutation, and an eval-case mutation");
    }
    if (action.architectureDecision.trim().length < 20) throw new Error("Record a concrete architecture decision before committing");
    const workspace = parseAppliedAiWorkspace({ ...run.worldState.workspace, architectureDecision: action.architectureDecision.trim() });
    let preliminary = run.worldState;
    if (!p.architectureCommitted) {
      await runs.saveWorkspaceVersion(run.id, "workspace_snapshot", workspace, null, "PRELIMINARY_COMMITTED");
      await append(run.id, "ARCHITECTURE_DECISION_COMMITTED", "candidate", key, {
        workspace_hash: run.worldState.latestEval?.workspaceHash ?? null,
        decision_length: action.architectureDecision.trim().length,
      });
      preliminary = nextWorldState(run.worldState, {
        ...remember(run.worldState, key),
        workspace,
        episodeStage: "PRELIMINARY_COMMITTED",
        progress: { ...p, architectureCommitted: true },
      });
      await runs.updateWorldState(
        run.id,
        run.worldState,
        preliminary,
        "PRELIMINARY_RECOMMENDATION",
        run.status,
      );
    }
    const fact = APPLIED_AI_WORKFLOW_FIXTURE.changedFact;
    const snapshot = await runs.loadSnapshot(run.id);
    const factEventExists = snapshot.events.some((event) => {
      if (event.event_type !== "FACT_RELEASED") return false;
      const envelope = event.payload as { payload?: { fact_id?: string } };
      return envelope.payload?.fact_id === fact.id;
    });
    if (!factEventExists) {
      await append(run.id, "FACT_RELEASED", "world", `${key}:fact:${fact.id}`, {
        fact_id: fact.id,
        p95_threshold_seconds: 4,
        body: fact.body,
      });
    }
    if (!run.releasedFacts.includes(fact.id)) {
      await runs.setReleasedFacts(run.id, [...releaseLatencyFactOnce(run.releasedFacts)]);
    }
    const next = nextWorldState(preliminary, {
      ...remember(run.worldState, key),
      workspace,
      constraintDelivered: true,
      episodeStage: "LATENCY_CONSTRAINT_RELEASED",
      progress: { ...p, architectureCommitted: true, factReleased: true },
    });
    await runs.updateWorldState(run.id, preliminary, next, "REASSESSMENT", run.status);
    return runs.load(run.id);
  }

  if (action.type === "write_recommendation") {
    if (!run.worldState.progress.postFactEvalRun) throw new Error("Run a post-fact evaluation before writing the recommendation");
    if (action.recommendation.trim().length < 30) throw new Error("Production recommendation must describe a decision and its limits");
    const workspace = parseAppliedAiWorkspace({
      ...run.worldState.workspace,
      productionRecommendation: action.recommendation.trim(),
    });
    await runs.saveWorkspaceVersion(run.id, "workspace_snapshot", workspace, run.worldState.latestEval, "VALIDATING");
    await append(run.id, "PRODUCTION_RECOMMENDATION_WRITTEN", "candidate", key, {
      workspace_hash: run.worldState.latestEval?.workspaceHash ?? null,
    });
    const next = nextWorldState(run.worldState, {
      ...remember(run.worldState, key),
      workspace,
      progress: { ...run.worldState.progress, recommendationWritten: true },
    });
    await runs.updateWorldState(run.id, run.worldState, next, "REASSESSMENT", run.status);
    return runs.load(run.id);
  }

  if (action.type === "submit_episode") {
    const p = run.worldState.progress;
    if (!p.postFactEvalRun || !p.recommendationWritten) {
      throw new Error("Submission requires a post-fact evaluation and production recommendation");
    }
    await append(run.id, "SUBMISSION_COMPLETED", "candidate", key, {
      target_requirement_ids: ["PR-AI-04", "PR-AI-05", "PR-AI-07", "PR-AI-08"],
      workspace_hash: run.worldState.latestEval?.workspaceHash ?? null,
    });
    const submittedState = nextWorldState(run.worldState, {
      ...remember(run.worldState, key),
      episodeStage: "SUBMITTED",
      progress: { ...p, submissionCompleted: true },
    });
    await runs.updateWorldState(run.id, run.worldState, submittedState, "FINAL_SUBMITTED", run.status);
    let current = await runs.load(run.id);
    current = await transition(current, "initial_work_submitted");
    current = await transition(current, "pass_a_processing");
    return runPassA(current);
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
    await analysis.reviewPassB(run.id, record);
    await append(run.id, "REVIEW_RECORDED", "reviewer", key, {
      kind: record.kind,
      decision: record.decision,
      label: record.label,
      disclaimer: record.disclaimer,
    });
    const snapshot = await runs.loadSnapshot(run.id);
    const isAppliedAi = run.worldState.fixtureVersion === APPLIED_AI_WORKFLOW_FIXTURE.fixtureVersion;
    const reviewedClaims = await analysis.loadClaims(run.id);
    const completedWork = isAppliedAi
      ? [
          "Inspected a failed trace",
          "Ran baseline evaluation",
          "Changed executable workflow configuration",
          "Changed evaluation coverage",
          "Committed and revised an architecture decision after LATENCY_001",
          "Submitted a measured production recommendation and defense",
        ]
      : ACME_ROLLOUT_FIXTURE.expectedReceiptItems;
    const conditions = [
      `Fixture ${run.worldState.fixtureVersion}`,
      "Fictional candidate and employer",
      isAppliedAi ? APPLIED_AI_WORKFLOW_FIXTURE.changedFact.title : ACME_ROLLOUT_FIXTURE.changedFact.title,
      ...(isAppliedAi ? ["Synthetic evaluator; proposal code not executed"] : []),
    ];
    const receiptPayload = isAppliedAi
      ? buildAppliedAiReceiptPayload({
          fixtureVersion: run.worldState.fixtureVersion,
          completedWork,
          baseline: run.worldState.baselineEval,
          postFact: run.worldState.latestEval,
          factReleased: run.releasedFacts.includes("LATENCY_001"),
          defenseQuestionExists: snapshot.defense.length > 0,
          defenseResponseExists: snapshot.defense.some((item) => item.response.trim().length > 0),
          claims: reviewedClaims
            .filter((claim) => claim.pass === "B")
            .map((claim) => ({
              id: claim.id,
              requirementId: claim.competency,
              direction: claim.direction,
              summary: claim.claim,
              reviewStatus: claim.review_status,
              supportingEventIds: claim.supporting_event_ids,
              counterevidenceEventIds: claim.counterevidence_event_ids,
            })),
          sourceEventIds: snapshot.events.map((event) => event.id),
          review: record,
          conditions,
        })
      : {
          formatVersion: "se-sandbox-receipt-v1",
          completedWork,
          conditions,
          sourceEventIds: snapshot.events.map((event) => event.id),
          review: record,
          integrityNotice:
            "This SHA-256 value checks payload consistency. It is not an independent credential and is not tamper-proof.",
        };
    const issued = await receipts.issue({
      runId: run.id,
      payload: { ...receiptPayload },
    });
    await append(run.id, "RECEIPT_ISSUED", "system", `${key}:receipt`, {
      publicId: issued.publicId,
      integrityHash: issued.integrityHash,
    });
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
  await admin.from("proof_defense_sessions").update({ status: "completed" }).eq("id", session.id);
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
  await analysis.persistPassB(run.id, result.claims, result.brief, result.interviewPlan);
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
  const interviewPlan = await analysis.loadInterviewPlan(run.id);
  const receipt = await receipts.loadForRun(run.id);
  const admin = sandboxAdmin();
  const { data: brief } = await admin.from("proof_decision_briefs").select("*").eq("run_id", run.id).maybeSingle();
  const { data: session } = await admin.from("proof_defense_sessions").select("id, status").eq("run_id", run.id).maybeSingle();
  let question: { id: string; prompt: string; answer: string; status: string } | null = null;
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
      question = {
        id: first.id as string,
        prompt: first.prompt as string,
        answer: body ?? "",
        status: String(session.status),
      };
    }
  }
  const f = APPLIED_AI_WORKFLOW_FIXTURE;
  const fixtureView =
    run.worldState.fixtureVersion === APPLIED_AI_WORKFLOW_FIXTURE.fixtureVersion
      ? {
          organization: f.organization,
          simulationTitle: f.simulationVersion.title,
          role: f.role,
          candidate: f.candidate,
          candidates: f.candidates,
          resources: f.resources,
          changedFact: f.changedFact,
          defenseQuestion: f.defenseQuestion,
          competencies: f.requirements.map((requirement) => requirement.id),
          requirements: f.requirements,
        }
      : {
          organization: ACME_ROLLOUT_FIXTURE.organization,
          simulationTitle: ACME_ROLLOUT_FIXTURE.simulationVersion.title,
          role: ACME_ROLLOUT_FIXTURE.role,
          candidate: ACME_ROLLOUT_FIXTURE.candidate,
          candidates: ACME_ROLLOUT_FIXTURE.candidates,
          resources: ACME_ROLLOUT_FIXTURE.resources.map((resource) => ({
            ...resource,
            kind: "requirement" as const,
          })),
          changedFact: ACME_ROLLOUT_FIXTURE.changedFact,
          defenseQuestion: ACME_ROLLOUT_FIXTURE.defenseQuestion,
          competencies: ACME_ROLLOUT_FIXTURE.rubric.competencies,
          requirements: [],
        };
  return {
    runId: run.id,
    step: run.worldState.currentStep,
    revision: run.worldState.revision,
    expiresAt: run.worldState.expiresAt,
    constraintDelivered: run.worldState.constraintDelivered,
    episodeStage: run.worldState.episodeStage,
    reviewKind: run.worldState.reviewKind,
    reviewDecision: run.worldState.reviewDecision,
    receiptPublicId: run.worldState.receiptPublicId,
    receiptIntegrityHash: run.worldState.receiptIntegrityHash,
    interviewFinding: run.worldState.interviewFinding,
    hiringOutcome: run.worldState.hiringOutcome,
    fixture: fixtureView,
    workspace: run.worldState.workspace,
    latestEval: run.worldState.latestEval,
    baselineEval: run.worldState.baselineEval,
    progress: run.worldState.progress,
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
      supportingEventIds: claim.supporting_event_ids,
      counterevidenceEventIds: claim.counterevidence_event_ids,
      supportingEvents: claim.supporting_event_ids.map((eventId) => {
        const event = snapshot.events.find((item) => item.id === eventId);
        return { id: eventId, label: event ? `${event.sequence}. ${String(event.event_type)}` : eventId };
      }),
      counterevidenceEvents: claim.counterevidence_event_ids.map((eventId) => {
        const event = snapshot.events.find((item) => item.id === eventId);
        return { id: eventId, label: event ? `${event.sequence}. ${String(event.event_type)}` : eventId };
      }),
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
    interviewPlan,
    receipt: receipt?.payload ?? null,
    labels: {
      banner: "Fictional candidate data · deterministic synthetic runtime · no arbitrary code execution · no live hiring impact.",
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
