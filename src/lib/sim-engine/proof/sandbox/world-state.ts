import { z } from "zod";
import { ACME_FIXTURE_VERSION, APPLIED_AI_FIXTURE_VERSION } from "./fixture";
import {
  appliedAiWorkspaceSchema,
  createAppliedAiWorkspace,
  type AppliedAiEvalResult,
} from "./applied-ai-workspace";
import { SANDBOX_STEPS, type SandboxStep } from "./steps";

const sandboxWorldStateV1Schema = z
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
    interviewFinding: z.enum(["confirmed", "contradicted", "still_unclear", "not_asked"]).nullable().default(null),
    hiringOutcome: z.enum(["advance", "hold", "close", "hired"]).nullable().default(null),
    lastIdempotencyKey: z.string().nullable(),
    seenIdempotencyKeys: z.array(z.string()).max(200),
  })
  .strict();

export const appliedAiEpisodeStages = [
  "INVITED",
  "INSPECTING",
  "BASELINE_RUN",
  "EDITING",
  "PRELIMINARY_COMMITTED",
  "LATENCY_CONSTRAINT_RELEASED",
  "REVISING",
  "VALIDATING",
  "SUBMITTED",
] as const;

const progressSchema = z.object({
  resourceOpened: z.boolean(),
  traceOpened: z.boolean(),
  baselineRun: z.boolean(),
  configEdited: z.boolean(),
  evalCaseEdited: z.boolean(),
  architectureCommitted: z.boolean(),
  factReleased: z.boolean(),
  postFactRevision: z.boolean(),
  postFactEvalRun: z.boolean(),
  recommendationWritten: z.boolean(),
  submissionCompleted: z.boolean(),
});

export const sandboxWorldStateSchema = z
  .object({
    schemaVersion: z.literal(2),
    environment: z.literal("sandbox"),
    fixtureVersion: z.enum([ACME_FIXTURE_VERSION, APPLIED_AI_FIXTURE_VERSION]),
    ownerCapabilityHash: z.string().min(32),
    currentStep: z.enum(SANDBOX_STEPS),
    episodeStage: z.enum(appliedAiEpisodeStages),
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
    interviewFinding: z.enum(["confirmed", "contradicted", "still_unclear", "not_asked"]).nullable(),
    hiringOutcome: z.enum(["advance", "hold", "close", "hired"]).nullable(),
    lastIdempotencyKey: z.string().nullable(),
    seenIdempotencyKeys: z.array(z.string()).max(200),
    workspace: appliedAiWorkspaceSchema,
    latestEval: z.custom<AppliedAiEvalResult>().nullable(),
    baselineEval: z.custom<AppliedAiEvalResult>().nullable(),
    progress: progressSchema,
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
  if (result.success) return result.data;
  const legacy = sandboxWorldStateV1Schema.safeParse(value);
  if (legacy.success) {
    return sandboxWorldStateSchema.parse({
      ...legacy.data,
      schemaVersion: 2,
      episodeStage: legacy.data.currentStep === "invited" ? "INVITED" : "INSPECTING",
      workspace: createAppliedAiWorkspace(),
      latestEval: null,
      baselineEval: null,
      progress: {
        resourceOpened: false,
        traceOpened: false,
        baselineRun: false,
        configEdited: false,
        evalCaseEdited: false,
        architectureCommitted: legacy.data.seenIdempotencyKeys.some((key) => key.includes("commit_initial")),
        factReleased: legacy.data.constraintDelivered,
        postFactRevision: false,
        postFactEvalRun: false,
        recommendationWritten: false,
        submissionCompleted: false,
      },
    });
  }
  throw new WorldStateError(`Malformed sandbox world_state: ${result.error.issues.map((i) => i.message).join("; ")}`);
}

export function isSandboxWorldState(value: unknown): value is SandboxWorldStateV1 {
  try {
    parseWorldState(value);
    return true;
  } catch {
    return false;
  }
}

export function createWorldState(input: {
  ownerCapabilityHash: string;
  createdFromIpHash: string;
  expiresAt: string;
  currentStep?: SandboxStep;
}): SandboxWorldStateV1 {
  return parseWorldState({
    schemaVersion: 2,
    environment: "sandbox",
    fixtureVersion: APPLIED_AI_FIXTURE_VERSION,
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
    interviewFinding: null,
    hiringOutcome: null,
    lastIdempotencyKey: null,
    seenIdempotencyKeys: [],
    episodeStage: "INVITED",
    workspace: createAppliedAiWorkspace(),
    latestEval: null,
    baselineEval: null,
    progress: {
      resourceOpened: false,
      traceOpened: false,
      baselineRun: false,
      configEdited: false,
      evalCaseEdited: false,
      architectureCommitted: false,
      factReleased: false,
      postFactRevision: false,
      postFactEvalRun: false,
      recommendationWritten: false,
      submissionCompleted: false,
    },
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
    schemaVersion: 2,
    environment: "sandbox",
    fixtureVersion: current.fixtureVersion,
    revision: current.revision + 1,
  });
}
