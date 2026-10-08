/**
 * Software engineering tracks. "Software engineer" is the umbrella a profile
 * can use; simulations are always built for one track. A track being listed
 * here does not make it available in the simulation creator: only
 * combinations backed by a validated role-model scenario are offered (see
 * `src/lib/eng/exemplars/registry.ts`).
 */

import type { RoleFamily, Specialization } from "./taxonomy";

export const TRACK_IDS = [
  "backend_api",
  "applied_ai",
  "frontend",
  "full_stack",
  "data_engineering",
  "platform_devtools",
  "infra_reliability",
  "mobile",
  "ml_engineering",
  "security",
  "systems_performance",
  "embedded_robotics",
] as const;
export type TrackId = (typeof TRACK_IDS)[number];

export type TrackPriority = "launch" | "next" | "later" | "specialist_review" | "specialized_expansion";

export const PRIORITY_LABEL: Record<TrackPriority, string> = {
  launch: "Launch",
  next: "Next",
  later: "Later",
  specialist_review: "Later, with specialist review",
  specialized_expansion: "Specialized expansion",
};

export type TrackTaskFamily = {
  id: string;
  label: string;
  /** What the candidate does, in one line. */
  work: string;
};

export type Track = {
  id: TrackId;
  label: string;
  roles: string[];
  suitableWork: string;
  priority: TrackPriority;
  /** What has to exist before simulations for this track can be credible. */
  prerequisite: string | null;
  /** Claims this track must not make, shown to employers. */
  scopeNote: string | null;
  taskFamilies: TrackTaskFamily[];
};

export const TRACKS: Track[] = [
  {
    id: "backend_api",
    label: "Backend & API",
    roles: ["Backend Engineer", "API Engineer", "Distributed Systems Engineer", "Payments Engineer", "Integrations Engineer"],
    suitableWork: "Debugging services, API contract changes, background jobs, data consistency, integrations",
    priority: "launch",
    prerequisite: null,
    scopeNote: null,
    taskFamilies: [
      { id: "backend.reliability", label: "Reliability debugging", work: "Reproduce and fix a production failure such as duplicate processing or lost work" },
      { id: "backend.contract", label: "API contract change", work: "Change an endpoint's behavior without breaking existing clients" },
      { id: "backend.jobs", label: "Background jobs and queues", work: "Make job processing recover correctly from crashes, timeouts and retries" },
      { id: "backend.consistency", label: "Data consistency", work: "Keep records correct under concurrent writes and partial failures" },
      { id: "backend.integration", label: "Third-party integration", work: "Sync with an external API that rate limits, paginates and fails partway" },
      { id: "backend.authz", label: "Authorization boundaries", work: "Close an access-control gap without breaking legitimate access" },
    ],
  },
  {
    id: "applied_ai",
    label: "Applied AI",
    roles: ["AI Engineer", "LLM Application Engineer", "AI Product Engineer"],
    suitableWork: "Retrieval quality, evaluation pipelines, structured model output, provider failure handling, using recorded model data",
    priority: "launch",
    prerequisite: null,
    scopeNote: "Covers building applications on top of models. It does not assess research, model training or ML engineering in general.",
    taskFamilies: [
      { id: "ai.retrieval", label: "Retrieval quality", work: "Diagnose why a retrieval step returns the wrong or stale context and fix it" },
      { id: "ai.evaluation", label: "Evaluation pipeline", work: "Fix an evaluation harness so its numbers can be trusted" },
      { id: "ai.structured_output", label: "Structured output handling", work: "Parse, validate and recover from malformed or failing model responses" },
    ],
  },
  {
    id: "frontend",
    label: "Frontend",
    roles: ["Frontend Engineer", "UI Engineer", "Design Engineer"],
    suitableWork: "Interaction states, state synchronization, accessibility, rendering issues",
    priority: "next",
    prerequisite: "Browser execution and UI verification in the isolated runner",
    scopeNote: null,
    taskFamilies: [
      { id: "frontend.states", label: "Loading, empty and error states", work: "Make a view handle every state a real user hits" },
      { id: "frontend.state_sync", label: "State synchronization", work: "Fix UI state that drifts from the server" },
      { id: "frontend.a11y", label: "Accessibility", work: "Make an interaction usable by keyboard and screen reader" },
    ],
  },
  {
    id: "full_stack",
    label: "Full-stack & Product",
    roles: ["Full-stack Engineer", "Product Engineer", "Founding Engineer"],
    suitableWork: "A bounded feature across UI, API and persistence, with validation and failure handling",
    priority: "next",
    prerequisite: "Frontend verification, then combined UI and API runs",
    scopeNote: null,
    taskFamilies: [
      { id: "fullstack.feature", label: "Feature across the stack", work: "Ship a small feature through UI, API and storage" },
      { id: "fullstack.partial_failure", label: "Partial failure", work: "Keep the product consistent when one layer fails" },
    ],
  },
  {
    id: "data_engineering",
    label: "Data Engineering",
    roles: ["Data Engineer", "Analytics Engineer"],
    suitableWork: "Pipeline correctness, late and duplicate data, schema changes",
    priority: "later",
    prerequisite: "Runner images with a SQL engine and fixture datasets",
    scopeNote: null,
    taskFamilies: [{ id: "data.pipeline", label: "Pipeline correctness", work: "Fix a pipeline that double counts or drops late records" }],
  },
  {
    id: "platform_devtools",
    label: "Platform & Developer Tools",
    roles: ["Platform Engineer", "Developer Tools Engineer", "Build Engineer"],
    suitableWork: "CI workflows, configuration validation, internal tooling",
    priority: "later",
    prerequisite: "Contained CI and tooling sandboxes",
    scopeNote: null,
    taskFamilies: [{ id: "platform.config", label: "Configuration validation", work: "Catch bad configuration before it ships" }],
  },
  {
    id: "infra_reliability",
    label: "Infrastructure & Reliability",
    roles: ["Site Reliability Engineer", "Infrastructure Engineer", "DevOps Engineer"],
    suitableWork: "Diagnosis from logs and metrics, deployment safeguards, recovery",
    priority: "later",
    prerequisite: "Simulated services with logs and metrics inside the sandbox",
    scopeNote: null,
    taskFamilies: [{ id: "infra.diagnosis", label: "Service diagnosis", work: "Find a fault from logs and metrics and contain it" }],
  },
  {
    id: "mobile",
    label: "Mobile",
    roles: ["iOS Engineer", "Android Engineer", "Mobile Engineer"],
    suitableWork: "Offline state, lifecycle bugs, sync conflicts",
    priority: "later",
    prerequisite: "Device or emulator execution in the runner",
    scopeNote: null,
    taskFamilies: [{ id: "mobile.offline", label: "Offline and sync", work: "Keep app state correct across offline edits and resyncs" }],
  },
  {
    id: "ml_engineering",
    label: "ML Engineering & MLOps",
    roles: ["ML Engineer", "MLOps Engineer"],
    suitableWork: "Data processing defects, split integrity, reproducing baselines",
    priority: "later",
    prerequisite: "Runner images with numeric libraries and recorded datasets",
    scopeNote: null,
    taskFamilies: [{ id: "ml.splits", label: "Split integrity", work: "Find and fix leakage between training and evaluation data" }],
  },
  {
    id: "security",
    label: "Security Engineering",
    roles: ["Security Engineer", "Application Security Engineer"],
    suitableWork: "Vulnerability remediation and secure design in contained code",
    priority: "specialist_review",
    prerequisite: "Scenarios reviewed by a security specialist",
    scopeNote: null,
    taskFamilies: [{ id: "security.remediation", label: "Vulnerability remediation", work: "Fix a vulnerability without breaking legitimate use" }],
  },
  {
    id: "systems_performance",
    label: "Systems & Performance",
    roles: ["Systems Engineer", "Performance Engineer"],
    suitableWork: "Profiling, memory and concurrency defects",
    priority: "specialized_expansion",
    prerequisite: "Stable performance measurement in the runner",
    scopeNote: null,
    taskFamilies: [{ id: "systems.performance", label: "Performance regression", work: "Find and fix a measurable slowdown" }],
  },
  {
    id: "embedded_robotics",
    label: "Embedded & Robotics Software",
    roles: ["Embedded Engineer", "Robotics Software Engineer", "Firmware Engineer"],
    suitableWork: "Hardware-adjacent logic, timing, state machines",
    priority: "specialized_expansion",
    prerequisite: "Hardware simulation in the runner",
    scopeNote: null,
    taskFamilies: [{ id: "embedded.state_machine", label: "Device state machine", work: "Fix a controller that misbehaves on a timing edge" }],
  },
];

