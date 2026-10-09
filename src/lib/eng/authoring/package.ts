import { createHash } from "node:crypto";
import type { AiPolicyId, AuthoringConfig, CapabilityId, EnvironmentId, LanguageId } from "./registry";

export type PackageFile = { path: string; content: string };

export const SECTIONS = ["brief", "files", "tests", "criteria", "coworkers", "policy", "timing"] as const;
export type SectionKey = (typeof SECTIONS)[number];

export type AcceptanceCriterion = { id: string; text: string; capability: CapabilityId };

export type RubricCriterion = {
  id: string;
  capability: CapabilityId;
  label: string;
  whyItMatters: string;
  observableEvidence: string;
  anchors: { concern_observed: string; partially_demonstrated: string; demonstrated: string };
  insufficientEvidence: string;
  limitations: string;
  candidateExplanation: string;
  /** Acceptance criteria this criterion is judged against. Empty for reviewer-judged criteria. */
  acceptanceCriterionIds: string[];
  judgedBy: "tests" | "reviewer";
};

export type TestRef = { name: string; file: string; criterionIds: string[] };

export type Coworker = {
  id: string;
  name: string;
  title: string;
  responsibilities: string;
  topics: string[];
  tone: string;
  boundaries: string;
};

/**
 * Everything a candidate may read before or during the task. Stored in
 * eng_scenario_drafts.package and copied into eng_scenario_versions.content.
 */
export type ScenarioPackage = {
  schema: 1;
  config: AuthoringConfig;
  brief: {
    title: string;
    summary: string;
    context: string;
    task: string;
    outcomes: string[];
    constraints: string[];
    outOfScope: string[];
    optionalExtensions: string[];
    /** Public interface of the starter (modules, signatures, injected dependencies). */
    interface: string;
  };
  acceptanceCriteria: AcceptanceCriterion[];
  environment: {
    id: EnvironmentId;
    language: LanguageId;
    setupCommands: string[];
    testCommand: string;
    setupMinutes: number;
    taskMinutes: number;
  };
  setupInstructions: string[];
  /** Candidate-visible project, including public tests. */
  starterFiles: PackageFile[];
  publicTests: TestRef[];
  /** Synthetic fixture files, by path, that live inside starterFiles. */
  fixturePaths: string[];
  rubric: RubricCriterion[];
  coworkers: Coworker[];
  aiPolicy: { id: AiPolicyId; candidateText: string };
  submission: { requirements: string[]; handoffPrompts: Array<{ id: string; label: string; help: string }> };
  accommodations: string[];
  interruptionPolicy: string;
  feedbackPolicy: string;
  /**
   * The one planned review question a teammate may ask near the end. It asks
   * about the candidate's own change and never adds acceptance criteria.
   */
  reviewQuestion?: { coworkerId: string; text: string };
  provenance: {
    path: "generated" | "uploaded" | "template";
    model: string | null;
    generatedAt: string | null;
    sections: Record<SectionKey, { revision: number; editedBy: "generator" | "author"; updatedAt: string }>;
  };
};

/**
 * Evaluator-only material. Stored in eng_scenario_draft_protected and
 * eng_scenario_version_protected; never returned by candidate APIs.
 */
export type ProtectedMaterials = {
  protectedTests: PackageFile[];
  protectedTestRefs: TestRef[];
  reference: { files: PackageFile[]; approaches: string[] };
  incorrectSolutions: Array<{ id: string; description: string; files: PackageFile[] }>;
  /** Per coworker id. `topics` are short phrases a question must concern before the fact is disclosed. */
  coworkerFacts: Record<string, Array<{ id: string; text: string; topics?: string[] }>>;
  rubricNotes: Record<string, string>;
};

