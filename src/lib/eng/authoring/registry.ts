/**
 * The capability registry: every option the simulation creator offers, and
 * the only combinations it accepts. Each accepted combination maps to an
 * environment the runner can actually execute (see runner.ts). Anything
 * else is rejected up front with the reason and a supported alternative.
 *
 * Every selection also accepts "Other" with free text. Free text is resolved
 * here: mapped to a supported choice, turned into an assumption the author
 * confirms, carried into the brief and rubric, or rejected with a reason.
 *
 * Pure module: used by the server for validation and served to the client
 * through /api/eng/authoring/registry so both read the same rules.
 */
import {
  FAMILY_LABEL,
  FAMILY_SPECIALIZATIONS,
  LEVEL_LABEL,
  LEVEL_SCOPE,
  ROLE_FAMILIES,
  SPECIALIZATION_LABEL,
  SPECIALIZATIONS,
  LEVELS,
  type Level,
  type RoleFamily,
  type Specialization,
} from "../taxonomy";
import { TRACK_LABEL, isTrackId, legacyFromTrack, taskFamilyOf, type TrackId } from "../tracks";

export type Option<K extends string = string> = { id: K; label: string; description?: string };
export const OTHER = "other" as const;
export type Other = typeof OTHER;

export const ENVIRONMENTS = {
  "python-stdlib": {
    id: "python-stdlib",
    label: "Python 3.12+ standard library",
    runtime: "python",
    testRunner: "unittest",
    note: "Runs with no network and no package installation. Tests use unittest.",
  },
  "node-stdlib": {
    id: "node-stdlib",
    label: "Node.js 22+ standard library",
    runtime: "node",
    testRunner: "node:test",
    note: "Runs with no network and no package installation. Tests use node:test and node:assert.",
  },
} as const;
export type EnvironmentId = keyof typeof ENVIRONMENTS;

export type LanguageId = "python" | "javascript" | "typescript";
export const LANGUAGES: Array<Option<LanguageId> & { environment: EnvironmentId; extension: string; aliases: string[] }> = [
  { id: "python", label: "Python", environment: "python-stdlib", extension: "py", aliases: ["python", "py", "python3", "cpython"] },
  { id: "javascript", label: "JavaScript", environment: "node-stdlib", extension: "js", aliases: ["javascript", "js", "node", "nodejs", "node.js", "ecmascript", "es6"] },
  {
    id: "typescript",
    label: "TypeScript",
    environment: "node-stdlib",
    extension: "ts",
    aliases: ["typescript", "ts"],
    description: "Runs through Node's built-in type stripping: erasable type annotations only, no enums or decorators.",
  },
];

type Unsupported<A extends string> = { label: string; aliases?: string[]; reason: string; alternative: A };

const NO_TOOLCHAIN = (what: string) => `The isolated runner has no ${what} yet.`;
/** Languages people ask for that the runner cannot execute yet, with the closest supported choice. */
export const UNSUPPORTED_LANGUAGES: Unsupported<LanguageId>[] = [
  { label: "Go", aliases: ["golang"], reason: NO_TOOLCHAIN("Go toolchain"), alternative: "python" },
  { label: "Java", reason: NO_TOOLCHAIN("JVM"), alternative: "typescript" },
  { label: "Kotlin", reason: NO_TOOLCHAIN("JVM"), alternative: "typescript" },
  { label: "Scala", reason: NO_TOOLCHAIN("JVM"), alternative: "python" },
  { label: "Clojure", reason: NO_TOOLCHAIN("JVM"), alternative: "python" },
  { label: "Rust", reason: NO_TOOLCHAIN("Rust toolchain"), alternative: "typescript" },
  { label: "C#", aliases: ["csharp", "c sharp", ".net", "dotnet"], reason: NO_TOOLCHAIN(".NET runtime"), alternative: "typescript" },
  { label: "F#", aliases: ["fsharp"], reason: NO_TOOLCHAIN(".NET runtime"), alternative: "python" },
  { label: "Ruby", reason: NO_TOOLCHAIN("Ruby interpreter"), alternative: "python" },
  { label: "PHP", reason: NO_TOOLCHAIN("PHP interpreter"), alternative: "javascript" },
  { label: "C", reason: NO_TOOLCHAIN("C compiler"), alternative: "python" },
  { label: "C++", aliases: ["cpp", "cplusplus"], reason: NO_TOOLCHAIN("C++ compiler"), alternative: "python" },
  { label: "Swift", reason: NO_TOOLCHAIN("Swift toolchain"), alternative: "typescript" },
  { label: "Objective-C", aliases: ["objc"], reason: NO_TOOLCHAIN("Objective-C toolchain"), alternative: "typescript" },
  { label: "Dart", aliases: ["flutter"], reason: NO_TOOLCHAIN("Dart SDK"), alternative: "typescript" },
  { label: "Elixir", reason: NO_TOOLCHAIN("BEAM runtime"), alternative: "python" },
  { label: "Erlang", reason: NO_TOOLCHAIN("BEAM runtime"), alternative: "python" },
  { label: "Haskell", reason: NO_TOOLCHAIN("Haskell toolchain"), alternative: "python" },
  { label: "OCaml", reason: NO_TOOLCHAIN("OCaml toolchain"), alternative: "python" },
  { label: "R", reason: NO_TOOLCHAIN("R interpreter"), alternative: "python" },
  { label: "Julia", reason: NO_TOOLCHAIN("Julia runtime"), alternative: "python" },
  { label: "Lua", reason: NO_TOOLCHAIN("Lua interpreter"), alternative: "python" },
  { label: "Perl", reason: NO_TOOLCHAIN("Perl interpreter"), alternative: "python" },
  { label: "Zig", reason: NO_TOOLCHAIN("Zig toolchain"), alternative: "python" },
  { label: "Solidity", reason: NO_TOOLCHAIN("EVM toolchain"), alternative: "typescript" },
  { label: "SQL", aliases: ["postgresql", "plpgsql", "t-sql"], reason: "SQL-only tasks need a database server. Python with SQLite runs real SQL queries.", alternative: "python" },
  { label: "Bash", aliases: ["shell", "sh", "zsh", "powershell"], reason: "Shell tasks need a full system image the runner does not expose.", alternative: "python" },
];

export type FrameworkId = "none" | "python-http-server" | "python-asyncio" | "python-argparse" | "node-http" | "node-events" | "node-cli";
export const FRAMEWORKS: Array<Option<FrameworkId> & { languages: LanguageId[] }> = [
  { id: "none", label: "No framework", languages: ["python", "javascript", "typescript"], description: "Plain modules and functions." },
  { id: "python-http-server", label: "http.server (standard library)", languages: ["python"], description: "A small HTTP handler without third-party packages." },
  { id: "python-asyncio", label: "asyncio (standard library)", languages: ["python"], description: "Concurrent workers, queues and timeouts." },
  { id: "python-argparse", label: "argparse CLI (standard library)", languages: ["python"], description: "A command-line tool." },
  { id: "node-http", label: "node:http (standard library)", languages: ["javascript", "typescript"], description: "A small HTTP server without npm packages." },
  { id: "node-events", label: "node:events and streams", languages: ["javascript", "typescript"], description: "Event emitters, queues and backpressure." },
  { id: "node-cli", label: "node:util parseArgs CLI", languages: ["javascript", "typescript"], description: "A command-line tool." },
];

