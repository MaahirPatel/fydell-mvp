import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NewRun, StoredRun, TestRunStore } from "./store";
import type { EngineeringRunResult, RunKind } from "./types";

type Row = {
  id: string;
  session_id: string;
  kind: RunKind;
  client_run_id: string | null;
  submission_id: string | null;
  candidate_snapshot_hash: string;
  scenario_id: string;
  scenario_version: string;
  suite_version: string;
  environment_version: string;
  provider: string;
  status: StoredRun["status"];
  status_reason: string | null;
  classification: string | null;
  summary: EngineeringRunResult["summary"];
  tests: EngineeringRunResult["tests"];
  groups: EngineeringRunResult["groups"];
  integrity: EngineeringRunResult["integrity"];
  restored_trusted: string[];
  ignored: EngineeringRunResult["ignored"];
  output: string;
  output_truncated: boolean;
  created_at: string;
  completed_at: string | null;
};

const COLUMNS =
  "id, session_id, kind, client_run_id, submission_id, candidate_snapshot_hash, scenario_id, scenario_version, suite_version, environment_version, provider, status, status_reason, classification, summary, tests, groups, integrity, restored_trusted, ignored, output, output_truncated, created_at, completed_at";

function toStored(row: Row): StoredRun {
  const result: EngineeringRunResult | null =
    row.status === "running"
      ? null
      : {
          kind: row.kind,
          status: row.status,
          statusReason: row.status_reason,
          classification: row.classification,
          candidateSnapshotHash: row.candidate_snapshot_hash,
          scenarioId: row.scenario_id,
          scenarioVersion: row.scenario_version,
          suiteVersion: row.suite_version,
          environmentVersion: row.environment_version,
          provider: row.provider,
          tests: row.tests ?? [],
          groups: row.groups ?? [],
          integrity: row.integrity ?? { canary: "not_applicable", missingExpected: [] },
          restoredTrusted: row.restored_trusted ?? [],
          ignored: row.ignored ?? [],
          output: row.output ?? "",
          outputTruncated: row.output_truncated,
          summary: row.summary ?? { passed: 0, failed: 0, errors: 0, skipped: 0 },
        };
  return {
    id: row.id,
    sessionId: row.session_id,
    kind: row.kind,
    clientRunId: row.client_run_id,
    submissionId: row.submission_id,
    candidateSnapshotHash: row.candidate_snapshot_hash,
    suiteVersion: row.suite_version,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    result,
  };
}

function resultColumns(result: EngineeringRunResult) {
  return {
    environment_version: result.environmentVersion.slice(0, 250),
    provider: result.provider,
    status: result.status,
    status_reason: result.statusReason?.slice(0, 1000) ?? null,
    classification: result.classification,
    summary: result.summary,
    tests: result.tests,
    groups: result.groups,
    integrity: result.integrity,
    restored_trusted: result.restoredTrusted,
    ignored: result.ignored,
    output: result.output.slice(0, 70000),
    output_truncated: result.outputTruncated || result.output.length > 70000,
    completed_at: new Date().toISOString(),
  };
}

export function createSupabaseTestRunStore(admin: SupabaseClient): TestRunStore {
  const table = () => admin.from("sim_test_runs");
  return {
    async insert(run: NewRun) {
      const { data, error } = await table()
        .insert({
          session_id: run.sessionId,
          kind: run.kind,
          client_run_id: run.clientRunId,
          submission_id: run.submissionId,
          candidate_snapshot_hash: run.candidateSnapshotHash,
          scenario_id: run.scenarioId,
          scenario_version: run.scenarioVersion,
          suite_version: run.suiteVersion,
          requested_by: run.requestedBy,
          status: "running",
          ...(run.finished ? resultColumns(run.finished) : {}),
        })
        .select(COLUMNS)
        .single();
      if (!error && data) return { created: true, run: toStored(data as Row) };
      if (error?.code === "23505") {
        const existing =
          run.kind === "practice" && run.clientRunId
            ? await this.findPractice(run.sessionId, run.clientRunId)
            : run.submissionId
              ? await this.findLiveEvaluation(run.submissionId, run.candidateSnapshotHash, run.suiteVersion)
              : null;
        if (existing) return { created: false, run: existing };
      }
      throw new Error(`Could not record the test run: ${error?.message ?? "unknown error"}`);
    },
    async finish(id, result) {
      const { error } = await table().update(resultColumns(result)).eq("id", id).eq("status", "running");
      if (error) throw new Error(`Could not store the test result: ${error.message}`);
    },
    async abandon(id, reason) {
      await table()
        .update({ status: "infrastructure_error", status_reason: reason, completed_at: new Date().toISOString() })
        .eq("id", id)
        .eq("status", "running");
    },
    async findPractice(sessionId, clientRunId) {
      const { data } = await table()
        .select(COLUMNS)
        .eq("session_id", sessionId)
        .eq("kind", "practice")
        .eq("client_run_id", clientRunId)
        .maybeSingle();
      return data ? toStored(data as Row) : null;
    },
    async findLiveEvaluation(submissionId, snapshotHash, suiteVersion) {
      const { data } = await table()
        .select(COLUMNS)
        .eq("kind", "evaluation")
        .eq("submission_id", submissionId)
        .eq("candidate_snapshot_hash", snapshotHash)
        .eq("suite_version", suiteVersion)
        .in("status", ["running", "completed", "indeterminate"])
        .maybeSingle();
      return data ? toStored(data as Row) : null;
    },
    async listRuns(sessionId, kind, limit) {
      const { data } = await table()
        .select(COLUMNS)
        .eq("session_id", sessionId)
        .eq("kind", kind)
        .order("created_at", { ascending: false })
        .limit(limit);
      return ((data ?? []) as Row[]).map(toStored);
    },
    async countSince(sessionId, kind, sinceIso) {
      const { count } = await table()
        .select("id", { count: "exact", head: true })
        .eq("session_id", sessionId)
        .eq("kind", kind)
        .gte("created_at", sinceIso);
      return count ?? 0;
    },
  };
}
