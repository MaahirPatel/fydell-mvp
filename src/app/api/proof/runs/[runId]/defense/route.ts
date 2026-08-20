import { NextResponse } from "next/server";
import { proofAdmin, appendEvent } from "@/lib/sim-engine/proof/db";
import { enqueueJob, processQueuedJobs } from "@/lib/sim-engine/proof/jobs";
import { authorizeProofRunAccess } from "@/lib/sim-engine/proof/sandbox/access";

export async function POST(request: Request, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params;
  const access = await authorizeProofRunAccess(runId);
  if ("response" in access) return access.response;
  const body = (await request.json()) as { answers?: Array<{ questionId: string; body: string }> };
  const admin = proofAdmin();
  const { data: session } = await admin.from("proof_defense_sessions").select("id").eq("run_id", runId).maybeSingle();
  if (!session) return NextResponse.json({ error: "no defense session" }, { status: 404 });

  for (const answer of body.answers ?? []) {
    await admin.from("proof_defense_responses").upsert(
      { question_id: answer.questionId, body: answer.body },
      { onConflict: "question_id" },
    );
    await appendEvent({
      runId,
      eventType: "DEFENSE_RESPONSE_RECEIVED",
      actorType: "candidate",
      payload: { defense_question_id: answer.questionId },
    });
  }

  await admin.from("proof_defense_sessions").update({ status: "completed" }).eq("id", session.id);
  await enqueueJob(runId, "EXTRACT_EVIDENCE_FINAL");
  await enqueueJob(runId, "GENERATE_DECISION_BRIEF");
  await processQueuedJobs(runId);
  return NextResponse.json({ ok: true });
}

export async function GET(_request: Request, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params;
  const access = await authorizeProofRunAccess(runId);
  if ("response" in access) return access.response;
  const admin = proofAdmin();
  const { data: session } = await admin.from("proof_defense_sessions").select("id, status").eq("run_id", runId).maybeSingle();
  if (!session) return NextResponse.json({ questions: [] });
  const { data: questions } = await admin
    .from("proof_defense_questions")
    .select("id, prompt, target, sort_order, proof_defense_responses(body)")
    .eq("session_id", session.id)
    .order("sort_order");
  return NextResponse.json({ status: session.status, questions: questions ?? [] });
}