const NEEDS_PACKAGES = "Needs package installation, and the runner has no network access.";
export const UNSUPPORTED_FRAMEWORKS: Unsupported<FrameworkId>[] = [
  { label: "FastAPI", reason: NEEDS_PACKAGES, alternative: "python-http-server" },
  { label: "Django", reason: NEEDS_PACKAGES, alternative: "python-http-server" },
  { label: "Flask", reason: NEEDS_PACKAGES, alternative: "python-http-server" },
  { label: "Starlette", reason: NEEDS_PACKAGES, alternative: "python-http-server" },
  { label: "SQLAlchemy", reason: NEEDS_PACKAGES, alternative: "none" },
  { label: "Pydantic", reason: NEEDS_PACKAGES, alternative: "none" },
  { label: "Celery", reason: NEEDS_PACKAGES, alternative: "python-asyncio" },
  { label: "pytest", reason: "Tests use unittest from the standard library, which pytest can also run locally.", alternative: "none" },
  { label: "Express", reason: NEEDS_PACKAGES, alternative: "node-http" },
  { label: "Fastify", reason: NEEDS_PACKAGES, alternative: "node-http" },
  { label: "Koa", reason: NEEDS_PACKAGES, alternative: "node-http" },
  { label: "Hono", reason: NEEDS_PACKAGES, alternative: "node-http" },
  { label: "NestJS", aliases: ["nest"], reason: NEEDS_PACKAGES, alternative: "node-http" },
  { label: "Prisma", reason: NEEDS_PACKAGES, alternative: "none" },
  { label: "Jest", aliases: ["vitest", "mocha"], reason: "Tests use node:test, which needs no packages.", alternative: "none" },
  { label: "React", aliases: ["react native"], reason: "Rendering tasks need a DOM test environment the runner does not provide yet. Component logic can still be tested as plain modules.", alternative: "node-events" },
  { label: "Next.js", aliases: ["nextjs"], reason: "Needs npm packages and a build step the runner does not provide yet.", alternative: "node-http" },
  { label: "Vue", aliases: ["nuxt"], reason: "Rendering tasks need a DOM test environment the runner does not provide yet.", alternative: "node-events" },
  { label: "Angular", reason: "Rendering tasks need a DOM test environment the runner does not provide yet.", alternative: "node-events" },
  { label: "Svelte", aliases: ["sveltekit"], reason: "Rendering tasks need a DOM test environment the runner does not provide yet.", alternative: "node-events" },
  { label: "Spring", aliases: ["spring boot"], reason: NO_TOOLCHAIN("JVM"), alternative: "node-http" },
  { label: "Rails", aliases: ["ruby on rails"], reason: NO_TOOLCHAIN("Ruby interpreter"), alternative: "python-http-server" },
  { label: "Laravel", reason: NO_TOOLCHAIN("PHP interpreter"), alternative: "node-http" },
  { label: "ASP.NET", aliases: ["asp.net core"], reason: NO_TOOLCHAIN(".NET runtime"), alternative: "node-http" },
  { label: "Gin", aliases: ["echo", "fiber"], reason: NO_TOOLCHAIN("Go toolchain"), alternative: "python-http-server" },
  { label: "Phoenix", reason: NO_TOOLCHAIN("BEAM runtime"), alternative: "python-asyncio" },
  { label: "LangChain", aliases: ["llamaindex"], reason: `${NEEDS_PACKAGES} AI tasks use recorded model outputs instead.`, alternative: "none" },
  { label: "PyTorch", aliases: ["tensorflow", "jax", "keras"], reason: "Needs packages and hardware the runner does not provide.", alternative: "none" },
  { label: "pandas", aliases: ["numpy", "scikit-learn", "sklearn"], reason: NEEDS_PACKAGES, alternative: "none" },
];

export type DatabaseId = "none" | "sqlite" | "in-memory" | "json-files";
export const DATABASES: Array<Option<DatabaseId> & { languages: LanguageId[] }> = [
  { id: "none", label: "None required", languages: ["python", "javascript", "typescript"] },
  { id: "sqlite", label: "SQLite (sqlite3 module)", languages: ["python"], description: "A real SQL database created by the tests." },
  { id: "in-memory", label: "In-memory store", languages: ["python", "javascript", "typescript"], description: "A small repository class standing in for a database." },
  { id: "json-files", label: "JSON files", languages: ["python", "javascript", "typescript"], description: "Records read from and written to files in a temporary directory." },
];
const NO_SERVER = "The isolated runner has no database server or external services.";
export const UNSUPPORTED_DATABASES: Unsupported<DatabaseId>[] = [
  { label: "PostgreSQL", aliases: ["postgres", "supabase", "neon"], reason: NO_SERVER, alternative: "sqlite" },
  { label: "MySQL", aliases: ["mariadb", "planetscale"], reason: NO_SERVER, alternative: "sqlite" },
  { label: "SQL Server", aliases: ["mssql"], reason: NO_SERVER, alternative: "sqlite" },
  { label: "Oracle", reason: NO_SERVER, alternative: "sqlite" },
  { label: "MongoDB", aliases: ["mongo"], reason: NO_SERVER, alternative: "in-memory" },
  { label: "DynamoDB", reason: NO_SERVER, alternative: "in-memory" },
  { label: "Cassandra", aliases: ["scylla"], reason: NO_SERVER, alternative: "in-memory" },
  { label: "Redis", aliases: ["valkey", "memcached"], reason: NO_SERVER, alternative: "in-memory" },
  { label: "Elasticsearch", aliases: ["opensearch"], reason: NO_SERVER, alternative: "in-memory" },
  { label: "Kafka", aliases: ["rabbitmq", "sqs", "pubsub", "nats"], reason: `${NO_SERVER} Queues can be modeled in memory.`, alternative: "in-memory" },
  { label: "Snowflake", aliases: ["bigquery", "redshift", "clickhouse"], reason: NO_SERVER, alternative: "sqlite" },
  { label: "Pinecone", aliases: ["weaviate", "qdrant", "pgvector", "chroma"], reason: `${NO_SERVER} Vector search can use precomputed embeddings in memory.`, alternative: "in-memory" },
];

export type TechnologyId =
  | "json" | "csv" | "logging" | "datetime" | "regex" | "validation" | "caching" | "rate-limiting" | "pagination"
  | "retries" | "webhooks" | "queues" | "concurrency" | "state-machines" | "hmac" | "streaming" | "config"
  | "dataclasses" | "typing" | "concurrent-futures" | "worker-threads" | "recorded-model-outputs" | "embeddings-fixtures";
