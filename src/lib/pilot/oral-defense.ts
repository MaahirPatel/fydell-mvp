import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  buildDefenseQuestions,
  type EvidenceSeed,
} from "@/lib/pilot/defense-questions";

export const DEFENSE_GENERATOR_VERSION = "defense_v1";
export { buildDefenseQuestions };
export type { EvidenceSeed };

export async function createOralDefenseForSession(input: {
  sessionId: string;
  analysisRunId: string | null;
  strengths: string[];
  improvements: string[];
  evidence: EvidenceSeed[];
}): Promise<{ defenseSetId: string; questionCount: number }> {
  const db = createAdminSupabaseClient();
  const questions = buildDefenseQuestions({
    strengths: input.strengths,
    improvements: input.improvements,
    evidence: input.evidence,
    residualSegmentHint:
      "Why prioritize Line L2 Day (or your chosen segment) for residual risk instead of a plant-wide conclusion?",
  });

  const { data: set, error } = await db
    .from("oral_defense_sets")
    .upsert(
      {
        session_id: input.sessionId,
        analysis_run_id: input.analysisRunId,
        generator_version: DEFENSE_GENERATOR_VERSION,
        status: "pending",
      },
      { onConflict: "session_id" }
    )
    .select("id")
    .single();
  if (error) throw new Error(`Could not create oral defense: ${error.message}`);

  await db.from("oral_defense_questions").delete().eq("defense_set_id", set.id);
  const rows = questions.map((q, i) => ({
    defense_set_id: set.id,
    sort_order: i,
    question_text: q.question_text,
    purpose: q.purpose,
    source_evidence_ids: q.source_evidence_ids,
    expected_understanding: q.expected_understanding,
    generator_version: DEFENSE_GENERATOR_VERSION,
  }));
  const { error: qErr } = await db.from("oral_defense_questions").insert(rows);
  if (qErr) throw new Error(`Could not insert defense questions: ${qErr.message}`);

  return { defenseSetId: set.id as string, questionCount: rows.length };
}

export async function getOralDefense(sessionId: string) {
  const db = createAdminSupabaseClient();
  const { data: set } = await db
    .from("oral_defense_sets")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (!set) return null;
  const { data: questions } = await db
    .from("oral_defense_questions")
    .select("*")
    .eq("defense_set_id", set.id)
    .order("sort_order", { ascending: true });
  const { data: responses } = await db
    .from("oral_defense_responses")
    .select("*")
    .eq("defense_set_id", set.id);
  return { set, questions: questions || [], responses: responses || [] };
}

export async function saveDefenseResponse(input: {
  defenseSetId: string;
  questionId: string;
  responseText: string;
  collectionMethod: "candidate_typed" | "facilitator_notes";
  collectedBy: string | null;
  attestation?: string;
}): Promise<void> {
  const db = createAdminSupabaseClient();
  const { error } = await db.from("oral_defense_responses").upsert(
    {
      defense_set_id: input.defenseSetId,
      question_id: input.questionId,
      response_text: input.responseText.slice(0, 8000),
      collection_method: input.collectionMethod,
      collected_by: input.collectedBy,
      attestation: input.attestation || null,
    },
    { onConflict: "question_id" }
  );
  if (error) throw new Error(error.message);

  const { data: questions } = await db
    .from("oral_defense_questions")
    .select("id")
    .eq("defense_set_id", input.defenseSetId);
  const { data: responses } = await db
    .from("oral_defense_responses")
    .select("id")
    .eq("defense_set_id", input.defenseSetId);
  if (questions && responses && responses.length >= questions.length) {
    await db
      .from("oral_defense_sets")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", input.defenseSetId);
  } else {
    await db
      .from("oral_defense_sets")
      .update({ status: "in_progress" })
      .eq("id", input.defenseSetId);
  }
}
