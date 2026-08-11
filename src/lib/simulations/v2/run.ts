/**
 * Persist v2 scoring for a submitted micro session.
 * Mirrors runMicroScoring column writes (analysis run, competencies, evidence).
 */
import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  getVersionContent,
  issueCredential,
  listEvents,
  mintToken,
} from "../db";
import { isMicroContent, PROTOTYPE_DISCLAIMER, type MicroSimContent } from "../micro-types";
import { BAND_LABELS, type EvidenceBand } from "../scoring";
import { microToV2 } from "./from-micro";
import {
  ENGINE_VERSION_V2,
  scoreV2Attempt,
  type ScoreBandV2,
  type V2AttemptInput,
  type V2PersistedResult,
  type V2ScoreResult,
} from "./scoring";
import type { SimulationDefinitionV2 } from "./types";
import { createOralDefenseForSession } from "@/lib/pilot/oral-defense";
import { buildDefenseQuestions } from "@/lib/pilot/defense-questions";

export type { V2PersistedCompetency, V2PersistedResult } from "./scoring";
export { isV2PersistedResult } from "./scoring";

function bandLabel(band: ScoreBandV2): string {
  return BAND_LABELS[band as EvidenceBand] || band;
}

function answerValue(
  answers: Record<string, unknown>,
  id: string
): string | number | string[] | undefined {
  const raw = answers[id];
  if (raw === undefined || raw === null) return undefined;
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "number") return raw;
  return String(raw);
}

/** Map submission deliverable + events into scoreV2Attempt input. */
export function buildV2AttemptInput(
  def: SimulationDefinitionV2,
  answers: Record<string, unknown>,
  events: { event_type: string; payload: Record<string, unknown>; resource_id?: string | null; id?: string; created_at?: string }[]
): V2AttemptInput {
  const decisions: Record<string, string | number | string[] | undefined> = {};
  const written: Record<string, string | undefined> = {};
  const evidenceIds: string[] = [];

  for (const m of def.modules) {
    if (m.kind === "structured_decision") {
      const raw = answerValue(answers, m.id);
      decisions[m.id] = raw;
      if (m.decisionKind === "multi_select" && Array.isArray(raw)) {
        evidenceIds.push(...raw.map(String));
      }
    }
    if (m.kind === "written_deliverable") {
      const raw = answerValue(answers, m.id);
      written[m.id] = typeof raw === "string" ? raw : raw !== undefined ? String(raw) : "";
    }
  }

  const stakeholderRuleIds = events
    .filter((e) => e.event_type === "message_received" || e.event_type === "stakeholder_reply_received")
    .map((e) => {
      const r = e.payload?.ruleId ?? e.payload?.rule_id;
      return typeof r === "string" ? r : "";
    })
    .filter(Boolean);

  return {
    events,
    decisions,
    written,
    evidenceIds,
    stakeholderRuleIds,
  };
}

function deriveStrengthsImprovements(
  def: SimulationDefinitionV2,
  score: V2ScoreResult
): { strengths: string[]; improvements: string[] } {
  const citedIds = new Set(score.citations.map((c) => c.eventOrArtifactId));
  const strengths = score.citations.slice(0, 5).map((c) => c.claim);
  const improvements: string[] = [];
  for (const opp of def.scoring.opportunities) {
    if (!citedIds.has(opp.id)) {
      improvements.push(`Missing or weak evidence for: ${opp.label}`);
    }
    if (improvements.length >= 5) break;
  }
  return { strengths, improvements };
}

function recommendationFor(band: ScoreBandV2): "advance" | "review" | "further_evidence_required" {
  if (band === "strong" || band === "established") return "advance";
  if (band === "developing") return "review";
  return "further_evidence_required";
}

function toPersistedResult(
  def: SimulationDefinitionV2,
  score: V2ScoreResult,
  completionSeconds: number | null
): V2PersistedResult {
  const { strengths, improvements } = deriveStrengthsImprovements(def, score);
  return {
    format: "v2",
    engineVersion: ENGINE_VERSION_V2,
    simulationTitle: def.title,
    roleKey: def.roleKey,
    slug: def.slug,
    performance: score.performance,
    coverage: score.coverage,
    confidence: score.confidence,
    band: score.band,
    bandLabel: bandLabel(score.band),
    completionSeconds,
    competencies: score.competencies.map((c) => ({
      key: c.key,
      label: c.label,
      performance: c.performance,
      coverage: c.coverage,
      confidence: c.confidence,
      band: c.band,
      bandLabel: bandLabel(c.band),
    })),
    citations: score.citations,
    strengths,
    improvements,
    disclaimer: PROTOTYPE_DISCLAIMER,
  };
}

/**
 * Run v2 scoring for a session and persist like runMicroScoring.
 */
