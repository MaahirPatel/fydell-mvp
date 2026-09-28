import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { TransferRecord, TransferState, TransferTransitionDetail } from "./transfer";

/**
 * Server-side transfer-state persistence (UP-03).
 *
 * Backed by `sim_snapshot_transfers` + the `submit_transfer_transition`
 * function (supabase/migrations/030_submit_transfer_state.sql). The table has
 * RLS enabled with no policies, so only the service-role client used here
 * can read/write it.
 *
 * Errors are sanitized to a generic message: database error text must never
 * reach candidates (UP-08 / leakage contract).
 */

function rowToRecord(row: {
  state: string;
  operation_id: string | null;
  receipt_hash: string | null;
  submission_id: string | null;
  failure_code: string | null;
  failure_message: string | null;
}): TransferRecord {
  return {
    state: row.state as TransferState,
    operationId: row.operation_id,
    receiptHash: row.receipt_hash,
    submissionId: row.submission_id,
    failureCode: row.failure_code,
    failureMessage: row.failure_message,
  };
}

export async function loadTransferState(sessionId: string): Promise<TransferRecord | null> {
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from("sim_snapshot_transfers")
    .select("state, operation_id, receipt_hash, submission_id, failure_code, failure_message")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw new Error("Transfer store unavailable");
  if (!data) return null;
  return rowToRecord(data as Parameters<typeof rowToRecord>[0]);
}

export async function transitionTransferState(
  sessionId: string,
  from: TransferState,
  to: TransferState,
  detail: TransferTransitionDetail = {}
): Promise<{ ok: boolean; state: TransferState }> {
  const db = createAdminSupabaseClient();
  const { data, error } = await db.rpc("submit_transfer_transition", {
    p_session_id: sessionId,
    p_from_state: from,
    p_to_state: to,
    p_detail: {
      operationId: detail.operationId ?? null,
      receiptHash: detail.receiptHash ?? null,
      submissionId: detail.submissionId ?? null,
      failureCode: detail.failureCode ?? null,
      failureMessage: detail.failureMessage ?? null,
    },
  });
  if (error) throw new Error("Transfer store unavailable");
  const row = (Array.isArray(data) ? data[0] : data) as { ok?: boolean; state?: string } | null;
  return { ok: Boolean(row?.ok), state: (row?.state ?? from) as TransferState };
}

/** Receipt recovery for DESK-16 / E2E-20: the submission row is the source of truth. */
export async function getSubmissionReceiptBySession(
  sessionId: string
): Promise<{ submissionId: string; receiptHash: string | null } | null> {
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from("sim_submissions")
    .select("id, snapshot")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { id: string; snapshot: { receiptHash?: unknown } | null };
  const receiptHash = typeof row.snapshot?.receiptHash === "string" ? row.snapshot.receiptHash : null;
  return { submissionId: row.id, receiptHash };
}
