import { z } from "zod";
import { ACME_FIXTURE_VERSION } from "./fixture";
import { SANDBOX_STEPS, type SandboxStep } from "./steps";

export const sandboxWorldStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    environment: z.literal("sandbox"),
    fixtureVersion: z.literal(ACME_FIXTURE_VERSION),
    ownerCapabilityHash: z.string().min(32),
    currentStep: z.enum(SANDBOX_STEPS),
    revision: z.number().int().nonnegative(),
    expiresAt: z.iso.datetime(),
    resetAt: z.iso.datetime().nullable(),
    createdFromIpHash: z.string().min(16),
    cleanupStatus: z.enum(["ok", "cleanup_failed"]),
    constraintDelivered: z.boolean(),
    reviewKind: z.enum(["none", "scripted", "sandbox_visitor"]),
    reviewDecision: z.enum(["approve", "limit", "follow_up", "reject"]).nullable(),
    receiptPublicId: z.string().nullable(),
    receiptIntegrityHash: z.string().nullable(),
    lastIdempotencyKey: z.string().nullable(),
    seenIdempotencyKeys: z.array(z.string()).max(200),
  })
  .strict();

export type SandboxWorldStateV1 = z.infer<typeof sandboxWorldStateSchema>;

export class WorldStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorldStateError";
  }
}

export function parseWorldState(value: unknown): SandboxWorldStateV1 {
  const result = sandboxWorldStateSchema.safeParse(value);
  if (!result.success) {
    throw new WorldStateError(`Malformed sandbox world_state: ${result.error.issues.map((i) => i.message).join("; ")}`);
  }
  return result.data;
}

export function isSandboxWorldState(value: unknown): value is SandboxWorldStateV1 {
  return sandboxWorldStateSchema.safeParse(value).success;
}

export function createWorldState(input: {
  ownerCapabilityHash: string;
  createdFromIpHash: string;
  expiresAt: string;
  currentStep?: SandboxStep;
}): SandboxWorldStateV1 {
  return parseWorldState({
    schemaVersion: 1,
    environment: "sandbox",
    fixtureVersion: ACME_FIXTURE_VERSION,
    ownerCapabilityHash: input.ownerCapabilityHash,
    currentStep: input.currentStep ?? "invited",
    revision: 0,
    expiresAt: input.expiresAt,
    resetAt: null,
    createdFromIpHash: input.createdFromIpHash,
    cleanupStatus: "ok",
    constraintDelivered: false,
    reviewKind: "none",
    reviewDecision: null,
    receiptPublicId: null,
    receiptIntegrityHash: null,
    lastIdempotencyKey: null,
    seenIdempotencyKeys: [],
  });
}

export function nextWorldState(
  current: SandboxWorldStateV1,
  patch: Partial<Omit<SandboxWorldStateV1, "schemaVersion" | "environment" | "fixtureVersion" | "revision">> & {
    currentStep?: SandboxStep;
  },
): SandboxWorldStateV1 {
  return parseWorldState({
    ...current,
    ...patch,
    schemaVersion: 1,
    environment: "sandbox",
    fixtureVersion: ACME_FIXTURE_VERSION,
    revision: current.revision + 1,
  });
}