const ALL: LanguageId[] = ["python", "javascript", "typescript"];
const NODE: LanguageId[] = ["javascript", "typescript"];
export const TECHNOLOGIES: Array<Option<TechnologyId> & { languages: LanguageId[] }> = [
  { id: "json", label: "JSON parsing and validation", languages: ALL },
  { id: "csv", label: "CSV and file parsing", languages: ALL },
  { id: "validation", label: "Input validation", languages: ALL },
  { id: "logging", label: "Structured logging", languages: ALL },
  { id: "datetime", label: "Dates, times and time zones", languages: ALL },
  { id: "regex", label: "Regular expressions", languages: ALL },
  { id: "caching", label: "Caching and invalidation", languages: ALL },
  { id: "rate-limiting", label: "Rate limiting", languages: ALL },
  { id: "pagination", label: "Pagination", languages: ALL },
  { id: "retries", label: "Retries and backoff", languages: ALL },
  { id: "webhooks", label: "Webhooks and idempotency", languages: ALL },
  { id: "queues", label: "Job queues", languages: ALL },
  { id: "concurrency", label: "Concurrency and locking", languages: ALL },
  { id: "state-machines", label: "State machines", languages: ALL },
  { id: "hmac", label: "Signatures and HMAC", languages: ALL },
  { id: "streaming", label: "Streaming and backpressure", languages: ALL },
  { id: "config", label: "Configuration and feature flags", languages: ALL },
  { id: "recorded-model-outputs", label: "Recorded LLM outputs (fixtures)", languages: ALL },
  { id: "embeddings-fixtures", label: "Precomputed embeddings (fixtures)", languages: ALL },
  { id: "dataclasses", label: "dataclasses", languages: ["python"] },
  { id: "typing", label: "Type hints and protocols", languages: ["python", "typescript"] },
  { id: "concurrent-futures", label: "concurrent.futures", languages: ["python"] },
  { id: "worker-threads", label: "worker_threads", languages: NODE },
];

export type TaskTypeId = "debugging" | "feature" | "refactoring" | "testing" | "code_review" | "ai_evaluation";
export const TASK_TYPES: Array<Option<TaskTypeId> & { supported: boolean; reason?: string; alternative?: TaskTypeId }> = [
  { id: "debugging", label: "Debugging", supported: true, description: "Find and fix a defect in existing code, with a regression test." },
  { id: "feature", label: "Feature implementation", supported: true, description: "Add a bounded behavior to an existing module." },
  { id: "refactoring", label: "Refactoring", supported: true, description: "Improve structure while tests prove behavior is preserved." },
  {
    id: "testing",
    label: "Testing",
    supported: false,
    reason: "Judging candidate-written tests needs mutation runs against defective builds, which the runner does not do yet. Debugging tasks already require a regression test.",
    alternative: "debugging",
  },
  {
    id: "code_review",
    label: "Code review",
    supported: false,
    reason: "Review tasks are judged by people from written comments; there are no executable checks to validate them yet.",
    alternative: "debugging",
  },
  { id: "ai_evaluation", label: "AI evaluation", supported: true, description: "Evaluate or fix an evaluation over recorded model outputs. No API keys or live models." },
];

export type CapabilityId =
  | "correctness" | "reliability" | "testing" | "maintainability" | "security" | "performance" | "technical_judgment" | "communication";
export const CAPABILITIES: Array<Option<CapabilityId> & { executable: boolean }> = [
  { id: "correctness", label: "Correctness", executable: true, description: "The required behavior works, checked by tests." },
  { id: "reliability", label: "Reliability", executable: true, description: "Failures, retries and edge cases are handled." },
  { id: "testing", label: "Testing", executable: false, description: "The candidate adds tests that would catch a regression. Judged by a reviewer." },
  { id: "maintainability", label: "Maintainability", executable: false, description: "Readable, well-structured change. Judged by a reviewer." },
  { id: "security", label: "Security", executable: true, description: "Input validation and authorization boundaries." },
  { id: "performance", label: "Performance", executable: true, description: "Meets a stated bound on work done. No timing-sensitive tests." },
  { id: "technical_judgment", label: "Technical judgment", executable: false, description: "Tradeoffs explained in the handoff. Judged by a reviewer." },
  { id: "communication", label: "Communication", executable: false, description: "A necessary clarification and a usable handoff. Judged by a reviewer." },
];

export type AiPolicyId = "no_assistants" | "assistants_disclosed" | "any_tools" | "custom";
export const AI_POLICIES: Array<Option<Exclude<AiPolicyId, "custom">> & { candidateText: string }> = [
  {
    id: "no_assistants",
    label: "No AI assistants",
    description: "Search engines and documentation are fine. AI coding assistants and chatbots are not.",
    candidateText: "Do not use AI coding assistants or chatbots for this task. Documentation and search engines are fine. Fydell cannot see the tools you use; the policy relies on you.",
  },
  {
    id: "assistants_disclosed",
    label: "AI assistants allowed, with disclosure",
    description: "Any assistant may be used. The candidate describes how in the handoff.",
    candidateText: "You may use AI assistants. Describe what you used them for in your handoff. Using them is not held against you.",
  },
  {
    id: "any_tools",
    label: "Any tools, no disclosure",
    description: "Treat it like normal work. Nothing is asked about tool use.",
    candidateText: "Use any tools you would use at work. You do not need to describe them.",
  },
];

export type StartingMaterialId = "generated" | "uploaded" | "reviewed_template" | "repository";
export const STARTING_MATERIALS: Array<Option<StartingMaterialId> & { supported: boolean; reason?: string; alternative?: StartingMaterialId }> = [
  { id: "generated", label: "Generated starter project", supported: true, description: "Fydell drafts the starter, tests and reference solution, then runs them." },
  { id: "uploaded", label: "Upload starter files", supported: true, description: "Your own starter, tests and reference solution, checked by the same runner." },
  {
    id: "reviewed_template",
    label: "Fydell-reviewed template",
    supported: true,
    description: "Use the reviewed Backend/API webhook retry scenario as published. Attach it to a role from the Library.",
  },
  {
    id: "repository",
    label: "Permitted repository",
    supported: false,
    reason: "Repository import needs a scoped GitHub App connection, which is not available yet.",
    alternative: "uploaded",
  },
];

export const DURATION_PRESETS = [45, 60, 90, 120] as const;
export const DURATION_LIMITS = { minTask: 30, maxTask: 180, minSetup: 5, maxSetup: 30, defaultSetup: 10 } as const;

/** Free text the author typed for an "Other" selection, resolved into the config below. */
export type Customizations = {
  familyLabel?: string;
  specializationLabel?: string;
  frameworkStyle?: string;
  databaseStyle?: string;
  extraTechnologies: string[];
  taskTypeNote?: string;
  customCapabilities: string[];
  aiPolicyText?: string;
};

/**
 * What the employer is hiring for, kept as separate fields: a job title is
 * context, the track decides the kind of engineering work, the role model is
 * the validated scenario the generator adapts. Null on drafts created before
 * tracks existed.
 */
export type SimulationIntent = {
  track: TrackId;
  taskFamily: string;
  exemplarKey: string;
  /** "as_is" runs the role model unchanged; "adapt" generates a new scenario from it in the employer's context. */
  mode: "as_is" | "adapt";
  jobTitle: string;
  businessContext: string;
  secondaryCapability: string;
};

/** Validated role models the server offers, used to gate track, task family and language. */
export type ExemplarOption = { key: string; track: TrackId; taskFamily: string; language: LanguageId };