export async function runV2Scoring(sessionId: string): Promise<{ analysisRunId: string }> {
  const db = createAdminSupabaseClient();

  const { data: existing } = await db
    .from("sim_analysis_runs")
    .select("id")
    .eq("session_id", sessionId)
    .eq("status", "complete")
    .maybeSingle();
  if (existing) return { analysisRunId: existing.id };

  const { data: session } = await db.from("sim_sessions").select("*").eq("id", sessionId).single();
  if (!session) throw new Error("Session not found");
  const { data: submission } = await db
    .from("sim_submissions")
    .select("snapshot, external_ai_disclosed")
    .eq("session_id", sessionId)
    .single();
  if (!submission) throw new Error("No submission to score");

  const content = await getVersionContent(session.template_version_id);
  if (!isMicroContent(content)) throw new Error("Not a micro simulation");
  const sim = content as MicroSimContent;
  const def = microToV2(sim);

  const { data: run, error: runErr } = await db
    .from("sim_analysis_runs")
    .insert({ session_id: sessionId, status: "running", engine_version: ENGINE_VERSION_V2 })
    .select("id")
    .single();
  if (runErr) throw new Error(`Could not create analysis run: ${runErr.message}`);

  try {
    const snapshot = submission.snapshot as { deliverable?: Record<string, unknown> };
    const answers = snapshot.deliverable || {};
    const events = await listEvents(sessionId);

    const completionSeconds =
      session.started_at && session.submitted_at
        ? Math.round(
            (new Date(session.submitted_at).getTime() - new Date(session.started_at).getTime()) /
              1000
          )
        : null;

    const input = buildV2AttemptInput(def, answers, events);
    const score = scoreV2Attempt(def, input);
    const result = toPersistedResult(def, score, completionSeconds);

    for (const comp of result.competencies) {
      const adjusted =
        comp.performance !== null ? Math.max(0, Math.min(1, comp.performance / 100)) : 0;
      await db.from("sim_competency_results").insert({
        analysis_run_id: run.id,
        competency_key: comp.key,
        label: comp.label,
        band: comp.band,
        adjusted_score: adjusted.toFixed(4),
        confidence: comp.confidence.toFixed(4),
        coverage: comp.coverage.toFixed(4),
        consistency: "1.0000",
        evidence_quality: adjusted.toFixed(4),
        critical: false,
        summary: `${comp.bandLabel}. Performance ${comp.performance ?? "n/a"}; coverage ${Math.round(comp.coverage * 100)}%.`,
      });
    }

    for (const citation of result.citations) {
      const opp = def.scoring.opportunities.find((o) => o.id === citation.eventOrArtifactId);
      await db.from("sim_evidence_items").insert({
        analysis_run_id: run.id,
        competency_key: opp?.competencyKey || result.competencies[0]?.key || "general",
        indicator: citation.claim,
        source: "deterministic",
        quality: "1.0000",
        weight: (opp?.weight ?? 0.1).toFixed(4),
        relevance: "1.0000",
        independence: "1.0000",
        excerpts: [citation.detail],
        explanation: citation.detail,
      });
    }

    const overall =
      result.performance !== null
        ? (result.performance / 100).toFixed(4)
        : "0.0000";

    const humanReviewRequired =
      result.performance === null ||
      result.coverage < 0.35 ||
      result.confidence < 0.35 ||
      result.band === "insufficient";

    const defenseQs = buildDefenseQuestions({
      strengths: result.strengths,
      improvements: result.improvements,
      evidence: result.citations.map((c) => ({
        id: c.eventOrArtifactId,
        claim: c.claim,
      })),
    });

    await db
      .from("sim_analysis_runs")
      .update({
        status: "complete",
        overall,
        recommendation: humanReviewRequired
          ? "further_evidence_required"
          : recommendationFor(result.band),
        result,
        interview_questions: defenseQs.map((q) => q.question_text),
        report_version: 1,
        is_current: true,
        ai_use_summary: {
          scoringMode: "v2-deterministic",
          engineVersion: ENGINE_VERSION_V2,
          coverage: result.coverage,
          confidence: result.confidence,
          humanReviewRequired,
          externalAiDisclosed: Boolean(submission.external_ai_disclosed),
        },
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    try {
      await createOralDefenseForSession({
        sessionId,
        analysisRunId: run.id,
        strengths: result.strengths,
        improvements: result.improvements,
        evidence: result.citations.map((c) => ({
          id: c.eventOrArtifactId,
          claim: c.claim,
        })),
      });
    } catch {
      // Defense creation must not block scoring; facilitator can regenerate.
    }

    if (!session.share_token) {
      await db
        .from("sim_sessions")
        .update({ share_token: mintToken() })
        .eq("id", sessionId)
        .is("share_token", null);
    }

    await db
      .from("sim_sessions")
      .update({
        status: "analyzed",
        report_status: humanReviewRequired ? "human_review_required" : "pending",
      })
      .eq("id", sessionId)
      .eq("status", "submitted");
    await issueCredential(sessionId);
    await db
      .from("sim_sessions")
      .update({
        status: "report_ready",
        report_status: humanReviewRequired ? "human_review_required" : "ready",
      })
      .eq("id", sessionId)
      .eq("status", "analyzed");

    await db
      .from("sim_invitations")
      .update({ status: "completed" })
      .eq("id", session.invitation_id);

    return { analysisRunId: run.id };
  } catch (err) {
    await db
      .from("sim_analysis_runs")
      .update({ status: "failed", error: err instanceof Error ? err.message : String(err) })
      .eq("id", run.id);
    await db
      .from("sim_sessions")
      .update({ report_status: "failed" })
      .eq("id", sessionId);
    throw err;
  }
}
