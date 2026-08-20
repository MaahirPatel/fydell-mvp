import "server-only";
import { randomBytes } from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { FACT_AUTH, FACT_CUSTOMER, FACT_SALES } from "./state-machine";
import {
  PROOF_ROLE_ID,
  PROOF_VERSION_ID,
  sourceForEventType,
  type AnalysisJobType,
  type ArtifactContent,
  type EventType,
  type ProofEventRecord,
  type ProofStage,
  type RunSnapshot,
} from "./types";

const FACT_COPY: Record<string, { stakeholder: string; body: string }> = {
  [FACT_AUTH]: {
    stakeholder: "engineering",
    body: "The endpoint you planned to use will not support their authentication method.",
  },
  [FACT_SALES]: {
    stakeholder: "sales",
    body: "I already promised the customer this would work Friday. Don't complicate things.",
  },
  [FACT_CUSTOMER]: {
    stakeholder: "customer",
    body: "If Friday doesn't work, we're evaluating your competitor.",
  },
};

export function proofAdmin() {
  return createAdminSupabaseClient();
}

export async function appendEvent(input: {
  runId: string;
  eventType: EventType;
  actorType: string;
  actorId?: string;
  stageId?: string;
  occurredAt?: string;
  payload?: Record<string, unknown>;
}): Promise<ProofEventRecord> {
  const admin = proofAdmin();
  const { data, error } = await admin
    .from("proof_events")
    .insert({
      run_id: input.runId,
      event_type: input.eventType,
      event_version: 1,
      source: sourceForEventType(input.eventType),
      actor_type: input.actorType,
      actor_id: input.actorId ?? null,
      stage_id: input.stageId ?? null,
      occurred_at: input.occurredAt ?? new Date().toISOString(),
      payload: input.payload ?? {},
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message || "failed to append event");
  return data as ProofEventRecord;
}

export async function loadRunSnapshot(runId: string): Promise<RunSnapshot> {
  const admin = proofAdmin();
  const { data: run, error: runError } = await admin.from("proof_runs").select("*").eq("id", runId).single();
  if (runError || !run) throw new Error(runError?.message || "run not found");
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
    stage: run.stage as ProofStage,
    released_facts: run.released_facts ?? [],
    events: (events ?? []) as ProofEventRecord[],
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

export async function createInvitation(input: { organizationId: string; email: string; createdBy: string }) {
  const admin = proofAdmin();
  const token = randomBytes(24).toString("hex");
  const { data, error } = await admin
    .from("proof_invitations")
    .insert({
      organization_id: input.organizationId,
      role_id: PROOF_ROLE_ID,
      simulation_version_id: PROOF_VERSION_ID,
      email: input.email.toLowerCase(),
      token,
      created_by: input.createdBy,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message || "invite failed");
  await admin.from("proof_product_events").insert({
    organization_id: input.organizationId,
    name: "candidate_invited",
    payload: { invitation_id: data.id },
  });
  return data;
}

export async function startRunFromToken(token: string, candidateUserId: string | null) {
  const admin = proofAdmin();
  const { data: invite } = await admin.from("proof_invitations").select("*").eq("token", token).maybeSingle();
  if (!invite) throw new Error("Invitation is not valid.");
  const { data: existing } = await admin.from("proof_runs").select("*").eq("invitation_id", invite.id).maybeSingle();
  if (existing) return { invite, run: existing };
  const { data: version } = await admin.from("proof_simulation_versions").select("*").eq("id", invite.simulation_version_id).single();
  const { data: run, error: runError } = await admin
    .from("proof_runs")
    .insert({
      invitation_id: invite.id,
      organization_id: invite.organization_id,
      candidate_user_id: candidateUserId,
      simulation_version_id: invite.simulation_version_id,
      rubric_version: version?.rubric_version ?? "adaptability_v1",
      prompt_version: version?.prompt_version ?? "evidence_extract_v1",
      stage: "DISCOVERY",
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
    .select("*")
    .single();
  if (runError || !run) throw new Error(runError?.message || "run create failed");
  await admin.from("proof_artifacts").insert({ run_id: run.id });
  await admin.from("proof_invitations").update({ status: "in_progress", candidate_user_id: candidateUserId }).eq("id", invite.id);
  await appendEvent({ runId: run.id, eventType: "STAGE_CHANGED", actorType: "system", stageId: "DISCOVERY", payload: { to: "DISCOVERY" } });
  return { invite, run };
}

export async function saveArtifact(runId: string, content: ArtifactContent, stage: string) {
  const admin = proofAdmin();
  const { error } = await admin.from("proof_artifacts").update({ ...content, updated_at: new Date().toISOString() }).eq("run_id", runId);
  if (error) throw new Error(error.message);
  const { data: events } = await admin.from("proof_events").select("sequence").eq("run_id", runId).order("sequence", { ascending: false }).limit(1);
  await admin.from("proof_artifact_versions").insert({ run_id: runId, sequence_at: events?.[0]?.sequence ?? null, content });
  return appendEvent({ runId, eventType: "ARTIFACT_REVISION", actorType: "candidate", stageId: stage, payload: { fields: Object.keys(content) } });
}

export async function releaseFact(runId: string, factId: string, stage: ProofStage) {
  const admin = proofAdmin();
  const copy = FACT_COPY[factId];
  if (!copy) throw new Error("unknown fact");
  const { data: run } = await admin.from("proof_runs").select("released_facts, world_state").eq("id", runId).single();
  const released: string[] = run?.released_facts ?? [];
  if (released.includes(factId)) return;
  await admin
    .from("proof_runs")
    .update({
      released_facts: [...released, factId],
      world_state: { ...(run?.world_state as Record<string, unknown> | null), [factId]: true },
      stage: factId === FACT_AUTH ? "AUTH_CONSTRAINT" : factId === FACT_SALES ? "STAKEHOLDER_CONFLICT" : "CUSTOMER_PRESSURE",
    })
    .eq("id", runId);
  await appendEvent({
    runId,
    eventType: "FACT_RELEASED",
    actorType: "world",
    stageId: stage,
    payload: { fact_id: factId, materiality: factId === FACT_AUTH ? "critical" : "secondary" },
  });
  await admin.from("proof_messages").insert({ run_id: runId, agent_id: copy.stakeholder, direction: "inbound", body: copy.body });
  await appendEvent({
    runId,
    eventType: "AGENT_MESSAGE_SENT",
    actorType: "agent",
    actorId: copy.stakeholder,
    stageId: stage,
    payload: { fact_id: factId, body: copy.body },
  });
}

export async function enqueueJob(runId: string, jobType: AnalysisJobType) {
  const admin = proofAdmin();
  const { data, error } = await admin
    .from("proof_analysis_jobs")
    .upsert(
      { run_id: runId, job_type: jobType, idempotency_key: `${runId}:${jobType}`, status: "queued", attempts: 0, last_error: null },
      { onConflict: "job_type,idempotency_key" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function audit(actor: string, action: string, entity: string, entityId: string, before?: unknown, after?: unknown) {
  await proofAdmin().from("proof_audit_logs").insert({
    actor,
    action,
    entity,
    entity_id: entityId,
    before: before ?? null,
    after: after ?? null,
  });
}