/** The resolved configuration used for generation and stored in the package. Contains no "other". */
export type AuthoringConfig = {
  simulation?: SimulationIntent | null;
  family: RoleFamily;
  specialization: Specialization;
  level: Level;
  levelExpectations: string;
  language: LanguageId;
  framework: FrameworkId;
  database: DatabaseId;
  technologies: TechnologyId[];
  taskType: TaskTypeId;
  capabilities: CapabilityId[];
  taskMinutes: number;
  setupMinutes: number;
  aiPolicy: AiPolicyId;
  startingMaterial: StartingMaterialId;
  description: string;
  outcomes: string[];
  constraints: string[];
  outOfScope: string[];
  background: string;
  confirmedAssumptions: string[];
  answers: Record<string, string>;
  custom: Customizations;
};

export const OTHER_FIELDS = ["family", "specialization", "language", "framework", "database", "technologies", "taskType", "capabilities", "aiPolicy", "startingMaterial"] as const;
export type OtherField = (typeof OTHER_FIELDS)[number];

/** What the form submits. Single selections may be "other"; multiselects may include "other". */
export type AuthoringInput = Omit<AuthoringConfig, "simulation" | "family" | "specialization" | "language" | "framework" | "database" | "taskType" | "aiPolicy" | "startingMaterial" | "technologies" | "capabilities" | "custom"> & {
  simulation: SimulationIntent | null;
  family: RoleFamily | Other;
  specialization: Specialization | Other;
  language: LanguageId | Other;
  framework: FrameworkId | Other;
  database: DatabaseId | Other;
  taskType: TaskTypeId | Other;
  aiPolicy: Exclude<AiPolicyId, "custom"> | Other;
  startingMaterial: StartingMaterialId | Other;
  technologies: Array<TechnologyId | Other>;
  capabilities: Array<CapabilityId | Other>;
  other: Partial<Record<OtherField, string>>;
};

export type ConfigIssue = { field: OtherField | "simulation" | "level" | "levelExpectations" | "taskMinutes" | "setupMinutes" | "description" | "outcomes" | "constraints" | "general"; message: string; alternative?: string };
export type Clarification = { id: string; question: string; why: string };
export type Assumption = { id: string; statement: string };

export type ConfigValidation = {
  ok: boolean;
  /** Blocking problems: missing or invalid fields, unsupported choices. */
  errors: ConfigIssue[];
  /** Things the description says that conflict with the selections. Blocking until resolved. */
  conflicts: ConfigIssue[];
  /** Essential information to answer before generating. */
  clarifications: Clarification[];
  /** Reasonable defaults and "Other" interpretations to confirm rather than silently apply. */
  assumptions: Assumption[];
  environment: EnvironmentId | null;
  summary: Array<{ label: string; value: string }>;
  /** Present only when there are no errors or conflicts. */
  resolved: AuthoringConfig | null;
};

const DESCRIPTION_MIN = 80;
const DESCRIPTION_MAX = 6000;
const OTHER_MAX = 200;

function cleanList(v: unknown, max = 10, len = 300): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter((x) => x.length > 0).map((x) => x.slice(0, len)).slice(0, max)
    : [];
}

function pick<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9#+.]+/g, " ").trim();
}

function matches(text: string, label: string, aliases: string[] = []): boolean {
  const t = ` ${norm(text)} `;
  return [label, ...aliases].some((a) => t.includes(` ${norm(a)} `));
}

export const DEFAULT_INPUT: AuthoringInput = {
  simulation: null,
  family: "backend_api_engineer",
  specialization: "general",
  level: "mid",
  levelExpectations: LEVEL_SCOPE.mid.expectation,
  language: "python",
  framework: "none",
  database: "none",
  technologies: [],
  taskType: "debugging",
  capabilities: ["correctness", "reliability"],
  taskMinutes: 60,
  setupMinutes: DURATION_LIMITS.defaultSetup,
  aiPolicy: "assistants_disclosed",
  startingMaterial: "generated",
  description: "",
  outcomes: [],
  constraints: [],
  outOfScope: [],
  background: "",
  confirmedAssumptions: [],
  answers: {},
  other: {},
};

const TEXT_FIELD_MAX = { jobTitle: 120, businessContext: 1500, secondaryCapability: 200 } as const;

function parseSimulation(raw: unknown, invalid: ConfigIssue[]): SimulationIntent | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object") {
    invalid.push({ field: "simulation", message: "The simulation selection could not be read." });
    return null;
  }
  const s = raw as Record<string, unknown>;
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
  if (!isTrackId(s.track)) {
    invalid.push({ field: "simulation", message: "Choose a primary track." });
    return null;
  }
  const taskFamily = typeof s.taskFamily === "string" ? s.taskFamily : "";
  const exemplarKey = typeof s.exemplarKey === "string" && /^[a-z0-9-]{2,60}$/.test(s.exemplarKey) ? s.exemplarKey : "";
  if (!taskFamilyOf(s.track, taskFamily)) invalid.push({ field: "simulation", message: "Choose a task family for this track." });
  if (!exemplarKey) invalid.push({ field: "simulation", message: "Choose the role-model simulation to start from." });
  return {
    track: s.track,
    taskFamily,
    exemplarKey,
    mode: s.mode === "as_is" ? "as_is" : "adapt",
    jobTitle: text(s.jobTitle, TEXT_FIELD_MAX.jobTitle),
    businessContext: text(s.businessContext, TEXT_FIELD_MAX.businessContext),
    secondaryCapability: text(s.secondaryCapability, TEXT_FIELD_MAX.secondaryCapability),
  };
}

