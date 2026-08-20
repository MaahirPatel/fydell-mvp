import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { assertOrderedEvents } from "./workflow";
import type {
  AnalysisJob,
  ArtifactRevision,
  ChangedFact,
  ClaimReviewStatus,
  DecisionBrief,
  DefenseQuestion,
  EvidenceClaim,
  GoldenPathEvent,
  GoldenPathRun,
} from "./contracts";

interface ClaimMetadata {
  sourceArtifactIds: string[];
  supportingEventIds: string[];
  counterEventIds: string[];
  reviewerNote: string | null;
}

interface BriefMetadata {
  candidateLabel: string;
  roleKey: DecisionBrief["roleKey"];
  recommendation: DecisionBrief["recommendation"];
  claimIds: string[];
  publishedAt: string;
}

interface GoldenPathMetadata {
  candidateLabel: string;
  roleKey: GoldenPathRun["roleKey"];
  scenarioVersion: GoldenPathRun["scenarioVersion"];
  engineVersion: GoldenPathRun["engineVersion"];
  status: GoldenPathRun["status"];
  changedFact: ChangedFact;
  claimMetadata: Record<string, ClaimMetadata>;
  defenseSourceClaimIds: Record<string, string>;
  analysisJobInputVersion: AnalysisJob["inputVersion"] | null;
  brief: BriefMetadata | null;
}

interface RunRow {
  id: string;
  rubric_version: string;
  prompt_version: string;
  world_state: unknown;
}

interface EventRow {
  id: string;
  run_id: string;
  sequence: number;
  event_type: GoldenPathEvent["eventType"];
  event_version: 1;
  actor_type: GoldenPathEvent["actorType"];
  actor_id: string | null;
  stage_id: GoldenPathEvent["stageId"];
  occurred_at: string;
  recorded_at: string;
  source: GoldenPathEvent["source"];
  payload: GoldenPathEvent["payload"];
}

interface ArtifactRow {
  id: string;
  sequence_at: number | null;
  content: unknown;
  created_at: string;
}

interface JobRow {
  id: string;
  run_id: string;
  job_type: AnalysisJob["jobType"];
  status: "queued" | "running" | "succeeded" | "failed";
  attempts: number;
  locked_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  last_error: string | null;
  result_version: "1" | null;
  idempotency_key: string;
}

interface ClaimRow {
  id: string;
  pass: "A" | "B";
  claim: string;
  competency: EvidenceClaim["competency"];
  direction: EvidenceClaim["direction"];
  confidence: EvidenceClaim["confidence"];
  model_version: string;
  rubric_version: string;
  prompt_version: string;
  review_status: ClaimReviewStatus;
}

interface ClaimEventRow {
  claim_id: string;
  event_id: string;
  relation: "supporting" | "counterevidence";
}

interface DefenseSessionRow {
  id: string;
  status: "open" | "completed";
}

interface DefenseQuestionRow {
  id: string;
  prompt: string;
  target: DefenseQuestion["target"];
  sort_order: number;
}

interface DefenseResponseRow {
  question_id: string;
  body: string;
}

