/**
 * Snapshot-transfer state machine (checklist: "State machines to make explicit").
 *
 *   local_draft → syncing → server_saved → submitting → accepted / rejected / failed
 *
 * Local save, remote save and accepted submission are deliberately different
 * states. Terminal states: `accepted` (evidence immutable from here on).
 *
 * Transition rules (enforced server-side in `submit_transfer_transition`,
 * supabase/migrations/030_submit_transfer_state.sql; this module is the pure
 * mirror used by routes and in-process tests):
 * - same-state transitions are always allowed (idempotent repeats),
 * - `accepted` is terminal: no transition leaves it,
 * - `rejected` returns to `local_draft` only - the candidate must
 *   explicitly rebuild/re-acknowledge before another finalize,
 * - `failed` allows retry via `syncing`, `submitting`, or `local_draft`,
 * - anything else is a conflict: repeated or concurrent requests cannot
 *   regress states.
 *
 * Pure module - no `server-only` - unit-testable in-process.
 */

export type TransferState =
  | "local_draft"
  | "syncing"
  | "server_saved"
  | "submitting"
  | "accepted"
  | "rejected"
  | "failed";

export const TRANSFER_STATES: readonly TransferState[] = [
  "local_draft",
  "syncing",
  "server_saved",
  "submitting",
  "accepted",
  "rejected",
  "failed",
];

/** Forward transitions only; same-state repeats handled by isLegalTransferTransition. */
export const TRANSFER_TRANSITIONS: Record<TransferState, readonly TransferState[]> = {
  local_draft: ["syncing"],
  syncing: ["server_saved", "failed", "local_draft"],
  server_saved: ["submitting", "local_draft", "failed"],
  submitting: ["accepted", "rejected", "failed"],
  accepted: [],
  rejected: ["local_draft"],
  failed: ["syncing", "submitting", "local_draft"],
};

/**
 * States from which a fresh finalize walk may start. The single-request
 * finalize path walks local_draft → syncing → server_saved → submitting
 * (the snapshot bytes ride with the finalize request, so the walk records
 * the sync lifecycle explicitly); server_saved and failed enter submitting
 * directly. `syncing` is continuable only by the operation that started it.
 */
export const FINALIZE_ENTRY_STATES: readonly TransferState[] = [
  "local_draft",
  "server_saved",
  "failed",
];

export function isTransferState(v: unknown): v is TransferState {
  return typeof v === "string" && (TRANSFER_STATES as readonly string[]).includes(v);
}

/** True for same-state repeats and listed forward transitions; false otherwise. */
export function isLegalTransferTransition(from: TransferState, to: TransferState): boolean {
  if (from === to) return true; // idempotent repeat
  return TRANSFER_TRANSITIONS[from].includes(to);
}

export interface TransferRecord {
  state: TransferState;
  operationId?: string | null;
  receiptHash?: string | null;
  submissionId?: string | null;
  failureCode?: string | null;
  failureMessage?: string | null;
}

export interface TransferTransitionDetail {
  operationId?: string;
  receiptHash?: string;
  submissionId?: string;
  failureCode?: string;
  failureMessage?: string;
}

/**
 * Pure transition helper mirroring `submit_transfer_transition`. Returns the
 * updated record on success, or null when the transition is illegal / the
 * caller's `from` is stale. Never mutates the input.
 */
export function applyTransferTransition(
  current: TransferRecord | null,
  from: TransferState,
  to: TransferState,
  detail: TransferTransitionDetail = {}
): TransferRecord | null {
  const effective: TransferRecord = current ?? { state: "local_draft" };
  // First touch: only a caller expecting local_draft may create the record.
  if (current === null && from !== "local_draft") return null;
  if (effective.state !== from) return null; // stale caller - no regression
  if (!isLegalTransferTransition(from, to)) return null;
  const next: TransferRecord = { ...effective, state: to };
  if (detail.operationId !== undefined) next.operationId = detail.operationId;
  if (detail.receiptHash !== undefined) next.receiptHash = detail.receiptHash;
  if (detail.submissionId !== undefined) next.submissionId = detail.submissionId;
  if (to === "rejected" || to === "failed") {
    if (detail.failureCode !== undefined) next.failureCode = detail.failureCode;
    if (detail.failureMessage !== undefined) next.failureMessage = detail.failureMessage;
  } else {
    next.failureCode = null;
    next.failureMessage = null;
  }
  return next;
}
