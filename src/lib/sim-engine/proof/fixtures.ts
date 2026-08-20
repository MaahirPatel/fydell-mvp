import type { EventType, ProofEventRecord, RunSnapshot } from "./types";

function event(sequence: number, type: EventType, source: ProofEventRecord["source"], payload: Record<string, unknown>): ProofEventRecord {
  return {
    id: `fix-${sequence}`,
    run_id: "fixture",
    sequence,
    event_type: type,
    event_version: 1,
    source,
    actor_type: source === "CANDIDATE" ? "candidate" : "world",
    actor_id: null,
    stage_id: "DISCOVERY",
    occurred_at: null,
    recorded_at: new Date().toISOString(),
    payload,
  };
}

const emptyArtifact = { diagnosis: "", recommendation: "", customer_message: "", internal_note: "", assumptions: "", limitations: "" };

export function fixtureA(): RunSnapshot {
  return {
    run_id: "fixture-a",
    stage: "COMPLETE",
    released_facts: ["AUTH_001"],
    artifact: { ...emptyArtifact, recommendation: "Switch to the auth-compatible token exchange path. Keep the existing account payload mapping.", customer_message: "Looking into it.", internal_note: "Did not notify sales." },
    events: [event(1, "DECISION_COMMITTED", "CANDIDATE", { kind: "preliminary" }), event(2, "FACT_RELEASED", "WORLD", { fact_id: "AUTH_001" }), event(3, "ARTIFACT_REVISION", "CANDIDATE", { after_fact: "AUTH_001" })],
    defense: [],
  };
}

export function fixtureB(): RunSnapshot {
  return {
    run_id: "fixture-b",
    stage: "COMPLETE",
    released_facts: ["AUTH_001"],
    artifact: { ...emptyArtifact, recommendation: "Throw away the integration, rebuild CRM mapping, change the data model, and delay the demo indefinitely." },
    events: [event(1, "DECISION_COMMITTED", "CANDIDATE", { kind: "preliminary" }), event(2, "FACT_RELEASED", "WORLD", { fact_id: "AUTH_001" }), event(3, "ARTIFACT_REVISION", "CANDIDATE", { after_fact: "AUTH_001", rewrote_all: true })],
    defense: [],
  };
}

export function fixtureC(): RunSnapshot {
  return {
    run_id: "fixture-c",
    stage: "COMPLETE",
    released_facts: ["AUTH_001"],
    artifact: { ...emptyArtifact, recommendation: "Continue with the original endpoint. Friday is fine." },
    events: [event(1, "DECISION_COMMITTED", "CANDIDATE", { kind: "preliminary" }), event(2, "FACT_RELEASED", "WORLD", { fact_id: "AUTH_001" })],
    defense: [],
  };
}

export function fixtureD(): RunSnapshot {
  return {
    run_id: "fixture-d",
    stage: "COMPLETE",
    released_facts: ["AUTH_001", "SALES_001", "CUSTOMER_001"],
    artifact: {
      ...emptyArtifact,
      recommendation: "Replace the incompatible endpoint; preserve account mapping; give sales a honest Friday risk.",
      customer_message: "We found an auth constraint. Friday is at risk until engineering confirms capacity.",
      internal_note: "Told sales immediately.",
    },
    events: [
      event(1, "DECISION_COMMITTED", "CANDIDATE", { kind: "preliminary" }),
      event(2, "FACT_RELEASED", "WORLD", { fact_id: "AUTH_001" }),
      event(3, "ARTIFACT_REVISION", "CANDIDATE", { after_fact: "AUTH_001" }),
      event(4, "CANDIDATE_MESSAGE_SENT", "CANDIDATE", { agent_id: "sales", informed: true }),
    ],
    defense: [{ prompt: "You changed the endpoint after AUTH_001. Why keep the account mapping?", response: "The mapping was not invalidated. Only the auth path was." }],
  };
}

export const FIXTURES = { A: fixtureA, B: fixtureB, C: fixtureC, D: fixtureD } as const;
