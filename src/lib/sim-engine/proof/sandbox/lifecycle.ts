import "server-only";
import { randomBytes } from "crypto";
import { PROOF_ROLE_ID, PROOF_VERSION_ID } from "../types";
import { proofAdmin } from "../db";
import { ACME_ROLLOUT_FIXTURE } from "./fixture";
import { createWorldState, parseWorldState } from "./world-state";
import { createCapabilitySecret, hashCapabilitySecret, hashIp } from "./capability";
import { ProofSimulationRunRepository } from "./proof-repos";
import { cleanupExpiredSandboxes, deleteSandboxGraph, markCleanupFailed } from "./cleanup";
import { streamForEventType } from "./events";
import type { SimulationRunRecord } from "./repositories";

const CREATE_WINDOW_MS = 60 * 60 * 1000;
const CREATE_LIMIT = 8;
const TTL_MS = 24 * 60 * 60 * 1000;

const runs = new ProofSimulationRunRepository();

export async function createSandboxRun(ip: string): Promise<{
  run: SimulationRunRecord;
  capabilitySecret: string;
}> {
  await cleanupExpiredSandboxes(10);
  const ipHash = hashIp(ip || "unknown");
  const admin = proofAdmin();
  const windowStart = new Date(Date.now() - CREATE_WINDOW_MS).toISOString();
  const { data: recent } = await admin
    .from("proof_product_events")
    .select("id, payload")
    .eq("name", "sandbox_create")
    .gte("created_at", windowStart);
  const recentCount = (recent ?? []).filter((row) => {
    const payload = row.payload as { ipHash?: string } | null;
    return payload?.ipHash === ipHash;
  }).length;
  if (recentCount >= CREATE_LIMIT) {
    throw new Error("Sandbox creation is temporarily rate limited.");
  }
  const capability = createCapabilitySecret();
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();
  const slug = `sandbox-${randomBytes(6).toString("hex")}`;
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: `${ACME_ROLLOUT_FIXTURE.organization.name} sandbox`,
      slug,
      status: "active",
      owner_email: `sandbox+${slug}@fydell.invalid`,
      commercial_model: "sandbox",
    })
    .select("id")
    .single();
  if (orgError || !org) throw new Error(orgError?.message || "sandbox org create failed");
  const token = randomBytes(24).toString("hex");
  const { data: invite, error: inviteError } = await admin
    .from("proof_invitations")
    .insert({
      organization_id: org.id,
      role_id: PROOF_ROLE_ID,
      simulation_version_id: PROOF_VERSION_ID,
      email: `candidate+${slug}@fydell.invalid`,
      token,
      status: "in_progress",
    })
    .select("id")
    .single();
  if (inviteError || !invite) {
    await admin.from("organizations").delete().eq("id", org.id);
    throw new Error(inviteError?.message || "sandbox invite create failed");
  }
  const worldState = createWorldState({
    ownerCapabilityHash: capability.hash,
    createdFromIpHash: ipHash,
    expiresAt,
    currentStep: "invited",
  });
  const run = await runs.create({
    organizationId: org.id,
    invitationId: invite.id,
    worldState,
  });
  await runs.appendEvent({
    runId: run.id,
    eventType: "WALKTHROUGH_STARTED",
    stream: streamForEventType("WALKTHROUGH_STARTED"),
    actorType: "system",
    correlationId: run.id,
    idempotencyKey: `${run.id}:start`,
    payload: { fixtureVersion: ACME_ROLLOUT_FIXTURE.fixtureVersion },
  });
  await admin.from("proof_product_events").insert({
    organization_id: org.id,
    run_id: run.id,
    name: "sandbox_create",
    payload: { ipHash },
  });
  return { run, capabilitySecret: capability.secret };
}

export async function loadOwnedSandbox(runId: string, capabilitySecret: string): Promise<SimulationRunRecord> {
  const run = await runs.load(runId);
  if (run.worldState.ownerCapabilityHash !== hashCapabilitySecret(capabilitySecret)) {
    throw new Error("sandbox capability mismatch");
  }
  if (run.worldState.cleanupStatus === "cleanup_failed") {
    throw new Error("sandbox cleanup_failed");
  }
  if (new Date(run.worldState.expiresAt).getTime() < Date.now()) {
    try {
      await deleteSandboxGraph(run.id, run.organizationId);
    } catch {
      await markCleanupFailed(run.id);
    }
    throw new Error("sandbox expired");
  }
  return run;
}

export async function resetSandbox(runId: string, capabilitySecret: string, ip: string): Promise<{
  run: SimulationRunRecord;
  capabilitySecret: string;
}> {
  const current = await loadOwnedSandbox(runId, capabilitySecret);
  if (current.worldState.cleanupStatus === "cleanup_failed") {
    throw new Error("Cannot reseed a sandbox marked cleanup_failed");
  }
  try {
    await deleteSandboxGraph(current.id, current.organizationId);
  } catch {
    await markCleanupFailed(current.id);
    throw new Error("sandbox reset failed");
  }
  return createSandboxRun(ip);
}

export function parseRunWorldState(value: unknown) {
  return parseWorldState(value);
}
