import "server-only";
import { proofAdmin, loadRunSnapshot, audit } from "./db";
import { runEvidenceJob } from "./python-client";
import type { AnalysisJobType } from "./types";
import { validateAnalysisResult } from "./validate-analysis";

/**
 * The job lifecycle is one surface. Callers enqueue and drain through this
 * module rather than reaching into the table directly, so the idempotency key
 * and the status transitions stay in a single place.
 */
export { enqueueJob } from "./db";

export async function processQueuedJobs(runId: string): Promise<void> {
  const admin = proofAdmin();
  const { data: jobs } = await admin
    .from("proof_analysis_jobs")
    .select("*")
    .eq("run_id", runId)
    .eq("status", "queued")
    .order("created_at", { ascending: true });
  for (const job of jobs ?? []) {
    await processOneJob(job.id, job.job_type as AnalysisJobType, runId);
  }
}

async function processOneJob(jobId: string, jobType: AnalysisJobType, runId: string): Promise<void> {
  const admin = proofAdmin();
  await admin
    .from("proof_analysis_jobs")
    .update({ status: "running", locked_at: new Date().toISOString(), started_at: new Date().toISOString(), attempts: 1 })
    .eq("id", jobId);
  try {
    const result = validateAnalysisResult(await runEvidenceJob(jobType, await loadRunSnapshot(runId)));
    await persistResult(runId, jobType, result);
    await admin
      .from("proof_analysis_jobs")
      .update({ status: "succeeded", completed_at: new Date().toISOString(), result, result_version: "v1", last_error: null })
      .eq("id", jobId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown analysis failure";
    await admin.from("proof_analysis_jobs").update({ status: "failed", last_error: message, completed_at: new Date().toISOString() }).eq("id", jobId);
    throw err;
  }
}

async function persistResult(
  runId: string,
  jobType: AnalysisJobType,
  result: ReturnType<typeof validateAnalysisResult>,
): Promise<void> {
  const admin = proofAdmin();
  if (jobType === "EXTRACT_EVIDENCE_INITIAL" || jobType === "EXTRACT_EVIDENCE_FINAL") {
    const pass = jobType === "EXTRACT_EVIDENCE_INITIAL" ? "A" : "B";
    if (pass === "B") await admin.from("proof_evidence_claims").delete().eq("run_id", runId).eq("pass", "B");
    for (const claim of result.claims ?? []) {
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
  }
  if (jobType === "GENERATE_DEFENSE" && result.defense_questions) {
    const { data: session } = await admin.from("proof_defense_sessions").upsert({ run_id: runId, status: "open" }, { onConflict: "run_id" }).select("id").single();
    if (!session) throw new Error("defense session failed");
    await admin.from("proof_defense_questions").delete().eq("session_id", session.id);
    await admin.from("proof_defense_questions").insert(
      result.defense_questions.map((q, index) => ({ session_id: session.id, prompt: q.prompt, target: q.target, sort_order: index })),
    );
    await admin.from("proof_runs").update({ status: "awaiting_defense", stage: "DEFENSE" }).eq("id", runId);
  }
  if (jobType === "GENERATE_DECISION_BRIEF" && result.brief) {
    await admin.from("proof_decision_briefs").upsert(
      {
        run_id: runId,
        recommendation: result.brief.recommendation,
        why: result.brief.why,
        strengths: result.brief.strengths,
        concerns: result.brief.concerns,
        probes: result.brief.probes,
        published: false,
      },
      { onConflict: "run_id" },
    );
    await admin.from("proof_interview_plans").upsert(
      { run_id: runId, confirm: result.brief.strengths, investigate: result.brief.concerns, challenge: result.brief.probes },
      { onConflict: "run_id" },
    );
    await admin.from("proof_runs").update({ status: "awaiting_review" }).eq("id", runId);
  }
  await audit("python-worker", jobType, "proof_runs", runId, null, { jobType });
}
