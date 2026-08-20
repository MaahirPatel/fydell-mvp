import type { ArtifactContent, EvidenceClaimDraft, RunSnapshot } from "../types";
import type { SandboxFixtureManifest } from "./fixture";
import type { SandboxWorldStateV1 } from "./world-state";
import type { SandboxStep } from "./steps";
import type { SandboxEventType, EventStream } from "./events";

export interface SimulationRunRecord {
  id: string;
  organizationId: string;
  invitationId: string;
  worldState: SandboxWorldStateV1;
  stage: string;
  status: string;
  releasedFacts: string[];
}

export interface AppendEventInput {
  runId: string;
  eventType: SandboxEventType;
  stream: EventStream;
  actorType: string;
  actorId?: string | null;
  correlationId: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
}

export interface SimulationRunRepository {
  create(input: {
    organizationId: string;
    invitationId: string;
    worldState: SandboxWorldStateV1;
  }): Promise<SimulationRunRecord>;
  load(runId: string): Promise<SimulationRunRecord>;
  loadSnapshot(runId: string): Promise<RunSnapshot>;
  updateWorldState(runId: string, previous: SandboxWorldStateV1, next: SandboxWorldStateV1, stage: string, status: string): Promise<void>;
  appendEvent(input: AppendEventInput): Promise<{ id: string; sequence: number }>;
  saveArtifact(runId: string, content: ArtifactContent, stage: string): Promise<void>;
  setReleasedFacts(runId: string, facts: string[]): Promise<void>;
}

export interface EvidenceAnalysisRepository {
  persistPassA(runId: string, claims: EvidenceClaimDraft[], defensePrompt: string, defenseTarget: string): Promise<void>;
  persistPassB(runId: string, claims: EvidenceClaimDraft[], brief: {
    recommendation: "INTERVIEW" | "HOLD" | "INSUFFICIENT_EVIDENCE";
    why: string;
    strengths: string[];
    concerns: string[];
    probes: string[];
  }): Promise<void>;
  loadClaims(runId: string): Promise<Array<EvidenceClaimDraft & { id: string; pass: string; review_status: string }>>;
}

export interface IssuedReceipt {
  publicId: string;
  integrityHash: string;
  payload: Record<string, unknown>;
}

export interface WorkReceiptIssuer {
  issue(input: {
    runId: string;
    items: string[];
    conditions: string[];
    eventIds: string[];
  }): Promise<IssuedReceipt>;
  loadPublic(publicId: string): Promise<IssuedReceipt | null>;
}

export interface SandboxFixtureProvider {
  getManifest(): SandboxFixtureManifest;
}

export interface SandboxReviewRecord {
  kind: "scripted" | "sandbox_visitor";
  decision: "approve" | "limit" | "follow_up" | "reject";
  label: string;
  disclaimer: string;
}

export function scriptedReviewLabel(): SandboxReviewRecord {
  return {
    kind: "scripted",
    decision: "approve",
    label: "Scripted sandbox reviewer",
    disclaimer: "Demonstration review generated from a fictional sandbox workflow.",
  };
}

export function visitorReviewLabel(decision: SandboxReviewRecord["decision"]): SandboxReviewRecord {
  return {
    kind: "sandbox_visitor",
    decision,
    label: "Reviewed by sandbox visitor",
    disclaimer: "This decision was recorded by the sandbox visitor. It is not a Fydell hiring decision.",
  };
}