export function emptyProtected(): ProtectedMaterials {
  return { protectedTests: [], protectedTestRefs: [], reference: { files: [], approaches: [] }, incorrectSolutions: [], coworkerFacts: {}, rubricNotes: {} };
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${stable(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/** Hash of the exact candidate-facing package plus evaluator material, excluding provenance timestamps. */
export function packageSha256(pkg: ScenarioPackage, prot: ProtectedMaterials): string {
  const { provenance: _p, ...rest } = pkg;
  void _p;
  return createHash("sha256").update(stable({ pkg: rest, prot })).digest("hex");
}

/** Which sections each check depends on, so an edit marks only affected results stale. */
export const CHECK_DEPENDENCIES: Record<string, SectionKey[]> = {
  setup: ["files"],
  baseline: ["files", "tests"],
  reference: ["files", "tests"],
  incorrect: ["files", "tests"],
  repeatability: ["files", "tests"],
  discovery: ["files", "tests"],
  protected_isolation: ["files", "tests"],
  leakage: ["files", "tests", "brief", "coworkers", "criteria"],
  test_mapping: ["tests", "brief"],
  disclosed_requirements: ["tests", "brief"],
  instructions_files: ["brief", "files"],
  secrets: ["files", "tests", "brief"],
  rubric: ["criteria", "brief"],
  coworkers: ["coworkers", "brief"],
  policy: ["policy"],
  timing: ["timing"],
  submission: ["policy", "brief"],
};

export function sectionRevisions(pkg: ScenarioPackage): Record<SectionKey, number> {
  const out = {} as Record<SectionKey, number>;
  for (const s of SECTIONS) out[s] = pkg.provenance.sections[s]?.revision ?? 1;
  return out;
}

export function bumpSections(pkg: ScenarioPackage, sections: SectionKey[], by: "generator" | "author"): ScenarioPackage {
  const now = new Date().toISOString();
  const next = { ...pkg.provenance.sections };
  for (const s of sections) next[s] = { revision: (next[s]?.revision ?? 0) + 1, editedBy: by, updatedAt: now };
  return { ...pkg, provenance: { ...pkg.provenance, sections: next } };
}

export function initialSections(by: "generator" | "author"): ScenarioPackage["provenance"]["sections"] {
  const now = new Date().toISOString();
  const out = {} as ScenarioPackage["provenance"]["sections"];
  for (const s of SECTIONS) out[s] = { revision: 1, editedBy: by, updatedAt: now };
  return out;
}

const SAFE_PATH = /^(?!\/)(?!.*\.\.)(?!.*\/\/)[A-Za-z0-9_][A-Za-z0-9_./-]{0,119}$/;
export function isSafePath(p: string): boolean {
  return SAFE_PATH.test(p) && !p.endsWith("/");
}

export const FILE_LIMITS = { maxFiles: 40, maxFileBytes: 64_000, maxTotalBytes: 400_000 } as const;

export function validateFiles(files: PackageFile[], label: string): string[] {
  const issues: string[] = [];
  if (files.length > FILE_LIMITS.maxFiles) issues.push(`${label}: at most ${FILE_LIMITS.maxFiles} files.`);
  let total = 0;
  const seen = new Set<string>();
  for (const f of files) {
    if (!isSafePath(f.path)) issues.push(`${label}: "${f.path.slice(0, 80)}" is not a safe relative path.`);
    if (seen.has(f.path)) issues.push(`${label}: duplicate file ${f.path}.`);
    seen.add(f.path);
    const bytes = Buffer.byteLength(f.content, "utf8");
    if (bytes > FILE_LIMITS.maxFileBytes) issues.push(`${label}: ${f.path} is larger than ${FILE_LIMITS.maxFileBytes / 1000} KB.`);
    total += bytes;
  }
  if (total > FILE_LIMITS.maxTotalBytes) issues.push(`${label}: files total more than ${FILE_LIMITS.maxTotalBytes / 1000} KB.`);
  return issues;
}

/** Narrowing helpers for JSON read back from the database. */
export function asPackage(v: unknown): ScenarioPackage | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  return o.schema === 1 && typeof o.brief === "object" && Array.isArray(o.starterFiles) ? (v as ScenarioPackage) : null;
}
export function asProtected(v: unknown): ProtectedMaterials {
  if (!v || typeof v !== "object") return emptyProtected();
  const o = v as Partial<ProtectedMaterials>;
  return {
    protectedTests: Array.isArray(o.protectedTests) ? o.protectedTests : [],
    protectedTestRefs: Array.isArray(o.protectedTestRefs) ? o.protectedTestRefs : [],
    reference: o.reference && Array.isArray(o.reference.files) ? { files: o.reference.files, approaches: Array.isArray(o.reference.approaches) ? o.reference.approaches : [] } : { files: [], approaches: [] },
    incorrectSolutions: Array.isArray(o.incorrectSolutions) ? o.incorrectSolutions : [],
    coworkerFacts: o.coworkerFacts && typeof o.coworkerFacts === "object" ? o.coworkerFacts : {},
    rubricNotes: o.rubricNotes && typeof o.rubricNotes === "object" ? o.rubricNotes : {},
  };
}