/** Coerces untrusted input into the form shape. Invalid values are reported, never guessed. */
export function parseInput(raw: unknown): { input: AuthoringInput; invalid: ConfigIssue[] } {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const invalid: ConfigIssue[] = [];
  const withOther = <T extends string>(v: unknown, allowed: readonly T[]) => pick<T | Other>(v, [...allowed, OTHER]);

  const family = withOther(o.family, ROLE_FAMILIES);
  if (!family) invalid.push({ field: "family", message: "Choose a role family." });
  const specialization = withOther(o.specialization, SPECIALIZATIONS);
  if (!specialization) invalid.push({ field: "specialization", message: "Choose a specialization." });
  const level = pick(o.level, LEVELS);
  if (!level) invalid.push({ field: "level", message: "Choose an experience level." });
  const language = withOther(o.language, LANGUAGES.map((l) => l.id));
  if (!language) invalid.push({ field: "language", message: "Choose a primary language." });
  const framework = withOther(o.framework, FRAMEWORKS.map((f) => f.id));
  if (!framework) invalid.push({ field: "framework", message: "Choose a framework, or No framework." });
  const database = withOther(o.database, DATABASES.map((d) => d.id)) ?? "none";
  const taskType = withOther(o.taskType, TASK_TYPES.map((t) => t.id));
  if (!taskType) invalid.push({ field: "taskType", message: "Choose a task type." });
  const aiPolicy = withOther(o.aiPolicy, AI_POLICIES.map((p) => p.id));
  if (!aiPolicy) invalid.push({ field: "aiPolicy", message: "Choose an AI policy." });
  const startingMaterial = withOther(o.startingMaterial, STARTING_MATERIALS.map((s) => s.id));
  if (!startingMaterial) invalid.push({ field: "startingMaterial", message: "Choose the starting material." });

  const techIds = [...TECHNOLOGIES.map((t) => t.id), OTHER] as const;
  const capIdsAll = [...CAPABILITIES.map((c) => c.id), OTHER] as const;
  const technologies = [...new Set(cleanList(o.technologies, 12, 40))].filter((t): t is TechnologyId | Other => (techIds as readonly string[]).includes(t));
  const capabilities = [...new Set(cleanList(o.capabilities, 9, 40))].filter((c): c is CapabilityId | Other => (capIdsAll as readonly string[]).includes(c));

  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : typeof v === "string" && /^\d{1,3}$/.test(v) ? Number(v) : NaN);
  const answersRaw = o.answers && typeof o.answers === "object" ? (o.answers as Record<string, unknown>) : {};
  const answers: Record<string, string> = {};
  for (const [k, v] of Object.entries(answersRaw).slice(0, 10)) if (typeof v === "string" && /^[a-z_]{2,40}$/.test(k)) answers[k] = v.trim().slice(0, 600);
  const otherRaw = o.other && typeof o.other === "object" ? (o.other as Record<string, unknown>) : {};
  const other: Partial<Record<OtherField, string>> = {};
  for (const f of OTHER_FIELDS) {
    const v = otherRaw[f];
    if (typeof v === "string" && v.trim()) other[f] = v.trim().replace(/\s+/g, " ").slice(0, OTHER_MAX);
  }

  return {
    input: {
      simulation: parseSimulation(o.simulation, invalid),
      family: family ?? DEFAULT_INPUT.family,
      specialization: specialization ?? "general",
      level: level ?? DEFAULT_INPUT.level,
      levelExpectations: typeof o.levelExpectations === "string" ? o.levelExpectations.trim().slice(0, 600) : "",
      language: language ?? DEFAULT_INPUT.language,
      framework: framework ?? "none",
      database,
      technologies,
      taskType: taskType ?? DEFAULT_INPUT.taskType,
      capabilities,
      taskMinutes: num(o.taskMinutes),
      setupMinutes: num(o.setupMinutes),
      aiPolicy: aiPolicy ?? DEFAULT_INPUT.aiPolicy,
      startingMaterial: startingMaterial ?? DEFAULT_INPUT.startingMaterial,
      description: typeof o.description === "string" ? o.description.trim().slice(0, DESCRIPTION_MAX + 1) : "",
      outcomes: cleanList(o.outcomes),
      constraints: cleanList(o.constraints),
      outOfScope: cleanList(o.outOfScope),
      background: typeof o.background === "string" ? o.background.trim().slice(0, 3000) : "",
      confirmedAssumptions: cleanList(o.confirmedAssumptions, 30, 60),
      answers,
      other,
    },
    invalid,
  };
}

const DESCRIPTION_SIGNALS: Array<{ re: RegExp; field: ConfigIssue["field"]; message: string }> = [
  {
    re: /\b(openai|anthropic|api key|gpt-4|gpt-5|claude|gemini|live model|llm api)\b/i,
    field: "description",
    message: "The description needs a live model or API key. Candidates must not need paid API access: use recorded model outputs as fixtures instead.",
  },
  {
    re: /\b(aws|gcp|azure|kubernetes|k8s|terraform|docker|helm)\b/i,
    field: "description",
    message: "The description needs cloud accounts or container tooling the runner does not provide. Use a contained simulation of the service, such as config files and logs as fixtures.",
  },
  {
    re: /\b(gpu|cuda)\b/i,
    field: "description",
    message: "The description needs hardware the runner does not provide. Use the standard library with small synthetic data.",
  },
];

/** Language names that are also ordinary words; only their unambiguous aliases count as a mention. */
const AMBIGUOUS_LANGUAGE_WORDS = new Set(["Go", "Swift", "Rust", "Ruby", "Dart", "Julia", "R", "C", "Lua", "SQL", "Bash", "Perl", "Zig", "Elixir", "Erlang"]);

const PACKAGE_WORDS = /\b(pip install|npm install|yarn add|pnpm add|requirements\.txt|package\.json dependencies)\b/i;

function resolveSingle<T extends string>(
  value: T | Other,
  text: string | undefined,
  field: OtherField,
  options: Array<Option<T> & { aliases?: string[] }>,
  unsupported: Unsupported<T>[],
  errors: ConfigIssue[],
): T | Other | null {
  if (value !== OTHER) return value;
  if (!text) {
    errors.push({ field, message: "You chose Other. Say what it is." });
    return null;
  }
  const supported = options.find((op) => matches(text, op.label, op.aliases ?? []) || norm(text) === norm(op.id));
  if (supported) return supported.id;
  const blocked = unsupported.find((u) => matches(text, u.label, u.aliases ?? []));
  if (blocked) {
    const alt = options.find((op) => op.id === blocked.alternative);
    errors.push({ field, message: `${blocked.label}: ${blocked.reason}${alt ? ` Closest supported option: ${alt.label}.` : ""}`, alternative: blocked.alternative });
    return null;
  }
  return OTHER;
}

function closestTaskType(text: string): TaskTypeId {
  const t = text.toLowerCase();
  if (/\b(bug|fix|debug|incident|outage|regression|broken|flaky|investigat)/.test(t)) return "debugging";
  if (/\b(refactor|clean|restructur|migrat|extract|simplif|modulari)/.test(t)) return "refactoring";
  if (/\b(eval|llm|prompt|model|rag|retriev|benchmark|grad)/.test(t)) return "ai_evaluation";
  return "feature";
}

/**
 * `exemplars` is the server's list of validated role models. When given,
 * a simulation's track, task family and language must match one of them;
 * the creator never accepts a combination nothing validated backs.
 */
