/**
 * Persistence for engineering test runs (sim_test_runs, migration 034).
 *
 * The interface keeps the orchestration rules testable with an in-memory
 * store; the Supabase implementation uses the service-role client because
 * the table has RLS with no policies (routes enforce ownership first).
 */

import type { EngineeringRunResult, RunKind } from "./types";

export interface StoredRun {
  id: string;
  sessionId: string;
  kind: RunKind;
  clientRunId: string | null;
  submissionId: string | null;
  candidateSnapshotHash: string;
  suiteVersion: string;
  status: EngineeringRunResult["status"] | "running";
  createdAt: string;
  completedAt: string | null;
  result: EngineeringRunResult | null;
}

export interface NewRun {
  sessionId: string;
  kind: RunKind;
  clientRunId: string | null;
  submissionId: string | null;
  candidateSnapshotHash: string;
  scenarioId: string;
  scenarioVersion: string;
  suiteVersion: string;
  requestedBy: string | null;
  /** Insert directly in a final state (e.g. not_configured) instead of running. */
  finished?: EngineeringRunResult;
}

export interface TestRunStore {
  /** Inserts a run. Returns { created: false, run } when a unique key already exists. */
  insert(run: NewRun): Promise<{ created: boolean; run: StoredRun }>;
  finish(id: string, result: EngineeringRunResult): Promise<void>;
  /** Marks an abandoned "running" row as an infrastructure failure. */
  abandon(id: string, reason: string): Promise<void>;
  findPractice(sessionId: string, clientRunId: string): Promise<StoredRun | null>;
  findLiveEvaluation(submissionId: string, snapshotHash: string, suiteVersion: string): Promise<StoredRun | null>;
  listRuns(sessionId: string, kind: RunKind, limit: number): Promise<StoredRun[]>;
  countSince(sessionId: string, kind: RunKind, sinceIso: string): Promise<number>;
}

export function createMemoryTestRunStore(): TestRunStore & { rows: StoredRun[] } {
  const rows: StoredRun[] = [];
  let seq = 0;
  const live = (r: StoredRun) => r.status === "running" || r.status === "completed" || r.status === "indeterminate";
  return {
    rows,
    async insert(run) {
      if (run.kind === "practice" && run.clientRunId) {
        const existing = rows.find((r) => r.sessionId === run.sessionId && r.kind === "practice" && r.clientRunId === run.clientRunId);
        if (existing) return { created: false, run: existing };
      }
      if (run.kind === "evaluation" && !run.finished) {
        const existing = rows.find(
          (r) =>
            r.kind === "evaluation" &&
            r.submissionId === run.submissionId &&
            r.candidateSnapshotHash === run.candidateSnapshotHash &&
            r.suiteVersion === run.suiteVersion &&
            live(r)
        );
        if (existing) return { created: false, run: existing };
      }
      const row: StoredRun = {
        id: `run-${++seq}`,
        sessionId: run.sessionId,
        kind: run.kind,
        clientRunId: run.clientRunId,
        submissionId: run.submissionId,
        candidateSnapshotHash: run.candidateSnapshotHash,
        suiteVersion: run.suiteVersion,
        status: run.finished ? run.finished.status : "running",
        createdAt: new Date(Date.now() + seq).toISOString(),
        completedAt: run.finished ? new Date().toISOString() : null,
        result: run.finished ?? null,
      };
      rows.push(row);
      return { created: true, run: row };
    },
    async finish(id, result) {
      const row = rows.find((r) => r.id === id);
      if (!row) throw new Error("run not found");
      if (row.status !== "running") throw new Error("finished test runs are immutable");
      row.status = result.status;
      row.result = result;
      row.completedAt = new Date().toISOString();
    },
    async abandon(id, reason) {
      const row = rows.find((r) => r.id === id);
      if (!row || row.status !== "running") return;
      row.status = "infrastructure_error";
      row.completedAt = new Date().toISOString();
      row.result = row.result ? { ...row.result, status: "infrastructure_error", statusReason: reason } : null;
    },
    async findPractice(sessionId, clientRunId) {
      return rows.find((r) => r.sessionId === sessionId && r.kind === "practice" && r.clientRunId === clientRunId) ?? null;
    },
    async findLiveEvaluation(submissionId, snapshotHash, suiteVersion) {
      return (
        rows.find(
          (r) =>
            r.kind === "evaluation" &&
            r.submissionId === submissionId &&
            r.candidateSnapshotHash === snapshotHash &&
            r.suiteVersion === suiteVersion &&
            live(r)
        ) ?? null
      );
    },
    async listRuns(sessionId, kind, limit) {
      return rows
        .filter((r) => r.sessionId === sessionId && r.kind === kind)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
    },
    async countSince(sessionId, kind, sinceIso) {
      return rows.filter((r) => r.sessionId === sessionId && r.kind === kind && r.createdAt >= sinceIso).length;
    },
  };
}
