import "server-only";
import { createHash, randomUUID } from "crypto";
import { sandboxAdmin } from "./client";
import type { ArtifactContent, EvidenceClaimDraft, RunSnapshot } from "../types";
import { buildEventPayload, sourceForStream } from "./events";
import type {
  AppendEventInput,
  EvidenceAnalysisRepository,
  IssuedReceipt,
  SimulationRunRecord,
  SimulationRunRepository,
  WorkReceiptIssuer,
  SandboxReviewRecord,
} from "./repositories";
import { parseWorldState, type SandboxWorldStateV1 } from "./world-state";
import {
  APPLIED_AI_VERSION_ID,
  getAppliedAiSandboxFixture,
} from "./fixture";
import type { AppliedAiEvalResult, AppliedAiWorkspace } from "./applied-ai-workspace";
import { canonicalize, publicReceiptProjection } from "./receipt-hash";
import {
  claimReviewAuditDraft,
  projectClaimEventIds,
  type ClaimReviewStatus,
  type InterviewPlan,
} from "./review-outputs";

function mapRun(row: Record<string, unknown>): SimulationRunRecord {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    invitationId: String(row.invitation_id),
    worldState: parseWorldState(row.world_state),
    stage: String(row.stage),
    status: String(row.status),
    releasedFacts: Array.isArray(row.released_facts) ? row.released_facts.map(String) : [],
  };
}