export function validateConfig(input: AuthoringInput, invalid: ConfigIssue[] = [], exemplars?: ExemplarOption[]): ConfigValidation {
  const errors: ConfigIssue[] = [...invalid];
  const conflicts: ConfigIssue[] = [];
  const clarifications: Clarification[] = [];
  const assumptions: Assumption[] = [];
  const custom: Customizations = { extraTechnologies: [], customCapabilities: [] };
  const other = input.other;

  let family: RoleFamily = "software_engineer";
  if (input.family === OTHER) {
    if (!other.family) errors.push({ field: "family", message: "You chose Other. Name the role." });
    else {
      custom.familyLabel = other.family;
      const t = other.family.toLowerCase();
      family = /\b(ai|ml|machine learning|llm|data scien)/.test(t) ? "applied_ai_engineer" : /\b(backend|api|server|platform|infra|sre|devops|data engineer)/.test(t) ? "backend_api_engineer" : "software_engineer";
      assumptions.push({ id: "family_other", statement: `"${other.family}" is treated as part of the ${FAMILY_LABEL[family]} family for task design.` });
    }
  } else family = input.family;

  let specialization: Specialization = "general";
  if (input.specialization === OTHER) {
    if (!other.specialization) errors.push({ field: "specialization", message: "You chose Other. Name the specialization." });
    else custom.specializationLabel = other.specialization;
  } else specialization = input.specialization;

  const simulation = input.simulation;
  if (simulation) {
    ({ family, specialization } = legacyFromTrack(simulation.track));
    delete custom.familyLabel;
    delete custom.specializationLabel;
    if (simulation.jobTitle.length < 2) errors.push({ field: "simulation", message: "Add the job title you are hiring for." });
    if (exemplars) {
      const chosen = exemplars.find((e) => e.key === simulation.exemplarKey);
      if (!chosen) errors.push({ field: "simulation", message: "That role-model simulation is not validated right now. Choose another one." });
      else if (chosen.track !== simulation.track || chosen.taskFamily !== simulation.taskFamily) {
        errors.push({ field: "simulation", message: "The role-model simulation does not belong to the chosen track and task family." });
      } else if (input.language !== OTHER && input.language !== chosen.language && simulation.mode === "as_is") {
        errors.push({ field: "language", message: "Running a role model as is keeps its language. Choose Adapt to generate it in another validated language." });
      } else if (input.language !== OTHER && !exemplars.some((e) => e.track === simulation.track && e.taskFamily === simulation.taskFamily && e.language === input.language)) {
        errors.push({ field: "language", message: `No validated ${TRACK_LABEL[simulation.track]} simulation of this task family runs in that language yet. Choose a language a role model uses.` });
      }
    }
    if (simulation.mode === "adapt" && input.startingMaterial !== "uploaded" && simulation.businessContext.length < 20) {
      errors.push({ field: "simulation", message: "Describe your business context in a sentence or two so the simulation can be adapted to it." });
    }
  }

  const langResolved = resolveSingle(input.language, other.language, "language", LANGUAGES, UNSUPPORTED_LANGUAGES, errors);
  if (langResolved === OTHER) {
    errors.push({
      field: "language",
      message: `The runner cannot execute ${other.language} yet. Supported today: ${LANGUAGES.map((l) => l.label).join(", ")}. Choose the closest one; you can mention ${other.language} in the background.`,
    });
  }
  const language: LanguageId | null = langResolved && langResolved !== OTHER ? langResolved : null;
  const lang = LANGUAGES.find((l) => l.id === language);
  const environment = lang?.environment ?? null;

  let framework: FrameworkId = "none";
  const fwResolved = resolveSingle(input.framework, other.framework, "framework", FRAMEWORKS, UNSUPPORTED_FRAMEWORKS, errors);
  if (fwResolved === OTHER) {
    custom.frameworkStyle = other.framework;
    assumptions.push({ id: "framework_other", statement: `The starter mirrors the structure of ${other.framework} using only the standard library; ${other.framework} itself is not installed.` });
  } else if (fwResolved) framework = fwResolved;
  const fw = FRAMEWORKS.find((f) => f.id === framework);
  if (fw && lang && !fw.languages.includes(lang.id)) {
    errors.push({ field: "framework", message: `${fw.label} does not run with ${lang.label}.`, alternative: "none" });
  }

  let database: DatabaseId = "none";
  const dbResolved = resolveSingle(input.database, other.database, "database", DATABASES, UNSUPPORTED_DATABASES, errors);
  if (dbResolved === OTHER) {
    custom.databaseStyle = other.database;
    database = "in-memory";
    assumptions.push({ id: "database_other", statement: `${other.database} is modeled as an in-memory store with the same access pattern; no database server runs.` });
  } else if (dbResolved) database = dbResolved;
  const db = DATABASES.find((d) => d.id === database);
  if (db && lang && !db.languages.includes(lang.id)) {
    const alt = DATABASES.find((d) => d.id !== "none" && d.id !== database && d.languages.includes(lang.id));
    errors.push({ field: "database", message: `${db.label} is not available with ${lang.label}.`, alternative: alt?.id ?? "none" });
  }

  const technologies: TechnologyId[] = [];
  for (const t of input.technologies) {
    if (t === OTHER) continue;
    const tech = TECHNOLOGIES.find((x) => x.id === t);
    if (tech && lang && !tech.languages.includes(lang.id)) errors.push({ field: "technologies", message: `${tech.label} is not available with ${lang.label}. Remove it.` });
    else technologies.push(t);
  }
  if (input.technologies.includes(OTHER)) {
    const items = (other.technologies ?? "").split(/[,;\n]/).map((s) => s.trim()).filter((s) => s.length > 1).slice(0, 6);
    if (items.length === 0) errors.push({ field: "technologies", message: "You chose Other. List the technologies, separated by commas." });
    for (const item of items) {
      const blockedFw = UNSUPPORTED_FRAMEWORKS.find((u) => matches(item, u.label, u.aliases ?? []));
      const blockedDb = UNSUPPORTED_DATABASES.find((u) => matches(item, u.label, u.aliases ?? []));
      const blockedLang = UNSUPPORTED_LANGUAGES.find((u) => matches(item, u.label, u.aliases ?? []));
      const known = TECHNOLOGIES.find((x) => matches(item, x.label) || norm(item) === norm(x.id));
      if (known && (!lang || known.languages.includes(lang.id))) {
        if (!technologies.includes(known.id)) technologies.push(known.id);
      } else if (blockedFw || blockedDb || blockedLang) {
        const b = (blockedFw ?? blockedDb ?? blockedLang)!;
        conflicts.push({ field: "technologies", message: `${item}: ${b.reason} Remove it or describe the concept instead.` });
      } else custom.extraTechnologies.push(item);
    }
    if (custom.extraTechnologies.length) {
      assumptions.push({ id: "technologies_other", statement: `${custom.extraTechnologies.join(", ")} will appear as concepts implemented with the standard library, not as installed packages.` });
    }
  }

  let taskType: TaskTypeId = "feature";
  if (input.taskType === OTHER) {
    if (!other.taskType) errors.push({ field: "taskType", message: "You chose Other. Describe the kind of task." });
    else {
      taskType = closestTaskType(other.taskType);
      custom.taskTypeNote = other.taskType;
      assumptions.push({ id: "task_type_other", statement: `"${other.taskType}" is built as a ${TASK_TYPES.find((t) => t.id === taskType)?.label.toLowerCase()} task so it can be checked by tests.` });
    }
  } else taskType = input.taskType;
  const task = TASK_TYPES.find((t) => t.id === taskType);
  if (task && !task.supported) errors.push({ field: "taskType", message: task.reason ?? "This task type is not available.", alternative: task.alternative });

  let aiPolicy: AiPolicyId = "assistants_disclosed";
  if (input.aiPolicy === OTHER) {
    if (!other.aiPolicy || other.aiPolicy.length < 15) errors.push({ field: "aiPolicy", message: "You chose Other. Write the AI policy as candidates should read it (at least a sentence)." });
    else {
      aiPolicy = "custom";
      custom.aiPolicyText = other.aiPolicy;
    }
  } else aiPolicy = input.aiPolicy;

  let startingMaterial: StartingMaterialId = "generated";
  if (input.startingMaterial === OTHER) {
    if (!other.startingMaterial) errors.push({ field: "startingMaterial", message: "You chose Other. Describe the starting material." });
    else {
      const t = other.startingMaterial.toLowerCase();
      if (/\b(github|gitlab|bitbucket|repo|repository)\b/.test(t)) {
        errors.push({ field: "startingMaterial", message: STARTING_MATERIALS.find((m) => m.id === "repository")!.reason!, alternative: "uploaded" });
      } else {
        startingMaterial = "uploaded";
        assumptions.push({ id: "starting_other", statement: `"${other.startingMaterial}" is provided by uploading files into the draft, then checked by the runner.` });
      }
    }
  } else startingMaterial = input.startingMaterial;
  const material = STARTING_MATERIALS.find((m) => m.id === startingMaterial);
  if (material && !material.supported) errors.push({ field: "startingMaterial", message: material.reason ?? "Not available.", alternative: material.alternative });
  if (simulation) startingMaterial = simulation.mode === "as_is" ? "reviewed_template" : startingMaterial === "uploaded" ? "uploaded" : "generated";
  else if (startingMaterial === "reviewed_template") {
    errors.push({ field: "startingMaterial", message: "Choose a primary track and a role-model simulation to use a reviewed scenario.", alternative: "generated" });
  }

  const capabilities = input.capabilities.filter((c): c is CapabilityId => c !== OTHER);
  if (input.capabilities.includes(OTHER)) {
    const items = (other.capabilities ?? "").split(/[,;\n]/).map((s) => s.trim()).filter((s) => s.length > 2).slice(0, 3);
    if (items.length === 0) errors.push({ field: "capabilities", message: "You chose Other. Name the capability, separated by commas for more than one." });
    for (const item of items) {
      const known = CAPABILITIES.find((c) => matches(item, c.label));
      if (known && !capabilities.includes(known.id)) capabilities.push(known.id);
      else if (!known) custom.customCapabilities.push(item);
    }
    if (custom.customCapabilities.length) {
      assumptions.push({ id: "capabilities_other", statement: `${custom.customCapabilities.join(", ")} will be judged by a reviewer from the submission and handoff; tests do not score ${custom.customCapabilities.length === 1 ? "it" : "them"}.` });
    }
  }
  if (capabilities.length + custom.customCapabilities.length === 0) errors.push({ field: "capabilities", message: "Choose at least one capability to assess." });
  else if (!capabilities.some((c) => CAPABILITIES.find((x) => x.id === c)?.executable)) {
    errors.push({
      field: "capabilities",
      message: "Choose at least one capability that tests can check (correctness, reliability, security or performance). Reviewer-judged capabilities alone cannot be validated.",
    });
  }

  if (!Number.isFinite(input.taskMinutes) || input.taskMinutes < DURATION_LIMITS.minTask || input.taskMinutes > DURATION_LIMITS.maxTask) {
    errors.push({ field: "taskMinutes", message: `Task time must be between ${DURATION_LIMITS.minTask} and ${DURATION_LIMITS.maxTask} minutes.` });
  }
  if (!Number.isFinite(input.setupMinutes) || input.setupMinutes < DURATION_LIMITS.minSetup || input.setupMinutes > DURATION_LIMITS.maxSetup) {
    errors.push({ field: "setupMinutes", message: `Setup time must be between ${DURATION_LIMITS.minSetup} and ${DURATION_LIMITS.maxSetup} minutes. It is not counted in task time.` });
  }
  // With a role model the scenario is defined by it; the description only adds emphasis.
  if (simulation) {
    if (input.description.length > DESCRIPTION_MAX) errors.push({ field: "description", message: `Keep the description under ${DESCRIPTION_MAX.toLocaleString("en-US")} characters.` });
  } else if (input.description.length < DESCRIPTION_MIN) {
    errors.push({ field: "description", message: `Describe the work in at least ${DESCRIPTION_MIN} characters: the problem, what success looks like, and constraints.` });
  } else if (input.description.length > DESCRIPTION_MAX) {
    errors.push({ field: "description", message: `Keep the description under ${DESCRIPTION_MAX.toLocaleString("en-US")} characters.` });
  }

  const text = [input.description, input.background, ...input.outcomes, ...input.constraints].join("\n");
  for (const s of DESCRIPTION_SIGNALS) if (s.re.test(text)) conflicts.push({ field: s.field, message: s.message });
  if (PACKAGE_WORDS.test(text)) conflicts.push({ field: "description", message: "The description asks for package installation. Tasks run without network access; use the standard library." });
  for (const u of UNSUPPORTED_FRAMEWORKS) {
    if (matches(text, u.label, u.aliases ?? []) && fwResolved !== OTHER) {
      const alt = FRAMEWORKS.find((f) => f.id === u.alternative);
      conflicts.push({ field: "framework", message: `The description mentions ${u.label}. ${u.reason} Describe the behavior instead${alt ? `, or choose ${alt.label}` : ""}.` });
      break;
    }
  }
  for (const u of UNSUPPORTED_DATABASES) {
    if (matches(text, u.label, u.aliases ?? []) && dbResolved !== OTHER) {
      const alt = DATABASES.find((d) => d.id === u.alternative);
      conflicts.push({ field: "database", message: `The description mentions ${u.label}. ${u.reason}${alt ? ` Choose ${alt.label} instead.` : ""}` });
      break;
    }
  }
  if (lang) {
    // JavaScript and TypeScript share a runtime, so mentioning one while using the other is fine.
    const sameRuntime = (l: LanguageId) => l === lang.id || (lang.id !== "python" && l !== "python");
    const candidates = [
      ...LANGUAGES.filter((l) => !sameRuntime(l.id)).map((l) => ({ label: l.label, terms: [l.label, ...l.aliases.filter((a) => a.length > 4)], supported: true })),
      ...UNSUPPORTED_LANGUAGES.map((u) => ({
        label: u.label,
        terms: AMBIGUOUS_LANGUAGE_WORDS.has(u.label) ? (u.aliases ?? []).filter((a) => a.length > 3) : [u.label, ...(u.aliases ?? [])],
        supported: false,
      })),
    ];
    const mentioned = candidates.find((l) => l.terms.length > 0 && matches(text, l.terms[0], l.terms.slice(1)));
    if (mentioned) {
      conflicts.push({
        field: "language",
        message: `The description mentions ${mentioned.label} but the primary language is ${lang.label}. ${mentioned.supported ? `Change the primary language, or remove the mention.` : `${mentioned.label} is not supported yet; describe the behavior in ${lang.label} terms.`}`,
      });
    }
  }
  if (taskType === "ai_evaluation" && family !== "applied_ai_engineer") {
    conflicts.push({ field: "taskType", message: "AI evaluation tasks fit the Applied AI Engineer family. Change the family, or pick another task type." });
  }
  if (input.level === "junior" && input.taskMinutes > 90) {
    conflicts.push({ field: "taskMinutes", message: "Junior tasks over 90 minutes tend to test stamina, not skill. Shorten the task or narrow the scope." });
  }
  const outcomeCount = input.outcomes.length + (input.description.match(/\b(should|must|needs? to)\b/gi)?.length ?? 0);
  if (input.taskMinutes <= 45 && outcomeCount > 6) {
    conflicts.push({ field: "taskMinutes", message: `The description lists about ${outcomeCount} required outcomes for ${input.taskMinutes} minutes. Move some to out of scope or extend the time.` });
  }
  if (/\b(frontend|ui|css|browser|component)\b/i.test(input.description) && specialization !== "frontend") {
    assumptions.push({ id: "frontend_logic_only", statement: "The task covers frontend logic (state, data handling) in plain modules; there is no browser rendering." });
  }

  // A role model already defines the symptom and expected behavior; these two questions are for free-form drafts.
  if (!simulation && input.outcomes.length === 0 && !/\b(should|must|so that|success|expected)\b/i.test(input.description)) {
    clarifications.push({ id: "success", question: "What should a successful result do?", why: "Acceptance criteria and tests are built from the expected behavior. Without it the generator would invent requirements." });
  }
  if (!simulation && taskType === "debugging" && !/\b(bugs?|defects?|fail(s|s|ed|ing|ure)?|errors?|wrong|twice|duplicat\w*|crash\w*|regress\w*|incorrect\w*|instead of|leak\w*|races?|drop(s|ped|ping)?|missing|miss(es|ed)?|stale|los(es|t|ing)|skip(s|ped|ping)?|hang(s|ing)?|timeouts?|times out|broken|breaks?|flaky|inconsistent|corrupt\w*|overwrit\w*|never|not (saved|sent|called|updated|returned))\b/i.test(input.description)) {
    clarifications.push({ id: "symptom", question: "What does the defect look like from the outside?", why: "A debugging task needs a reproducible symptom so the baseline check can show the issue before the fix." });
  }
  if (capabilities.includes("security") && !/\b(auth|permission|role|tenant|validat|injection|secret|token|access|sanitiz|signature)\b/i.test(text)) {
    clarifications.push({ id: "security_boundary", question: "Which security boundary should the task exercise?", why: "Security is selected but the description names no boundary to check, such as authorization or input validation." });
  }
  if (capabilities.includes("performance") && !/\b(\d+\s*(ms|calls|queries|items|requests|operations)|o\(|complexity|bound|limit|at most)\b/i.test(text)) {
    clarifications.push({ id: "performance_bound", question: "What measurable bound defines good performance here?", why: "Tests can count calls or operations, but they need a stated bound. Wall-clock timing is not used because it is not repeatable." });
  }
  const unanswered = clarifications.filter((c) => !(input.answers[c.id] && input.answers[c.id].length >= 8));

  if (!simulation && input.constraints.length === 0) assumptions.push({ id: "keep_interface", statement: "Keep the existing public interface of the starter code unchanged." });
  if (!simulation && input.outOfScope.length === 0) assumptions.push({ id: "no_new_infra", statement: "No new services, packages or infrastructure: standard library only." });
  assumptions.push({ id: "synthetic_data", statement: "All data in the task is synthetic. No real customers, credentials or production code." });
  const unconfirmed = assumptions.filter((a) => !input.confirmedAssumptions.includes(a.id));

  const familyLabel = custom.familyLabel ?? FAMILY_LABEL[family];
  const specLabel = custom.specializationLabel ?? (specialization !== "general" ? SPECIALIZATION_LABEL[specialization] : "");
  const summary = [
    ...(simulation
      ? [
          { label: "Job title", value: simulation.jobTitle || "Unset" },
          { label: "Primary track", value: TRACK_LABEL[simulation.track] },
          { label: "Task family", value: taskFamilyOf(simulation.track, simulation.taskFamily)?.label ?? "Unset" },
          { label: "Secondary capability", value: simulation.secondaryCapability || "None" },
          { label: "Business context", value: simulation.businessContext || "Role model's own context" },
          { label: "Simulation", value: simulation.mode === "as_is" ? "Role model as reviewed" : "Adapted from the role model" },
        ]
      : [{ label: "Role", value: `${familyLabel}${specLabel ? `, ${specLabel}` : ""}` }]),
    { label: "Level", value: LEVEL_LABEL[input.level] },
    { label: "Environment", value: environment ? ENVIRONMENTS[environment].label : "Not supported" },
    { label: "Language", value: lang?.label ?? (other.language ? `${other.language} (not supported)` : "Unset") },
    { label: "Framework", value: custom.frameworkStyle ? `${custom.frameworkStyle} style, standard library` : fw?.label ?? "Unset" },
    { label: "Data", value: custom.databaseStyle ? `${custom.databaseStyle}, modeled in memory` : db?.label ?? "None required" },
    { label: "Technologies", value: [...technologies.map((t) => TECHNOLOGIES.find((x) => x.id === t)?.label ?? t), ...custom.extraTechnologies].join(", ") || "None" },
    { label: "Task type", value: custom.taskTypeNote ? `${custom.taskTypeNote} (as ${task?.label.toLowerCase()})` : task?.label ?? "Unset" },
    {
      label: "Capabilities",
      value: [...capabilities.map((c) => CAPABILITIES.find((x) => x.id === c)?.label), ...custom.customCapabilities].filter(Boolean).join(", ") || "None",
    },
    { label: "Time", value: Number.isFinite(input.taskMinutes) ? `${input.taskMinutes} min task, ${Number.isFinite(input.setupMinutes) ? input.setupMinutes : "?"} min setup (not timed)` : "Unset" },
    { label: "AI policy", value: aiPolicy === "custom" ? "Custom policy" : AI_POLICIES.find((p) => p.id === aiPolicy)?.label ?? "Unset" },
    { label: "Starting material", value: STARTING_MATERIALS.find((m) => m.id === startingMaterial)?.label ?? "Unset" },
  ];

  const blocking = errors.length > 0 || conflicts.length > 0 || !language;
  const resolved: AuthoringConfig | null = blocking
    ? null
    : {
        simulation,
        family,
        specialization,
        level: input.level,
        levelExpectations: input.levelExpectations || LEVEL_SCOPE[input.level].expectation,
        language: language!,
        framework,
        database,
        technologies,
        taskType,
        capabilities,
        taskMinutes: input.taskMinutes,
        setupMinutes: input.setupMinutes,
        aiPolicy,
        startingMaterial,
        description: input.description,
        outcomes: input.outcomes,
        constraints: input.constraints,
        outOfScope: input.outOfScope,
        background: input.background,
        confirmedAssumptions: input.confirmedAssumptions,
        answers: input.answers,
        custom,
      };

  return {
    ok: !blocking && unanswered.length === 0 && unconfirmed.length === 0,
    errors,
    conflicts,
    clarifications: unanswered,
    assumptions: unconfirmed,
    environment,
    summary,
    resolved,
  };
}

/** Everything the creator form needs, in one payload. Every list accepts "other" with free text. */
export function registryPayload() {
  return {
    otherValue: OTHER,
    otherFields: OTHER_FIELDS,
    families: ROLE_FAMILIES.map((id) => ({ id, label: FAMILY_LABEL[id], specializations: FAMILY_SPECIALIZATIONS[id] })),
    specializations: SPECIALIZATIONS.map((id) => ({ id, label: SPECIALIZATION_LABEL[id] })),
    levels: LEVELS.map((id) => ({ id, label: LEVEL_LABEL[id], scope: LEVEL_SCOPE[id] })),
    environments: Object.values(ENVIRONMENTS),
    languages: LANGUAGES,
    unsupportedLanguages: UNSUPPORTED_LANGUAGES,
    frameworks: FRAMEWORKS,
    unsupportedFrameworks: UNSUPPORTED_FRAMEWORKS,
    databases: DATABASES,
    unsupportedDatabases: UNSUPPORTED_DATABASES,
    technologies: TECHNOLOGIES,
    taskTypes: TASK_TYPES,
    capabilities: CAPABILITIES,
    aiPolicies: AI_POLICIES,
    startingMaterials: STARTING_MATERIALS,
    durations: { presets: DURATION_PRESETS, limits: DURATION_LIMITS },
    defaults: DEFAULT_INPUT,
  };
}
export type RegistryPayload = ReturnType<typeof registryPayload>;
