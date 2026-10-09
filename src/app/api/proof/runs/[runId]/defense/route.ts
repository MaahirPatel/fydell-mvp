import { NextResponse } from "next/server";
import { proofAdmin, appendEvent } from "@/lib/sim-engine/proof/db";
import { enqueueJob, processQueuedJobs } from "@/lib/sim-engine/proof/jobs";
import { authorizeProofRunAccess, authorizeProofRunCandidate } from "@/lib/sim-engine/proof/sandbox/access";

const MAX_ANSWERS = 50;
const MAX_ANSWER_LENGTH = 20_000;

function parseAnswers(raw: unknown): Array<{ questionId: string; body: string }> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const list = (raw as Record<string, unknown>).answers ?? [];
  if (!Array.isArray(list) || list.length > MAX_ANSWERS) return null;
  const answers: Array<{ questionId: string; body: string }> = [];
  for (const item of list) {
    if (!item || typeof item !== "object") return null;
    const { questionId, body } = item as Record<string, unknown>;
    if (typeof questionId !== "string" || typeof body !== "string" || body.length > MAX_ANSWER_LENGTH) return null;
    answers.push({ questionId, body });
  }
  return answers;
}

export async function POST(request: Request, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params;
  const access = await authorizeProofRunCandidate(runId);
  if ("response" in access) return access.response;
  const answers = parseAnswers(await request.json().catch(() => null));
  if (!answers) return NextResponse.json({ error: "Send answers as [{ questionId, body }]." }, { status: 400 });
  const admin = proofAdmin();
  const { data: session } = await admin.from("proof_defense_sessions").select("id").eq("run_id", runId).maybeSingle();
  if (!session) return NextResponse.json({ error: "no defense session" }, { status: 404 });

  const { data: owned } = await admin.from("proof_defense_questions").select("id").eq("session_id", session.id);
  const ownedIds = new Set((owned ?? []).map((q) => q.id as string));
  if (answers.some((a) => !ownedIds.has(a.questionId))) {
    return NextResponse.json({ error: "That question is not part of this defense." }, { status: 400 });
  }

  for (const answer of answers) {
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