export class ProofSimulationRunRepository implements SimulationRunRepository {
  async create(input: {
    organizationId: string;
    invitationId: string;
    worldState: SandboxWorldStateV1;
  }): Promise<SimulationRunRecord> {
    const admin = sandboxAdmin();
    const { data, error } = await admin
      .from("proof_runs")
      .insert({
        invitation_id: input.invitationId,
        organization_id: input.organizationId,
        simulation_version_id: APPLIED_AI_VERSION_ID,
        rubric_version: "aai-proof-v1",
        prompt_version: "aai-structured-analysis-v1",
        stage: "DISCOVERY",
        status: "in_progress",
        world_state: input.worldState,
        expires_at: input.worldState.expiresAt,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message || "sandbox run create failed");
    await admin.from("proof_artifacts").insert({ run_id: data.id });
    return mapRun(data as Record<string, unknown>);
  }

  async load(runId: string): Promise<SimulationRunRecord> {
    const { data, error } = await sandboxAdmin().from("proof_runs").select("*").eq("id", runId).maybeSingle();
    if (error || !data) throw new Error("sandbox run not found");
    return mapRun(data as Record<string, unknown>);
  }

  async loadSnapshot(runId: string): Promise<RunSnapshot> {
    const admin = sandboxAdmin();
    const run = await this.load(runId);
    const { data: events } = await admin.from("proof_events").select("*").eq("run_id", runId).order("sequence", { ascending: true });
    const { data: artifact } = await admin.from("proof_artifacts").select("*").eq("run_id", runId).maybeSingle();
    const { data: session } = await admin.from("proof_defense_sessions").select("id").eq("run_id", runId).maybeSingle();
    let defense: RunSnapshot["defense"] = [];
    if (session) {
      const { data: questions } = await admin
        .from("proof_defense_questions")
        .select("id, prompt, proof_defense_responses(body)")
        .eq("session_id", session.id)
        .order("sort_order", { ascending: true });
      defense = (questions ?? []).map((q) => {
        const responses = q.proof_defense_responses as { body: string }[] | { body: string } | null;
        const body = Array.isArray(responses) ? responses[0]?.body : responses?.body;
        return { prompt: q.prompt as string, response: body ?? "" };
      });
    }
    return {
      run_id: runId,
      stage: run.stage as RunSnapshot["stage"],
      released_facts: run.releasedFacts,
      events: (events ?? []) as RunSnapshot["events"],
      artifact: artifact
        ? {
            diagnosis: artifact.diagnosis,
            recommendation: artifact.recommendation,
            customer_message: artifact.customer_message,
            internal_note: artifact.internal_note,
            assumptions: artifact.assumptions,
            limitations: artifact.limitations,
          }
        : null,
      defense,
    };
  }

  async updateWorldState(
    runId: string,
    previous: SandboxWorldStateV1,
    next: SandboxWorldStateV1,
    stage: string,
    status: string,
  ): Promise<void> {
    if (next.revision !== previous.revision + 1) {
      throw new Error("world_state revision must increase by 1");
    }
    const { data, error } = await sandboxAdmin()
      .from("proof_runs")
      .update({
        world_state: next,
        stage,
        status,
        expires_at: next.expiresAt,
        completed_at: next.currentStep === "finalized" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", runId)
      .eq("world_state->>revision", String(previous.revision))
      .select("id");
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      throw new Error("world_state revision conflict");
    }
  }

  async appendEvent(input: AppendEventInput): Promise<{ id: string; sequence: number }> {
    const now = new Date().toISOString();
    const payload = buildEventPayload({
      stream: input.stream,
      event_type: input.eventType,
      correlation_id: input.correlationId,
      idempotency_key: input.idempotencyKey,
      actor_type: input.actorType,
      actor_id: input.actorId ?? null,
      occurred_at: now,
      received_at: now,
      payload_version: 1,
      payload: input.payload,
    });
    const { data, error } = await sandboxAdmin()
      .from("proof_events")
      .insert({
        run_id: input.runId,
        event_type: input.eventType,
        event_version: 1,
        source: sourceForStream(input.stream),
        actor_type: input.actorType,
        actor_id: input.actorId ?? null,
        stage_id: null,
        occurred_at: now,
        payload,
      })
      .select("id, sequence")
      .single();
    if (error || !data) throw new Error(error?.message || "event append failed");
    return { id: data.id as string, sequence: data.sequence as number };
  }

  async saveArtifact(runId: string, content: ArtifactContent, stage: string): Promise<void> {
    const admin = sandboxAdmin();
    const { error } = await admin.from("proof_artifacts").update({ ...content, updated_at: new Date().toISOString() }).eq("run_id", runId);
    if (error) throw new Error(error.message);
    await admin.from("proof_artifact_versions").insert({
      run_id: runId,
      sequence_at: null,
      content: { kind: "candidate_artifact", stage, ...content },
    });
  }

  async saveWorkspaceVersion(
    runId: string,
    kind: "workspace_snapshot" | "eval_run",
    workspace: AppliedAiWorkspace,
    evaluation: AppliedAiEvalResult | null,
    stage: string,
  ): Promise<void> {
    const { error } = await sandboxAdmin().from("proof_artifact_versions").insert({
      run_id: runId,
      sequence_at: null,
      content: {
        kind,
        artifactVersion: 1,
        fixtureVersion: getAppliedAiSandboxFixture().fixtureVersion,
        stage,
        workspace,
        evaluation,
      },
    });
    if (error) throw new Error(error.message);
  }

  async setReleasedFacts(runId: string, facts: string[]): Promise<void> {
    const { error } = await sandboxAdmin().from("proof_runs").update({ released_facts: facts }).eq("id", runId);
    if (error) throw new Error(error.message);
  }
}

export class ProofEvidenceAnalysisRepository implements EvidenceAnalysisRepository {
  async persistPassA(
    runId: string,
    claims: EvidenceClaimDraft[],
    defensePrompt: string,
    defenseTarget: string,
  ): Promise<void> {
    const admin = sandboxAdmin();
    for (const claim of claims) {
      await insertClaim(runId, "A", claim);
    }
    const { data: session, error } = await admin
      .from("proof_defense_sessions")
      .upsert({ run_id: runId, status: "open" }, { onConflict: "run_id" })
      .select("id")
      .single();
    if (error || !session) throw new Error(error?.message || "defense session failed");
    await admin.from("proof_defense_questions").delete().eq("session_id", session.id);
    await admin.from("proof_defense_questions").insert({
      session_id: session.id,
      prompt: defensePrompt,
      target: defenseTarget,
      sort_order: 0,
    });
  }

  async persistPassB(
    runId: string,
    claims: EvidenceClaimDraft[],
    brief: {
      recommendation: "INTERVIEW" | "HOLD" | "INSUFFICIENT_EVIDENCE";
      why: string;
      strengths: string[];
      concerns: string[];
      probes: string[];
    },
    interviewPlan?: InterviewPlan,
  ): Promise<void> {
    const admin = sandboxAdmin();
    await admin.from("proof_evidence_claims").delete().eq("run_id", runId).eq("pass", "B");
    for (const claim of claims) {
      await insertClaim(runId, "B", claim);
    }
    await admin.from("proof_decision_briefs").upsert(
      {
        run_id: runId,
        recommendation: brief.recommendation,
        why: brief.why,
        strengths: brief.strengths,
        concerns: brief.concerns,
        probes: brief.probes,
        published: false,
      },
      { onConflict: "run_id" },
    );
    if (interviewPlan) {
      const { error: planError } = await admin.from("proof_interview_plans").upsert(
        { run_id: runId, ...interviewPlan },
        { onConflict: "run_id" },
      );
      if (planError) throw new Error(planError.message);
    }
  }

  async loadClaims(runId: string) {
    const { data } = await sandboxAdmin()
      .from("proof_evidence_claims")
      .select("id, pass, claim, competency, direction, confidence, rubric_version, prompt_version, model_version, review_status, proof_claim_events(event_id, relation)")
      .eq("run_id", runId)
      .order("pass");
    return (data ?? []).map((row) => {
      const lineage = projectClaimEventIds(
        (row.proof_claim_events ?? []) as Array<{ event_id: string; relation: string }>,
      );
      return {
        id: row.id as string,
        pass: row.pass as string,
        claim: row.claim as string,
        competency: row.competency as string,
        direction: row.direction as EvidenceClaimDraft["direction"],
        confidence: row.confidence as EvidenceClaimDraft["confidence"],
        supporting_event_ids: lineage.supportingEventIds,
        counterevidence_event_ids: lineage.counterevidenceEventIds,
        rubric_version: row.rubric_version as string,
        prompt_version: row.prompt_version as string,
        model_version: row.model_version as string,
        review_status: row.review_status as string,
      };
    });
  }

  async loadInterviewPlan(runId: string): Promise<InterviewPlan | null> {
    const { data } = await sandboxAdmin()
      .from("proof_interview_plans")
      .select("confirm, investigate, challenge")
      .eq("run_id", runId)
      .maybeSingle();
    return data
      ? {
          confirm: Array.isArray(data.confirm) ? data.confirm.map(String) : [],
          investigate: Array.isArray(data.investigate) ? data.investigate.map(String) : [],
          challenge: Array.isArray(data.challenge) ? data.challenge.map(String) : [],
        }
      : null;
  }

  async reviewPassB(runId: string, record: SandboxReviewRecord): Promise<void> {
    const admin = sandboxAdmin();
    const { data: claims, error } = await admin
      .from("proof_evidence_claims")
      .select("id, review_status")
      .eq("run_id", runId)
      .eq("pass", "B");
    if (error) throw new Error(error.message);
    for (const claim of claims ?? []) {
      const audit = claimReviewAuditDraft({
        claimId: String(claim.id),
        beforeStatus: String(claim.review_status) as ClaimReviewStatus,
        record,
      });
      const { error: auditError } = await admin.from("proof_claim_reviews").insert(audit);
      if (auditError) throw new Error(auditError.message);
      const { error: updateError } = await admin
        .from("proof_evidence_claims")
        .update({ review_status: audit.after.review_status })
        .eq("id", claim.id);
      if (updateError) throw new Error(updateError.message);
    }
    const { error: briefError } = await admin
      .from("proof_decision_briefs")
      .update({ published: record.decision === "approve" })
      .eq("run_id", runId);
    if (briefError) throw new Error(briefError.message);
  }
}

async function insertClaim(runId: string, pass: "A" | "B", claim: EvidenceClaimDraft): Promise<void> {
  const admin = sandboxAdmin();
  const { data: row, error } = await admin
    .from("proof_evidence_claims")
    .insert({
      run_id: runId,
      pass,
      claim: claim.claim,
      competency: claim.competency,
      direction: claim.direction,
      confidence: claim.confidence,
      rubric_version: claim.rubric_version,
      prompt_version: claim.prompt_version,
      model_version: claim.model_version,
      review_status: "REVIEW_REQUIRED",
    })
    .select("id")
    .single();
  if (error || !row) throw new Error(error?.message || "claim insert failed");
  const links = [
    ...claim.supporting_event_ids.map((eventId) => ({ claim_id: row.id, event_id: eventId, relation: "supporting" })),
    ...claim.counterevidence_event_ids.map((eventId) => ({ claim_id: row.id, event_id: eventId, relation: "counterevidence" })),
  ];
  if (links.length > 0) {
    const { error: linkError } = await admin.from("proof_claim_events").insert(links);
    if (linkError) throw new Error(linkError.message);
  }
}

const RECEIPT_KIND = "sandbox_work_receipt";

export class ArtifactWorkReceiptIssuer implements WorkReceiptIssuer {
  async issue(input: { runId: string; payload: Record<string, unknown> }): Promise<IssuedReceipt> {
    const publicId = randomUUID();
    const payload = canonicalize({
      ...input.payload,
      kind: RECEIPT_KIND,
      publicId,
      label: "Fictional sandbox work receipt. Not valid for employment verification.",
      issuedAt: new Date().toISOString(),
    });
    const integrityHash = createHash("sha256").update(payload.canonical).digest("hex");
    const stored = { ...payload.object, integrityHash };
    const { error } = await sandboxAdmin().from("proof_artifact_versions").insert({
      run_id: input.runId,
      sequence_at: null,
      content: stored,
    });
    if (error) throw new Error(error.message);
    return { publicId, integrityHash, payload: stored };
  }

  async loadPublic(publicId: string): Promise<IssuedReceipt | null> {
    const { data } = await sandboxAdmin()
      .from("proof_artifact_versions")
      .select("content, run_id")
      .contains("content", { kind: RECEIPT_KIND, publicId })
      .limit(1)
      .maybeSingle();
    if (!data?.content) return null;
    const content = data.content as Record<string, unknown>;
    return {
      publicId,
      integrityHash: String(content.integrityHash ?? ""),
      payload: publicReceiptProjection(content),
    };
  }

  async loadForRun(runId: string): Promise<IssuedReceipt | null> {
    const { data } = await sandboxAdmin()
      .from("proof_artifact_versions")
      .select("content")
      .eq("run_id", runId)
      .contains("content", { kind: RECEIPT_KIND })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data?.content) return null;
    const content = data.content as Record<string, unknown>;
    return {
      publicId: String(content.publicId ?? ""),
      integrityHash: String(content.integrityHash ?? ""),
      payload: publicReceiptProjection(content),
    };
  }
}

export { canonicalize, publicReceiptProjection } from "./receipt-hash";

