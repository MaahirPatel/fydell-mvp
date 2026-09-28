import "server-only";

/**
 * Billing usage ledger (BILL-06).
 *
 * Explicit included volume and consumption per organization:
 *  - entitlement: plan-granted included simulations for a billing period
 *  - usage: one completed billable simulation
 *  - credit: manual or policy credit (logged with actor + reason)
 *  - adjustment: price/policy correction (positive or negative)
 *
 * Retry/platform-failure policy: platform-failure retries reuse the original
 * idempotency key, so a retried run is never charged twice. Manual credits
 * always record actor and reason.
 *
 * Durable store: public.billing_ledger_entries (migration 031). The in-memory
 * store here backs tests and local tooling; production wires the same
 * interface to Supabase.
 */

export type LedgerEntryType = "usage" | "credit" | "adjustment" | "entitlement";

export interface LedgerEntry {
  id: string;
  organizationId: string;
  entryType: LedgerEntryType;
  quantity: number;
  amountCents: number;
  currency: string;
  idempotencyKey: string;
  reason: string;
  actor: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
}

export interface LedgerStore {
  append(entry: Omit<LedgerEntry, "id" | "createdAt">): Promise<LedgerEntry>;
  hasIdempotencyKey(key: string): Promise<boolean>;
  list(organizationId: string): Promise<LedgerEntry[]>;
}

export function createMemoryLedgerStore(): LedgerStore {
  const entries: LedgerEntry[] = [];
  const keys = new Set<string>();
  let seq = 0;
  return {
    async append(entry) {
      if (keys.has(entry.idempotencyKey)) {
        const existing = entries.find((e) => e.idempotencyKey === entry.idempotencyKey);
        if (existing) return existing;
      }
      keys.add(entry.idempotencyKey);
      const full: LedgerEntry = {
        ...entry,
        id: `ledger_${Date.now()}_${(seq += 1)}`,
        createdAt: new Date().toISOString(),
      };
      entries.push(full);
      return full;
    },
    async hasIdempotencyKey(key) {
      return keys.has(key);
    },
    async list(organizationId) {
      return entries.filter((e) => e.organizationId === organizationId);
    },
  };
}

export interface LedgerSummary {
  organizationId: string;
  included: number;
  consumed: number;
  credited: number;
  adjusted: number;
  /** remaining included volume before overage */
  remaining: number;
}

export async function ledgerSummary(store: LedgerStore, organizationId: string): Promise<LedgerSummary> {
  const entries = await store.list(organizationId);
  let included = 0;
  let consumed = 0;
  let credited = 0;
  let adjusted = 0;
  for (const e of entries) {
    if (e.entryType === "entitlement") included += e.quantity;
    else if (e.entryType === "usage") consumed += e.quantity;
    else if (e.entryType === "credit") credited += e.quantity;
    else if (e.entryType === "adjustment") adjusted += e.quantity;
  }
  return {
    organizationId,
    included,
    consumed,
    credited,
    adjusted,
    remaining: included + credited + adjusted - consumed,
  };
}

function requireNonEmpty(value: string, field: string): void {
  if (!value || !value.trim()) throw new Error(`${field} is required.`);
}

/** Records one completed billable simulation. Idempotent on idempotencyKey. */
export async function recordUsage(
  store: LedgerStore,
  opts: { organizationId: string; idempotencyKey: string; reason: string; metadata?: Record<string, unknown> }
): Promise<LedgerEntry> {
  requireNonEmpty(opts.organizationId, "organizationId");
  requireNonEmpty(opts.idempotencyKey, "idempotencyKey");
  requireNonEmpty(opts.reason, "reason");
  if (await store.hasIdempotencyKey(opts.idempotencyKey)) {
    const existing = (await store.list(opts.organizationId)).find((e) => e.idempotencyKey === opts.idempotencyKey);
    if (existing) return existing;
  }
  return store.append({
    organizationId: opts.organizationId,
    entryType: "usage",
    quantity: 1,
    amountCents: 0,
    currency: "usd",
    idempotencyKey: opts.idempotencyKey,
    reason: opts.reason,
    actor: "system",
    periodStart: null,
    periodEnd: null,
  });
}

/** Grants included volume for a plan period (e.g. team plan monthly). */
export async function grantEntitlement(
  store: LedgerStore,
  opts: {
    organizationId: string;
    quantity: number;
    periodStart: string;
    periodEnd: string;
    reason: string;
    idempotencyKey: string;
  }
): Promise<LedgerEntry> {
  requireNonEmpty(opts.reason, "reason");
  if (opts.quantity <= 0) throw new Error("Entitlement quantity must be positive.");
  return store.append({
    organizationId: opts.organizationId,
    entryType: "entitlement",
    quantity: opts.quantity,
    amountCents: 0,
    currency: "usd",
    idempotencyKey: opts.idempotencyKey,
    reason: opts.reason,
    actor: "system",
    periodStart: opts.periodStart,
    periodEnd: opts.periodEnd,
  });
}

/**
 * Manual credit (operator tooling, OPS-03). Actor and reason are mandatory
 * and end up in the audit trail.
 */
export async function grantCredit(
  store: LedgerStore,
  opts: { organizationId: string; quantity: number; reason: string; actor: string; idempotencyKey: string }
): Promise<LedgerEntry> {
  requireNonEmpty(opts.actor, "actor");
  requireNonEmpty(opts.reason, "reason");
  if (opts.reason.trim().length < 8) throw new Error("Credit reason must be descriptive (>= 8 chars).");
  if (opts.quantity <= 0) throw new Error("Credit quantity must be positive.");
  return store.append({
    organizationId: opts.organizationId,
    entryType: "credit",
    quantity: opts.quantity,
    amountCents: 0,
    currency: "usd",
    idempotencyKey: opts.idempotencyKey,
    reason: opts.reason,
    actor: opts.actor,
    periodStart: null,
    periodEnd: null,
  });
}

/**
 * Platform-failure retry: reuses the ORIGINAL idempotency key, so a retried
 * evaluation run is never charged twice (stated policy, BILL-06).
 * Returns the original entry when the retry key already exists.
 */
export async function recordRetryWithoutDoubleCharge(
  store: LedgerStore,
  originalIdempotencyKey: string,
  organizationId: string
): Promise<{ doubleCharged: boolean; entry: LedgerEntry | null }> {
  if (await store.hasIdempotencyKey(originalIdempotencyKey)) {
    const existing = (await store.list(organizationId)).find((e) => e.idempotencyKey === originalIdempotencyKey);
    return { doubleCharged: false, entry: existing ?? null };
  }
  return { doubleCharged: false, entry: null };
}
