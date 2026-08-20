import { NextResponse } from "next/server";
import { proofAdmin, loadRunSnapshot, appendEvent, saveArtifact, releaseFact } from "@/lib/sim-engine/proof/db";
import { cannedAgentReply, validateAgentOutput } from "@/lib/sim-engine/proof/agents";
import { factTriggerSatisfied, FACT_AUTH } from "@/lib/sim-engine/proof/state-machine";
import type { ArtifactContent, EventType, ProofStage } from "@/lib/sim-engine/proof/types";
import { isEventType } from "@/lib/sim-engine/proof/types";
import { enqueueJob, processQueuedJobs } from "@/lib/sim-engine/proof/jobs";

async function getRun(runId: string) {
  const admin = proofAdmin();
  const { data } = await admin.from("proof_runs").select("*").eq("id", runId).maybeSingle();
  return data;
}

export async function GET(_request: Request, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params;
  const run = await getRun(runId);
  if (!run) return NextResponse.json({ error: "not found" }, { status: 404 });
  const snapshot = await loadRunSnapshot(runId);
  const admin = proofAdmin();
  const { data: messages } = await admin.from("proof_messages").select("*").eq("run_id", runId).order("created_at");
  return NextResponse.json({ run, snapshot, messages: messages ?? [] });
}

export async function POST(request: Request, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params;
  const run = await getRun(runId);
  if (!run) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = (await request.json()) as {
    action?: string;
    artifact?: ArtifactContent;
    agentId?: "customer" | "engineering" | "sales";
    message?: string;
    eventType?: string;
    payload?: Record<string, unknown>;
    resourceId?: string;
  };

  const stage = run.stage as ProofStage;
  const released: string[] = run.released_facts ?? [];

  if (body.action === "telemetry" && body.eventType && isEventType(body.eventType)) {
    const type = body.eventType as EventType;
    if (!["TAB_BLUR", "COPY", "PASTE", "INACTIVITY"].includes(type)) {
      return NextResponse.json({ error: "invalid telemetry" }, { status: 400 });
    }
    await appendEvent({ runId, eventType: type, actorType: "candidate", stageId: stage, payload: body.payload });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "open_resource") {
    await appendEvent({
      runId,
      eventType: "RESOURCE_OPENED",
      actorType: "candidate",
      stageId: stage,
      payload: { resourceId: body.resourceId ?? "api-docs" },
    });
    const admin = proofAdmin();
    if (stage === "DISCOVERY") {
      await admin.from("proof_runs").update({ stage: "INVESTIGATION" }).eq("id", runId);
      await appendEvent({ runId, eventType: "STAGE_CHANGED", actorType: "system", payload: { to: "INVESTIGATION" } });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "save_artifact" && body.artifact) {
    await saveArtifact(runId, body.artifact, stage);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "message" && body.agentId && body.message) {
    const admin = proofAdmin();
    await admin.from("proof_messages").insert({
      run_id: runId,
      agent_id: body.agentId,
      direction: "outbound",
      body: body.message,
    });
    await appendEvent({
      runId,
      eventType: "CANDIDATE_MESSAGE_SENT",
      actorType: "candidate",
      actorId: body.agentId,
      stageId: stage,
      payload: { agent_id: body.agentId, body: body.message },
    });
    const reply = cannedAgentReply({ agent: body.agentId, message: body.message, released });
    if (!validateAgentOutput(body.agentId, reply.body, released)) {
      await appendEvent({
        runId,
        eventType: "AI_RESPONSE_RETRIED",
        actorType: "system",
        payload: { reason: "validation_failed" },
      });
      return NextResponse.json({ error: "agent validation failed" }, { status: 409 });
    }
    await admin.from("proof_messages").insert({
      run_id: runId,
      agent_id: body.agentId,
      direction: "inbound",
      body: reply.body,
    });
    await appendEvent({
      runId,
      eventType: "AGENT_MESSAGE_SENT",
      actorType: "agent",
      actorId: body.agentId,
      stageId: stage,
      payload: { body: reply.body },
    });
    if (
      factTriggerSatisfied({
        factId: "CUSTOMER_001",
        released,
        stage,
        preliminarySubmitted: released.includes(FACT_AUTH),
        authAcknowledged: released.includes(FACT_AUTH),
        salesReleased: released.includes("SALES_001"),
      })
    ) {
      await releaseFact(runId, "CUSTOMER_001", stage);
    }
    return NextResponse.json({ ok: true, reply: reply.body });
  }

  if (body.action === "commit_preliminary") {
    await appendEvent({
      runId,
      eventType: "DECISION_COMMITTED",
      actorType: "candidate",
      stageId: stage,
      payload: { kind: "preliminary" },
    });
    const admin = proofAdmin();
    await admin.from("proof_runs").update({ stage: "PRELIMINARY_RECOMMENDATION" }).eq("id", runId);
    await appendEvent({
      runId,
      eventType: "STAGE_CHANGED",
      actorType: "system",
      payload: { to: "PRELIMINARY_RECOMMENDATION" },
    });
    if (
      factTriggerSatisfied({
        factId: FACT_AUTH,
        released,
        stage: "PRELIMINARY_RECOMMENDATION",
        preliminarySubmitted: true,
        authAcknowledged: false,
        salesReleased: false,
      })
    ) {
      await releaseFact(runId, FACT_AUTH, "PRELIMINARY_RECOMMENDATION");
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "acknowledge_auth") {
    if (released.includes(FACT_AUTH)) {
      await releaseFact(runId, "SALES_001", "REASSESSMENT");
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "submit_final") {
    if (body.artifact) await saveArtifact(runId, body.artifact, stage);
    const admin = proofAdmin();
    await admin.from("proof_runs").update({ stage: "FINAL_SUBMITTED", completed_at: new Date().toISOString() }).eq("id", runId);
    await appendEvent({ runId, eventType: "STAGE_CHANGED", actorType: "system", payload: { to: "FINAL_SUBMITTED" } });
    await enqueueJob(runId, "EXTRACT_EVIDENCE_INITIAL");
    await enqueueJob(runId, "GENERATE_DEFENSE");
    await processQueuedJobs(runId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