interface BriefRow {
  id: string;
  why: string;
  probes: unknown;
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function strings(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${label} must be a string array.`);
  }
  return value as string[];
}

function metadataFrom(value: unknown): GoldenPathMetadata {
  const worldState = object(value, "proof_runs.world_state");
  const metadata = object(worldState.goldenPath, "proof_runs.world_state.goldenPath");
  return metadata as unknown as GoldenPathMetadata;
}

function databaseStatus(status: GoldenPathRun["status"]): string {
  if (status === "DEFENSE_REQUIRED") return "awaiting_defense";
  if (status === "DEFENSE_COMPLETED" || status === "REVIEW_REQUIRED") return "awaiting_review";
  if (status === "PUBLISHED") return "ready";
  return "in_progress";
}

function databaseStage(status: GoldenPathRun["status"]): string {
  if (status === "INVITED" || status === "IN_PROGRESS") return "DISCOVERY";
  if (status === "COMPLETED") return "FINAL_SUBMITTED";
  if (status === "DEFENSE_REQUIRED" || status === "DEFENSE_COMPLETED") return "DEFENSE";
  return "COMPLETE";
}

function databaseJobStatus(status: AnalysisJob["status"]): JobRow["status"] {
  if (status === "PENDING") return "queued";
  if (status === "RUNNING") return "running";
  if (status === "COMPLETE") return "succeeded";
  return "failed";
}

function goldenPathJobStatus(status: JobRow["status"]): AnalysisJob["status"] {
  if (status === "queued") return "PENDING";
  if (status === "running") return "RUNNING";
  if (status === "succeeded") return "COMPLETE";
  return "FAILED";
}

function iso(value: string): string {
  return new Date(value).toISOString();
}

async function deleteRunChildren(runId: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  const tables = [
    "proof_decision_briefs",
    "proof_defense_sessions",
    "proof_evidence_claims",
    "proof_analysis_jobs",
    "proof_artifact_versions",
    "proof_events",
  ] as const;
  for (const table of tables) {
    const { error } = await admin.from(table).delete().eq("run_id", runId);
    if (error) throw new Error(`Could not clear ${table}: ${error.message}`);
  }
}

/**
 * Persists into an existing proof_runs fixture. The caller owns creation of the
 * organization, invitation, and run because GoldenPathRun deliberately carries
 * no tenancy or invitation identity.
 */
export async function saveRun(run: GoldenPathRun): Promise<void> {
  assertOrderedEvents(run.events);
  const admin = createAdminSupabaseClient();
  const { data: existing, error: existingError } = await admin
    .from("proof_runs")
    .select("id")
    .eq("id", run.id)
    .maybeSingle();
  if (existingError) throw new Error(`Could not inspect proof run: ${existingError.message}`);
  if (!existing) {
    throw new Error(
      `proof_runs fixture ${run.id} does not exist; create its organization and invitation first.`
    );
  }

  const claims = [run.initialClaim, run.claim].filter(
    (claim): claim is EvidenceClaim => claim !== null
  );
  const claimMetadata = Object.fromEntries(
    claims.map((claim) => [
      claim.id,
      {
        sourceArtifactIds: claim.sourceArtifactIds,
        supportingEventIds: claim.supportingEventIds,
        counterEventIds: claim.counterEventIds,
        reviewerNote: claim.reviewerNote,
      } satisfies ClaimMetadata,
    ])
  );
  const metadata: GoldenPathMetadata = {
    candidateLabel: run.candidateLabel,
    roleKey: run.roleKey,
    scenarioVersion: run.scenarioVersion,
    engineVersion: run.engineVersion,
    status: run.status,
    changedFact: run.changedFact,
    claimMetadata,
    defenseSourceClaimIds: Object.fromEntries(
      run.defenseQuestions.map((question) => [question.id, question.sourceClaimId])
    ),
    analysisJobInputVersion: run.analysisJob?.inputVersion ?? null,
    brief: run.brief
      ? {
          candidateLabel: run.brief.candidateLabel,
          roleKey: run.brief.roleKey,
          recommendation: run.brief.recommendation,
          claimIds: run.brief.claimIds,
          publishedAt: run.brief.publishedAt,
        }
      : null,
  };

  await deleteRunChildren(run.id);
  const releasedFacts = run.events.some((event) => event.eventType === "FACT_RELEASED")
    ? [run.changedFact.factId]
    : [];
  const { error: runError } = await admin
    .from("proof_runs")
    .update({
      rubric_version: run.rubricVersion,
      prompt_version: run.promptVersion,
      stage: databaseStage(run.status),
      status: databaseStatus(run.status),
      released_facts: releasedFacts,
      world_state: { goldenPath: metadata },
      completed_at:
        run.status === "INVITED" || run.status === "IN_PROGRESS"
          ? null
          : run.events.at(-1)?.recordedAt ?? null,
    })
    .eq("id", run.id);
  if (runError) throw new Error(`Could not update proof run: ${runError.message}`);

  const eventSequences = new Map<string, number>();
  for (const event of run.events) {
    const { data, error } = await admin
      .from("proof_events")
      .insert({
        id: event.id,
        run_id: run.id,
        event_type: event.eventType,
        event_version: event.eventVersion,
        source: event.source,
        actor_type: event.actorType,
        actor_id: event.actorId ?? null,
        stage_id: event.stageId,
        occurred_at: event.occurredAt,
        recorded_at: event.recordedAt,
        payload: event.payload,
      })
      .select("sequence")
      .single();
    if (error || !data) throw new Error(`Could not persist event ${event.id}: ${error?.message}`);
    const sequence = Number(data.sequence);
    if (sequence !== event.sequence) {
      throw new Error(
        `Database assigned sequence ${sequence} to ${event.id}; expected ${event.sequence}.`
      );
    }
    eventSequences.set(event.id, sequence);
  }

  if (run.artifacts.length) {
    const { error } = await admin.from("proof_artifact_versions").insert(
      run.artifacts.map((artifact) => ({
        id: artifact.id,
        run_id: run.id,
        sequence_at: eventSequences.get(artifact.sourceEventId) ?? null,
        content: {
          artifactId: artifact.artifactId,
          revision: artifact.revision,
          content: artifact.content,
          beforeFact: artifact.beforeFact,
          sourceEventId: artifact.sourceEventId,
        },
        created_at: artifact.createdAt,
      }))
    );
    if (error) throw new Error(`Could not persist artifacts: ${error.message}`);
  }

  if (run.analysisJob) {
    const { error } = await admin.from("proof_analysis_jobs").insert({
      id: run.analysisJob.id,
      run_id: run.id,
      job_type: run.analysisJob.jobType,
      idempotency_key: run.analysisJob.idempotencyKey,
      status: databaseJobStatus(run.analysisJob.status),
      attempts: run.analysisJob.attempts,
      last_error: run.analysisJob.lastError,
      locked_at: run.analysisJob.lockedAt,
      started_at: run.analysisJob.startedAt,
      completed_at: run.analysisJob.completedAt,
      result_version: run.analysisJob.resultVersion,
    });
    if (error) throw new Error(`Could not persist analysis job: ${error.message}`);
  }

  for (const claim of claims) {
    const pass = run.initialClaim?.id === claim.id ? "A" : "B";
    const { error: claimError } = await admin.from("proof_evidence_claims").insert({
      id: claim.id,
      run_id: run.id,
      pass,
      claim: claim.statement,
      competency: claim.competency,
      direction: claim.direction,
      confidence: claim.confidence,
      rubric_version: claim.rubricVersion,
      prompt_version: claim.promptVersion,
      model_version: claim.modelVersion,
      review_status: claim.reviewStatus,
    });
    if (claimError) throw new Error(`Could not persist claim ${claim.id}: ${claimError.message}`);

    const links = [
      ...claim.supportingEventIds.map((eventId) => ({
        claim_id: claim.id,
        event_id: eventId,
        relation: "supporting",
      })),
      ...claim.counterEventIds.map((eventId) => ({
        claim_id: claim.id,
        event_id: eventId,
        relation: "counterevidence",
      })),
    ];
    if (links.length) {
      const { error: linksError } = await admin.from("proof_claim_events").insert(links);
      if (linksError) {
        throw new Error(`Could not persist provenance for ${claim.id}: ${linksError.message}`);
      }
    }
  }

  if (run.defenseQuestions.length) {
    const { data: session, error: sessionError } = await admin
      .from("proof_defense_sessions")
      .insert({
        run_id: run.id,
        status: run.defenseQuestions.every((question) => question.response !== null)
          ? "completed"
          : "open",
      })
      .select("id")
      .single();
    if (sessionError || !session) {
      throw new Error(`Could not persist defense session: ${sessionError?.message}`);
    }
    const { error: questionError } = await admin.from("proof_defense_questions").insert(
      run.defenseQuestions.map((question, index) => ({
        id: question.id,
        session_id: session.id,
        prompt: question.prompt,
        target: question.target,
        sort_order: index,
      }))
    );
    if (questionError) throw new Error(`Could not persist defense questions: ${questionError.message}`);
    const responses = run.defenseQuestions
      .filter(
        (question): question is DefenseQuestion & { response: string } =>
          question.response !== null
      )
      .map((question) => ({ question_id: question.id, body: question.response }));
    if (responses.length) {
      const { error: responseError } = await admin
        .from("proof_defense_responses")
        .insert(responses);
      if (responseError) {
        throw new Error(`Could not persist defense responses: ${responseError.message}`);
      }
    }
  }

  if (run.brief) {
    const { error } = await admin.from("proof_decision_briefs").insert({
      id: run.brief.id,
      run_id: run.id,
      recommendation:
        run.brief.recommendation === "WORTH_INTERVIEWING"
          ? "INTERVIEW"
          : "INSUFFICIENT_EVIDENCE",
      why: run.brief.why,
      strengths: [],
      concerns: [],
      probes: run.brief.interviewProbes,
      published: true,
      created_at: run.brief.publishedAt,
    });
    if (error) throw new Error(`Could not persist decision brief: ${error.message}`);
  }
}

export async function loadRun(runId: string): Promise<GoldenPathRun> {
  const admin = createAdminSupabaseClient();
  const [
    runResult,
    eventResult,
    artifactResult,
    jobResult,
    claimResult,
    sessionResult,
    briefResult,
  ] = await Promise.all([
    admin.from("proof_runs").select("id,rubric_version,prompt_version,world_state").eq("id", runId).single(),
    admin.from("proof_events").select("*").eq("run_id", runId).order("sequence"),
    admin.from("proof_artifact_versions").select("*").eq("run_id", runId).order("created_at"),
    admin.from("proof_analysis_jobs").select("*").eq("run_id", runId).maybeSingle(),
    admin.from("proof_evidence_claims").select("*").eq("run_id", runId).order("pass"),
    admin.from("proof_defense_sessions").select("id,status").eq("run_id", runId).maybeSingle(),
    admin.from("proof_decision_briefs").select("id,why,probes").eq("run_id", runId).maybeSingle(),
  ]);
  if (runResult.error || !runResult.data) {
    throw new Error(`Could not load proof run: ${runResult.error?.message ?? "not found"}`);
  }
  for (const result of [eventResult, artifactResult, jobResult, claimResult, sessionResult, briefResult]) {
    if (result.error) throw new Error(`Could not load proof run children: ${result.error.message}`);
  }

  const runRow = runResult.data as unknown as RunRow;
  const metadata = metadataFrom(runRow.world_state);
  const events = (eventResult.data as unknown as EventRow[]).map(
    (row): GoldenPathEvent => ({
      id: row.id,
      runId: row.run_id,
      sequence: row.sequence,
      eventType: row.event_type,
      eventVersion: row.event_version,
      actorType: row.actor_type,
      ...(row.actor_id ? { actorId: row.actor_id } : {}),
      stageId: row.stage_id,
      occurredAt: iso(row.occurred_at),
      recordedAt: iso(row.recorded_at),
      source: row.source,
      payload: row.payload,
    })
  );
  assertOrderedEvents(events);

  const artifacts = (artifactResult.data as unknown as ArtifactRow[])
    .map((row): ArtifactRevision => {
      const content = object(row.content, `artifact ${row.id}`);
      return {
        id: row.id,
        artifactId: String(content.artifactId),
        revision: Number(content.revision),
        content: String(content.content),
        createdAt: iso(row.created_at),
        beforeFact: content.beforeFact === true,
        sourceEventId: String(content.sourceEventId),
      };
    })
    .sort((left, right) => left.revision - right.revision);

  const claimRows = claimResult.data as unknown as ClaimRow[];
  const claimIds = claimRows.map((claim) => claim.id);
  const { data: claimEventData, error: claimEventError } = claimIds.length
    ? await admin.from("proof_claim_events").select("claim_id,event_id,relation").in("claim_id", claimIds)
    : { data: [], error: null };
  if (claimEventError) throw new Error(`Could not load claim provenance: ${claimEventError.message}`);
  const claimEvents = claimEventData as unknown as ClaimEventRow[];
  const toClaim = (row: ClaimRow): EvidenceClaim => {
    const stored = metadata.claimMetadata[row.id];
    if (!stored) throw new Error(`Missing golden-path metadata for claim ${row.id}.`);
    const links = claimEvents.filter((link) => link.claim_id === row.id);
    const persistedSupporting = new Set(
      links.filter((link) => link.relation === "supporting").map((link) => link.event_id)
    );
    const persistedCounter = new Set(
      links.filter((link) => link.relation === "counterevidence").map((link) => link.event_id)
    );
    if (
      stored.supportingEventIds.some((eventId) => !persistedSupporting.has(eventId)) ||
      stored.counterEventIds.some((eventId) => !persistedCounter.has(eventId))
    ) {
      throw new Error(`Claim ${row.id} is missing persisted provenance links.`);
    }
    return {
      id: row.id,
      competency: row.competency,
      direction: row.direction,
      confidence: row.confidence,
      statement: row.claim,
      supportingEventIds: stored.supportingEventIds,
      counterEventIds: stored.counterEventIds,
      sourceArtifactIds: stored.sourceArtifactIds,
      modelVersion: row.model_version,
      rubricVersion: row.rubric_version,
      promptVersion: row.prompt_version,
      reviewStatus: row.review_status,
      reviewerNote: stored.reviewerNote,
    };
  };
  const initialClaimRow = claimRows.find((row) => row.pass === "A");
  const finalClaimRow = claimRows.find((row) => row.pass === "B");

  const session = sessionResult.data as unknown as DefenseSessionRow | null;
  let defenseQuestions: DefenseQuestion[] = [];
  if (session) {
    const { data: questionData, error: questionError } = await admin
      .from("proof_defense_questions")
      .select("id,prompt,target,sort_order")
      .eq("session_id", session.id)
      .order("sort_order");
    if (questionError) throw new Error(`Could not load defense questions: ${questionError.message}`);
    const questionRows = questionData as unknown as DefenseQuestionRow[];
    const questionIds = questionRows.map((question) => question.id);
    const { data: responseData, error: responseError } = questionIds.length
      ? await admin
          .from("proof_defense_responses")
          .select("question_id,body")
          .in("question_id", questionIds)
      : { data: [], error: null };
    if (responseError) throw new Error(`Could not load defense responses: ${responseError.message}`);
    const responses = responseData as unknown as DefenseResponseRow[];
    defenseQuestions = questionRows.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      target: question.target,
      sourceClaimId: metadata.defenseSourceClaimIds[question.id],
      response:
        responses.find((response) => response.question_id === question.id)?.body ?? null,
    }));
  }

  const jobRow = jobResult.data as unknown as JobRow | null;
  const analysisJob: AnalysisJob | null = jobRow
    ? {
        id: jobRow.id,
        runId: jobRow.run_id,
        jobType: jobRow.job_type,
        inputVersion: metadata.analysisJobInputVersion ?? "1",
        status: goldenPathJobStatus(jobRow.status),
        attempts: jobRow.attempts,
        lockedAt: jobRow.locked_at ? iso(jobRow.locked_at) : null,
        startedAt: jobRow.started_at ? iso(jobRow.started_at) : null,
        completedAt: jobRow.completed_at ? iso(jobRow.completed_at) : null,
        lastError: jobRow.last_error,
        resultVersion: jobRow.result_version,
        idempotencyKey: jobRow.idempotency_key,
      }
    : null;

  const briefRow = briefResult.data as unknown as BriefRow | null;
  const briefMetadata = metadata.brief;
  const brief: DecisionBrief | null =
    briefRow && briefMetadata
      ? {
          id: briefRow.id,
          runId,
          candidateLabel: briefMetadata.candidateLabel,
          roleKey: briefMetadata.roleKey,
          recommendation: briefMetadata.recommendation,
          why: briefRow.why,
          claimIds: briefMetadata.claimIds,
          interviewProbes: strings(briefRow.probes, "proof_decision_briefs.probes"),
          publishedAt: briefMetadata.publishedAt,
        }
      : null;

  return {
    id: runRow.id,
    candidateLabel: metadata.candidateLabel,
    roleKey: metadata.roleKey,
    scenarioVersion: metadata.scenarioVersion,
    engineVersion: metadata.engineVersion,
    rubricVersion: runRow.rubric_version as GoldenPathRun["rubricVersion"],
    promptVersion: runRow.prompt_version as GoldenPathRun["promptVersion"],
    status: metadata.status,
    changedFact: metadata.changedFact,
    events,
    artifacts,
    analysisJob,
    initialClaim: initialClaimRow ? toClaim(initialClaimRow) : null,
    defenseQuestions,
    claim: finalClaimRow ? toClaim(finalClaimRow) : null,
    brief,
  };
}
