import "server-only";

/**
 * Controlled operator recovery tools (OPS-03).
 *
 * Authorized operators can: retry a stuck job, extend a candidate deadline,
 * quarantine a submission, reissue a report, or credit usage. Every action
 * requires:
 *  - an authenticated operator identity (actor),
 *  - a descriptive reason (>= 8 chars),
 *  - an audit record (mirrors public.operator_actions, migration 030).
 *
 * Actions that cause an external send (email to a candidate, charge/credit at
 * the provider) require deliberate confirmation: externalSendConfirmedBy must
 * name the operator who approved it - the tool never sends silently.
 */

export type OperatorActionKind =
  | "retry_job"
  | "extend_deadline"
  | "quarantine_submission"
  | "reissue_report"
  | "credit_usage"
  | "revoke_access"
  | "restore_record";

export interface OperatorActionInput {
  actorEmail: string;
  actorRoles: string[];
  action: OperatorActionKind;
  targetType: string;
  targetId: string;
  reason: string;
  /** set true when this action sends email / touches the payment provider */
  externalSend?: boolean;
  /** operator who deliberately confirmed the external send */
  externalSendConfirmedBy?: string;
  metadata?: Record<string, unknown>;
}

export interface OperatorActionRecord extends OperatorActionInput {
  id: string;
  occurredAt: string;
}

export interface OperatorActionStore {
  append(record: Omit<OperatorActionRecord, "id" | "occurredAt">): Promise<OperatorActionRecord>;
  listForTarget(targetType: string, targetId: string): Promise<OperatorActionRecord[]>;
}

export function createMemoryOperatorActionStore(): OperatorActionStore {
  const records: OperatorActionRecord[] = [];
  let seq = 0;
  return {
    async append(record) {
      const full: OperatorActionRecord = {
        ...record,
        id: `op_${Date.now()}_${(seq += 1)}`,
        occurredAt: new Date().toISOString(),
      };
      records.push(full);
      return full;
    },
    async listForTarget(targetType, targetId) {
      return records.filter((r) => r.targetType === targetType && r.targetId === targetId);
    },
  };
}

const OPERATOR_ROLES = new Set(["super_admin", "admin", "operator", "billing_support"]);

export interface ActionValidation {
  ok: boolean;
  error?: string;
}

export function validateOperatorAction(input: OperatorActionInput): ActionValidation {
  if (!input.actorEmail || !/^\S+@\S+\.\S+$/.test(input.actorEmail)) {
    return { ok: false, error: "A valid operator email (actor) is required." };
  }
  if (!input.actorRoles.some((r) => OPERATOR_ROLES.has(r))) {
    return { ok: false, error: "Actor lacks an operator role." };
  }
  if (!input.reason || input.reason.trim().length < 8) {
    return { ok: false, error: "A descriptive reason (>= 8 characters) is required." };
  }
  if (!input.targetType || !input.targetId) {
    return { ok: false, error: "targetType and targetId are required." };
  }
  if (input.externalSend && !input.externalSendConfirmedBy) {
    return {
      ok: false,
      error: "External sends require deliberate confirmation (externalSendConfirmedBy).",
    };
  }
  if (input.action === "credit_usage" && !input.metadata?.quantity) {
    return { ok: false, error: "credit_usage requires metadata.quantity." };
  }
  return { ok: true };
}

/**
 * Validates and records an operator recovery action. Throws on invalid input.
 * The returned record is the audit trail entry; callers perform the actual
 * recovery step only after this succeeds.
 */
export async function performOperatorAction(
  store: OperatorActionStore,
  input: OperatorActionInput
): Promise<OperatorActionRecord> {
  const validation = validateOperatorAction(input);
  if (!validation.ok) throw new Error(validation.error);
  return store.append({
    actorEmail: input.actorEmail,
    actorRoles: input.actorRoles,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason.trim(),
    externalSend: input.externalSend ?? false,
    externalSendConfirmedBy: input.externalSendConfirmedBy,
    metadata: input.metadata ?? {},
  });
}