export const TRACK_LABEL = Object.fromEntries(TRACKS.map((t) => [t.id, t.label])) as Record<TrackId, string>;

export function isTrackId(v: unknown): v is TrackId {
  return typeof v === "string" && (TRACK_IDS as readonly string[]).includes(v);
}

export function trackOf(id: TrackId): Track {
  const t = TRACKS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown track ${id}`);
  return t;
}

export function taskFamilyOf(trackId: TrackId, taskFamilyId: string): TrackTaskFamily | null {
  return trackOf(trackId).taskFamilies.find((f) => f.id === taskFamilyId) ?? null;
}

/**
 * Stored roles predate tracks. Maps the old family and specialization to a
 * track, or null where the old value was the generic umbrella with nothing
 * more specific to go on.
 */
export function trackFromLegacy(family: RoleFamily, specialization: Specialization): TrackId | null {
  switch (specialization) {
    case "frontend":
      return "frontend";
    case "full_stack":
      return "full_stack";
    case "platform_infrastructure":
      return "infra_reliability";
    case "developer_tools":
      return "platform_devtools";
    case "ml_engineering":
      return "ml_engineering";
    case "general":
      if (family === "backend_api_engineer") return "backend_api";
      if (family === "applied_ai_engineer") return "applied_ai";
      return null;
  }
}

/** The legacy pair a track is stored as, so existing role records and queries keep working. */
export function legacyFromTrack(track: TrackId): { family: RoleFamily; specialization: Specialization } {
  switch (track) {
    case "backend_api":
      return { family: "backend_api_engineer", specialization: "general" };
    case "applied_ai":
      return { family: "applied_ai_engineer", specialization: "general" };
    case "ml_engineering":
      return { family: "applied_ai_engineer", specialization: "ml_engineering" };
    case "frontend":
      return { family: "software_engineer", specialization: "frontend" };
    case "full_stack":
      return { family: "software_engineer", specialization: "full_stack" };
    case "platform_devtools":
      return { family: "software_engineer", specialization: "developer_tools" };
    case "infra_reliability":
      return { family: "software_engineer", specialization: "platform_infrastructure" };
    default:
      return { family: "software_engineer", specialization: "general" };
  }
}