import "server-only";
import { z } from "zod";
import { ModelApiError, getProviderConfig, postChatCompletion, type ChatMessage, type ProviderConfig } from "@/lib/ai/provider";
import { FAMILY_LABEL, LEVEL_LABEL, SPECIALIZATION_LABEL } from "../taxonomy";
import { TRACK_LABEL, taskFamilyOf } from "../tracks";
import { buildExemplar, exemplarFor } from "../exemplars/registry";
import {
  AI_POLICIES,
  CAPABILITIES,
  DATABASES,
  ENVIRONMENTS,
  FRAMEWORKS,
  LANGUAGES,
  TASK_TYPES,
  TECHNOLOGIES,
  placeholderTitle,
  type AuthoringConfig,
  type CapabilityId,
} from "./registry";
import {
  initialSections,
  isSafePath,
  type AcceptanceCriterion,
  type Coworker,
  type PackageFile,
  type ProtectedMaterials,
  type RubricCriterion,
  type ScenarioPackage,
  type TestRef,
} from "./package";
import { displayCommand } from "./runner";
import { matchesRef, type CheckResult } from "./checks";

export class GenerationError extends Error {
  constructor(
    public code: "provider_unavailable" | "provider_rate_limited" | "provider_failed" | "invalid_output" | "input_too_large",
    message: string,
    public retryable: boolean,
    public retryAfterMs = 0,
  ) {
    super(message);
  }
}

/** Per-minute token budget of the configured model. Groq's free tier counts input plus max_tokens. */
function tokenBudget(provider: string): number {
  const fromEnv = Number(process.env.FYDELL_AUTHORING_TPM);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return provider === "groq" ? 8000 : 60_000;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.2);
}

const capIds = CAPABILITIES.map((c) => c.id) as [CapabilityId, ...CapabilityId[]];
const fileSchema = z.object({ path: z.string().min(1).max(120), content: z.string().max(64_000) });
/** Files as a `{ path: content }` map (asked for) or an array of `{ path, content }`. */
const filesField = z
  .union([z.record(z.string().min(1).max(120), z.string().max(64_000)), z.array(fileSchema)])
  .transform((v): PackageFile[] => (Array.isArray(v) ? v : Object.entries(v).map(([path, content]) => ({ path, content }))));

/** Models sometimes return a list where prose was asked for; join it rather than reject the draft. */
const text = (min: number, max: number) =>
  z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v.join(" ") : v).trim().slice(0, max))
    .pipe(z.string().min(min));
const list = (maxItems: number, maxLen = 300) =>
  z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]).map((s) => s.trim().slice(0, maxLen)).filter((s) => s.length >= 3).slice(0, maxItems));

const briefSchema = z.object({
  title: text(4, 120),
  summary: text(10, 400),
  context: text(20, 3000),
  task: text(20, 3000),
  outcomes: list(8).refine((v) => v.length >= 1, "at least one outcome"),
  constraints: list(8),
  outOfScope: list(8),
  optionalExtensions: list(4),
  interfaceSpec: text(20, 2000),
  acceptanceCriteria: z.array(z.object({ id: z.string().regex(/^AC-\d{1,2}$/), text: text(5, 400), capability: z.enum(capIds) })).min(1).max(8),
  coworkers: z
    .array(
      z.object({
        name: text(2, 60),
        title: text(2, 80),
        responsibilities: text(5, 400),
        topics: list(6, 80),
        tone: text(0, 120).optional().transform((v) => v ?? ""),
        boundaries: text(5, 400),
        facts: list(6, 400).refine((v) => v.length >= 1, "at least one fact"),
      }),
    )
    .max(2)
    .optional()
    .transform((v) => v ?? []),
});
export type BriefStage = {
  title: string;
  summary: string;
  context: string;
  task: string;
  outcomes: string[];
  constraints: string[];
  outOfScope: string[];
  optionalExtensions: string[];
  interfaceSpec: string;
  acceptanceCriteria: AcceptanceCriterion[];
  coworkers: Array<{ name: string; title: string; responsibilities: string; topics: string[]; tone: string; boundaries: string; facts: string[] }>;
};

const EXECUTABLE = new Set(CAPABILITIES.filter((c) => c.executable).map((c) => c.id));

/** Acceptance criteria must be checkable by tests; reviewer-judged ones become plain outcomes. Ids are renumbered. */
export function normalizeBrief(raw: z.output<typeof briefSchema>): BriefStage {
  const outcomes = [...raw.outcomes];
  const kept: AcceptanceCriterion[] = [];
  for (const ac of raw.acceptanceCriteria) {
    const t = ac.text ?? "";
    if (EXECUTABLE.has(ac.capability)) kept.push({ id: `AC-${kept.length + 1}`, text: t, capability: ac.capability });
    else if (t && !outcomes.includes(t)) outcomes.push(t);
  }
  return {
    title: raw.title ?? "",
    summary: raw.summary ?? "",
    context: raw.context ?? "",
    task: raw.task ?? "",
    outcomes,
    constraints: raw.constraints,
    outOfScope: raw.outOfScope,
    optionalExtensions: raw.optionalExtensions,
    interfaceSpec: raw.interfaceSpec ?? "",
    acceptanceCriteria: kept,
    coworkers: raw.coworkers.map((c) => ({
      name: c.name ?? "",
      title: c.title ?? "",
      responsibilities: c.responsibilities ?? "",
      topics: c.topics,
      tone: c.tone ?? "",
      boundaries: c.boundaries ?? "",
      facts: c.facts,
    })),
  };
}

const normalizeCode = (s: string) => s.replace(/\s+/g, " ").trim();
const codeSchema = z
  .object({
    starterFiles: filesField.refine((f) => f.length >= 1 && f.length <= 12, "1 to 12 starter files"),
    referenceFiles: filesField.refine((f) => f.length >= 1 && f.length <= 12, "1 to 12 reference files"),
    approaches: z.array(z.string().min(5).max(400)).min(1).max(4),
    starterDefect: z.string().min(10).max(400).optional(),
  })
  .refine(
    (c) => c.referenceFiles.some((r) => {
      const s = c.starterFiles.find((f) => f.path === r.path);
      return !s || normalizeCode(s.content) !== normalizeCode(r.content);
    }),
    { message: "referenceFiles are identical to starterFiles, so the starter already solves the task. The starter must contain the problem; only the reference fixes it", path: ["referenceFiles"] },
  );
export type CodeStage = z.infer<typeof codeSchema>;

const refSchema = z.object({ name: z.string().min(1).max(200), criterionIds: z.array(z.string().regex(/^AC-\d{1,2}$/)).min(1).max(8) });
const incorrectSchema = z.object({ description: z.string().min(5).max(300), files: filesField.refine((f) => f.length >= 1 && f.length <= 6, "1 to 6 files") });
const testsRawSchema = z.object({
  publicTests: z.object({ content: z.string().min(20).max(64_000), tests: z.array(refSchema).min(1).max(12) }),
  evaluationTests: z.object({ content: z.string().min(20).max(64_000), tests: z.array(refSchema).min(1).max(20) }),
  incorrectSolutions: z.array(incorrectSchema).min(1).max(3),
});
export type TestsStage = {
  publicTests: { file: PackageFile; tests: Array<{ name: string; criterionIds: string[] }> };
  evaluationTests: { file: PackageFile; tests: Array<{ name: string; criterionIds: string[] }> };
  incorrectSolutions: Array<{ description: string; files: PackageFile[] }>;
};

const repairSchema = z.object({
  starterFiles: filesField.optional(),
  referenceFiles: filesField.optional(),
  publicTestsContent: z.string().max(64_000).optional(),
  evaluationTestsContent: z.string().max(64_000).optional(),
  evaluationTestRefs: z.array(refSchema).max(20).optional(),
  incorrectSolutions: z.array(incorrectSchema).max(3).optional(),
  notes: z.string().max(600).optional(),
});

export function authoringProvider(): (ProviderConfig & { label: string }) | null {
  const base = getProviderConfig();
  if (!base) return null;
  const model = process.env.FYDELL_AUTHORING_MODEL || base.model;
  return { ...base, model, supportsJsonSchema: false, timeoutMs: Math.max(base.timeoutMs, 120_000), label: `${base.provider}:${model}` };
}

function stripFence(s: string): string {
  const t = s.trim();
  const m = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(t);
  return m ? m[1] : t;
}

/**
 * Drops closing brackets outside strings that do not match the open container,
 * e.g. `{"content":"...\n"],"tests":[]}`, or that would close the top-level
 * value before the end of the text. Models emit these after long string values.
 * Nothing else changes; the schema and the execution checks still decide
 * whether the result is usable. Returns null when no bracket was dropped.
 */
export function dropMismatchedClosers(text: string): string | null {
  const stack: string[] = [];
  let out = "";
  let inString = false;
  let escaped = false;
  let dropped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") {
      const mismatched = stack[stack.length - 1] !== (ch === "}" ? "{" : "[");
      const closesRootEarly = stack.length === 1 && text.slice(i + 1).trim() !== "";
      if (mismatched || closesRootEarly) {
        dropped = true;
        continue;
      }
      stack.pop();
    }
    out += ch;
  }
  return dropped ? out : null;
}

function salvage<T>(schema: z.ZodType<T>, error: unknown): T | null {
  if (!(error instanceof ModelApiError) || error.code !== "json_validate_failed") return null;
  const failed = error.failedGeneration();
  const repaired = failed ? dropMismatchedClosers(stripFence(failed)) : null;
  if (!repaired) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(repaired));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function callJson<T>(schema: z.ZodType<T>, system: string, user: string, maxTokens: number): Promise<T> {
  const config = authoringProvider();
  if (!config) throw new GenerationError("provider_unavailable", "No generation model is configured on the server.", false);
  const messages: ChatMessage[] = [
    { role: "system", content: `${system}\n\nRespond with one JSON object only. No prose, no markdown fences.` },
    { role: "user", content: user },
  ];
  const budget = tokenBudget(config.provider);
  const extraBody = config.provider === "groq" && config.model.includes("gpt-oss") ? { reasoning_effort: "low" } : undefined;
  let lastIssue = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const sent = attempt === 0 ? messages : [...messages, { role: "user" as const, content: `Your previous reply was not valid: ${lastIssue}. Return the corrected JSON object only.` }];
    const input = estimateTokens(sent.map((m) => m.content).join("\n")) + 200;
    const allowed = Math.min(maxTokens, budget - input - 300);
    if (allowed < 1500) {
      throw new GenerationError("input_too_large", "The draft is too large for the configured model's token limit. Reduce the starter project size and regenerate.", false);
    }
    let raw: string;
    try {
      raw = await postChatCompletion(config, sent, { schema: {}, schemaName: "authoring", temperature: 0.2, maxTokens: allowed, extraBody });
    } catch (error) {
      const salvaged = salvage(schema, error);
      if (salvaged !== null) return salvaged;
      const msg = error instanceof Error ? error.message : "";
      if (/\b(429|413)\b/.test(msg)) throw new GenerationError("provider_rate_limited", "The generation model's per-minute limit was reached. Generation continues automatically in about a minute.", true, 65_000);
      if (/\b400\b/.test(msg) && attempt === 0) {
        lastIssue = "the output was cut off or was not valid JSON. Keep files shorter and return complete JSON";
        await new Promise((r) => setTimeout(r, 20_000));
        continue;
      }
      throw new GenerationError("provider_failed", `The generation model did not return a usable response (${msg.replace(/Bearer\s+\S+/g, "").slice(0, 80)}). The job will retry.`, true, 30_000);
    }
    try {
      const parsed = schema.safeParse(JSON.parse(stripFence(raw)));
      if (parsed.success) return parsed.data;
      lastIssue = parsed.error.issues.slice(0, 4).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    } catch {
      lastIssue = "the reply was not parseable JSON";
    }
  }
  throw new GenerationError("invalid_output", `The model returned an unusable draft (${lastIssue.slice(0, 200)}).`, true);
}

type Layout = { sourceDir: string; publicTestPath: string; evaluationTestPath: string; ext: string; conventions: string };

export function layoutFor(config: AuthoringConfig): Layout {
  const lang = LANGUAGES.find((l) => l.id === config.language)!;
  if (lang.environment === "python-stdlib") {
    return {
      sourceDir: "app",
      publicTestPath: "tests/test_public.py",
      evaluationTestPath: "tests/test_evaluation.py",
      ext: "py",
      conventions: [
        "Python 3.12 standard library only. No pip packages, no network, no subprocess, no file writes outside a tempfile directory.",
        "Source modules live under app/ (include app/__init__.py). Tests live under tests/ and import from app, e.g. `from app.ledger import Ledger`.",
        "Tests use unittest.TestCase classes. Test names are referred to as `ClassName.test_method`.",
        "Tests run with `python3 -B -m unittest -v tests/test_public.py tests/test_evaluation.py` from the project root.",
        config.database === "sqlite" ? "Use sqlite3 with ':memory:' or a tempfile database created inside each test." : "",
      ].filter(Boolean).join("\n"),
    };
  }
  const ext = lang.extension;
  return {
    sourceDir: "src",
    publicTestPath: `test/public.test.${ext}`,
    evaluationTestPath: `test/evaluation.test.${ext}`,
    ext,
    conventions: [
      `Node.js 22 standard library only, ES modules. No npm packages, no network, no child_process. A package.json with {"type":"module"} is added automatically; do not include one.`,
      `Source files live under src/ with .${ext} extension. Tests live under test/ and import with relative paths including the extension, e.g. \`import { Ledger } from "../src/ledger.${ext}"\`.`,
      ext === "ts" ? "TypeScript must use erasable syntax only: type annotations, interfaces and type aliases. No enums, namespaces, parameter properties or decorators." : "",
      `Tests use \`import test from "node:test"\` and \`import assert from "node:assert/strict"\`. Each test title is unique and is how the test is referred to. Do not nest tests inside describe blocks.`,
    ].filter(Boolean).join("\n"),
  };
}

/**
 * The validated role model the draft adapts. Only the candidate-facing
 * shape and the pattern are sent: never its tests, reference solution or
 * incorrect solutions, so a draft cannot be a lightly renamed copy.
 */
function roleModelGuidance(key: string): string {
  const found = exemplarFor(key);
  const built = found ? buildExemplar(key) : null;
  if (!found || !built) return "";
  const { exemplar } = found;
  const b = built.pkg.brief;
  return [
    "Role model (a validated scenario to learn from, NOT to copy):",
    `Engineering problem: ${exemplar.pattern.problem}`,
    `It produces evidence of: ${exemplar.pattern.assesses.join("; ")}`,
    `Every adaptation must keep:\n- ${exemplar.pattern.invariants.join("\n- ")}`,
    `Vary along:\n- ${exemplar.pattern.variationAxes.join("\n- ")}`,
    `Its brief, for shape and depth only: "${b.title}". ${b.summary}`,
    `Its acceptance criteria, for granularity only:\n- ${built.pkg.acceptanceCriteria.map((a) => a.text).join("\n- ")}`,
    `Its business context was ${exemplar.businessContext}. Write a new scenario of the same engineering problem class set in the employer's business context: new company, domain, entities, data, incident and file names. Do not reuse the role model's company, names, identifiers or wording. Keep a comparable scope, difficulty and number of acceptance criteria.`,
  ].join("\n");
}

function configBrief(config: AuthoringConfig): string {
  const label = <T extends { id: string; label: string }>(list: T[], id: string) => list.find((x) => x.id === id)?.label ?? id;
  const c = config.custom;
  const spec = c.specializationLabel ?? (config.specialization !== "general" ? SPECIALIZATION_LABEL[config.specialization] : "");
  const tech = [...config.technologies.map((t) => label(TECHNOLOGIES, t)), ...c.extraTechnologies];
  const sim = config.simulation;
  return [
    sim
      ? `Hiring for: ${sim.jobTitle}. Primary track: ${TRACK_LABEL[sim.track]}. Task family: ${taskFamilyOf(sim.track, sim.taskFamily)?.label ?? sim.taskFamily}.${sim.secondaryCapability ? ` Secondary capability: ${sim.secondaryCapability}.` : ""}`
      : `Role: ${c.familyLabel ?? FAMILY_LABEL[config.family]}${spec ? `, ${spec}` : ""}`,
    sim?.businessContext ? `Employer's business context:\n${sim.businessContext}` : "",
    sim ? roleModelGuidance(sim.exemplarKey) : "",
    `Level: ${LEVEL_LABEL[config.level]}. Expectations: ${config.levelExpectations || "standard for the level"}`,
    `Language: ${label(LANGUAGES, config.language)}. Framework: ${c.frameworkStyle ? `structure in the style of ${c.frameworkStyle}, implemented with the standard library only` : label(FRAMEWORKS, config.framework)}. Data: ${c.databaseStyle ? `an in-memory store with the access pattern of ${c.databaseStyle}` : label(DATABASES, config.database)}.`,
    tech.length ? `Also uses (standard library only): ${tech.join(", ")}` : "",
    `Task type: ${label(TASK_TYPES, config.taskType)}${c.taskTypeNote ? ` (author described it as: ${c.taskTypeNote})` : ""}. Task time: ${config.taskMinutes} minutes.`,
    `Capabilities to assess: ${[...config.capabilities.map((x) => label(CAPABILITIES, x)), ...c.customCapabilities].join(", ")}`,
    `Author's description of the work:\n${config.description}`,
    config.outcomes.length ? `Required outcomes:\n- ${config.outcomes.join("\n- ")}` : "",
    config.constraints.length ? `Constraints:\n- ${config.constraints.join("\n- ")}` : "",
    config.outOfScope.length ? `Out of scope:\n- ${config.outOfScope.join("\n- ")}` : "",
    config.background ? `Background:\n${config.background}` : "",
    Object.keys(config.answers).length ? `Author's clarifications:\n${Object.entries(config.answers).map(([k, v]) => `- ${k}: ${v}`).join("\n")}` : "",
  ].filter(Boolean).join("\n");
}

const SYSTEM = [
  "You draft realistic, small engineering work samples for hiring. The candidate works in an existing codebase, not a puzzle.",
  "All names, companies and data are synthetic. Never include real people, real companies' private details, credentials, URLs with secrets, or production code.",
  "Seniority is expressed through ambiguity and ownership, not more code or less time.",
  "Every requirement must be stated in the brief. Never test anything the brief does not disclose.",
].join("\n");

const CODE_RULES = [
  "Design rules, all mandatory:",
  "- Follow the interface exactly: same module paths, class and function names, and parameters.",
  "- External effects are injected: network calls, clocks, sleeping and randomness are constructor or function parameters (e.g. `transport`, `sleep`, `now`). Code never calls real sleep, real network, or random without an injected seed.",
  "- No module-level mutable state. State lives in instances or is passed in.",
  "- Every loop has a bound. No code path can run forever, including the defect in the starter: a defect makes tests fail quickly, never hang.",
  "- Tests use small hand-written fakes for injected dependencies (a fake transport that records calls, a sleep that records delays). Do not use unittest.mock.patch or monkeypatching of module internals.",
  "- Every test runs in well under one second.",
].join("\n");

export async function generateBrief(config: AuthoringConfig): Promise<BriefStage> {
  const user = [
    configBrief(config),
    "",
    "Write the candidate-facing brief and acceptance criteria. Use AC-1, AC-2, ... ids. Each acceptance criterion is observable behavior of the code that an automated test can check, and names one capability from:",
    [...EXECUTABLE].join(", "),
    "Prefer capabilities the author selected. Reviewer-judged qualities (tests the candidate writes, maintainability, judgment, communication) belong in outcomes, not acceptance criteria.",
    `Keep the scope finishable in ${config.taskMinutes} minutes by a ${LEVEL_LABEL[config.level].toLowerCase()} engineer.`,
    "Optionally add up to two coworkers the candidate can message, each with facts they share only when asked (facts must be consistent with the brief and never reveal the solution) and boundaries on what they will not decide.",
    `interfaceSpec: the exact public interface the starter exposes and the tests use: file paths under ${layoutFor(config).sourceDir}/, class and function signatures, and which dependencies are injected (transport, sleep, clock). Plain text, one item per line.`,
    CODE_RULES,
    "JSON shape: {title, summary, context, task, outcomes[], constraints[], outOfScope[], optionalExtensions[], interfaceSpec, acceptanceCriteria[{id,text,capability}], coworkers[{name,title,responsibilities,topics[],tone,boundaries,facts[]}]}",
  ].join("\n");
  const brief = normalizeBrief(await callJson(briefSchema, SYSTEM, user, 3000));
  if (brief.acceptanceCriteria.length === 0) {
    throw new GenerationError("invalid_output", "The draft had no acceptance criteria that tests can check.", true, 20_000);
  }
  return brief;
}

export async function generateCode(config: AuthoringConfig, brief: BriefStage): Promise<CodeStage> {
  const layout = layoutFor(config);
  const user = [
    configBrief(config),
    "",
    `Brief title: ${brief.title}\nTask: ${brief.task}\nAcceptance criteria:\n${brief.acceptanceCriteria.map((a) => `${a.id}: ${a.text}`).join("\n")}`,
    `Interface:\n${brief.interfaceSpec}`,
    "",
    "Write the starter project and a reference solution.",
    layout.conventions,
    CODE_RULES,
    `The starter is a small but realistic module (2 to 4 source files, under 250 lines total) under ${layout.sourceDir}/ where the acceptance criteria are NOT yet met${config.taskType === "debugging" ? ": it contains the defect described" : config.taskType === "refactoring" ? ": the structure is what the brief asks to change, while current behavior is correct" : ": the behavior is missing or incomplete"}.`,
    "Do not include tests in starterFiles. Do not leave comments that point to the bug or the answer.",
    "referenceFiles contains only the files that change in a correct solution, each with its complete new content.",
    "approaches lists valid ways to solve it (more than one when possible), for reviewers only.",
    "starterDefect names, for reviewers only, the exact code in the starter that differs from the reference and which acceptance criterion it breaks. Write the starter and reference so that this difference really exists.",
    `JSON shape: {"starterFiles": {"<path>": "<full file content>", ...}, "referenceFiles": {"<path>": "<full file content>"}, "approaches": ["..."], "starterDefect": "..."}`,
  ].join("\n");
  const out = await callJson(codeSchema, SYSTEM, user, 6000);
  return {
    starterFiles: stripHintComments(sanitizeFiles(out.starterFiles, config)),
    referenceFiles: sanitizeFiles(out.referenceFiles, config),
    approaches: out.starterDefect ? [...out.approaches, `Starter defect: ${out.starterDefect}`] : out.approaches,
  };
}

export async function generateTests(config: AuthoringConfig, brief: BriefStage, code: CodeStage): Promise<TestsStage> {
  const layout = layoutFor(config);
  const user = [
    `Acceptance criteria:\n${brief.acceptanceCriteria.map((a) => `${a.id}: ${a.text}`).join("\n")}`,
    `Interface:\n${brief.interfaceSpec}`,
    "",
    "Starter files:",
    ...code.starterFiles.map((f) => `--- ${f.path}\n${f.content}`),
    "",
    "Reference solution (changed files):",
    ...code.referenceFiles.map((f) => `--- ${f.path}\n${f.content}`),
    "",
    layout.conventions,
    CODE_RULES,
    `Write two test files. publicTests (${layout.publicTestPath}) is given to the candidate: 2 to 4 tests covering the main behavior. evaluationTests (${layout.evaluationTestPath}) is hidden: tests that check every acceptance criterion more thoroughly, including edge cases the brief states. Every criterion id (${brief.acceptanceCriteria.map((a) => a.id).join(", ")}) must appear in the criterionIds of at least one evaluation test.`,
    "Every test must pass against the reference solution and be deterministic: no sleeps, wall-clock timing, randomness without a fixed seed, or network. At least one test per acceptance criterion must fail against the starter.",
    "List each test with the acceptance criteria it checks. Python names are ClassName.test_method; Node names are the exact test titles.",
    "Write 2 plausible incorrect solutions a candidate might submit (partial fixes, off-by-one, missing edge case), each as changed files with complete content. Each must fail at least one test.",
    `JSON shape: {"publicTests": {"content": "<full test file>", "tests": [{"name": "...", "criterionIds": ["AC-1"]}]}, "evaluationTests": {"content": "<full test file>", "tests": [...]}, "incorrectSolutions": [{"description": "...", "files": {"<path>": "<full file content>"}}]}`,
  ].join("\n");
  const out = await callJson(testsRawSchema, SYSTEM, user, 7000);
  return {
    publicTests: { file: { path: layout.publicTestPath, content: out.publicTests.content }, tests: out.publicTests.tests },
    evaluationTests: { file: { path: layout.evaluationTestPath, content: out.evaluationTests.content }, tests: out.evaluationTests.tests },
    incorrectSolutions: out.incorrectSolutions.map((s) => ({ ...s, files: sanitizeFiles(s.files, config) })),
  };
}

function mergeFiles(base: PackageFile[], changed: PackageFile[]): PackageFile[] {
  const map = new Map(base.map((f) => [f.path, f.content]));
  for (const f of changed) map.set(f.path, f.content);
  return [...map.entries()].map(([path, content]) => ({ path, content }));
}

const HINT_COMMENT = /^\s*(#|\/\/)\s*.*\b(bug|buggy|incorrect|wrong|defect|broken|fixme|todo|hint|should be|off[-\u2010-\u2011 ]?by[-\u2010-\u2011 ]?one|intentional(ly)?)\b.*$/i;

/** Removes whole-line comments in starter code that point at the defect or the answer. */
export function stripHintComments(files: PackageFile[]): PackageFile[] {
  return files.map((f) => (/\.(py|js|mjs|ts)$/.test(f.path) ? { ...f, content: f.content.split("\n").filter((line) => !HINT_COMMENT.test(line)).join("\n") } : f));
}

function sanitizeFiles(files: PackageFile[], config: AuthoringConfig): PackageFile[] {
  const layout = layoutFor(config);
  return files
    .map((f) => ({ path: f.path.replace(/^\.?\/+/, "").replace(/\\/g, "/"), content: f.content }))
    .filter((f) => isSafePath(f.path) && f.path !== "package.json" && !(layout.ext !== "py" && f.path.endsWith("/package.json")));
}

/**
 * Drops listed tests the runner never discovered (the model named a test that
 * does not exist). Never invents mappings for unlisted tests; those stay
 * flagged by the discovery check for repair or the author.
 */
export function reconcileRefs(tests: TestsStage, discovered: Array<{ name: string }>): { tests: TestsStage; dropped: string[] } {
  if (discovered.length === 0) return { tests, dropped: [] };
  const dropped: string[] = [];
  const keep = (refs: TestsStage["publicTests"]["tests"]) =>
    refs.filter((r) => {
      const found = discovered.some((d) => matchesRef(d.name, r.name));
      if (!found) dropped.push(r.name);
      return found;
    });
  return {
    tests: { ...tests, publicTests: { ...tests.publicTests, tests: keep(tests.publicTests.tests) }, evaluationTests: { ...tests.evaluationTests, tests: keep(tests.evaluationTests.tests) } },
    dropped,
  };
}

/** Keeps result lines and the last frame of each traceback; drops repeated stack noise. */
function conciseOutput(output: string): string {
  const lines = output.split(/\r?\n/);
  const keep = lines.filter((l) => / \.\.\. (ok|FAIL|ERROR)|^(FAIL|ERROR):|Error:|Error\b.*:|^\s*(not ok|ok) \d|assert|expected|actual|^\s+File ".*(app|src|tests?)\//i.test(l));
  return keep.join("\n").slice(0, 1800);
}

/** Names the failing execution checks and asks for targeted replacements. */
export async function repairDraft(config: AuthoringConfig, brief: BriefStage, code: CodeStage, tests: TestsStage, failures: CheckResult[]): Promise<{ code: CodeStage; tests: TestsStage; notes: string }> {
  const layout = layoutFor(config);
  const report = failures
    .map((c) => `CHECK ${c.label}: ${c.issues.slice(0, 5).join(" | ")}\n${c.evidence.slice(0, 1).map((e) => `$ ${e.command}\n${conciseOutput(e.output)}`).join("\n")}`)
    .join("\n\n");
  const user = [
    `Acceptance criteria:\n${brief.acceptanceCriteria.map((a) => `${a.id}: ${a.text}`).join("\n")}`,
    `Interface:\n${brief.interfaceSpec}`,
    CODE_RULES,
    "Starter files:",
    ...code.starterFiles.map((f) => `--- ${f.path}\n${f.content}`),
    "Reference solution (changed files):",
    ...code.referenceFiles.map((f) => `--- ${f.path}\n${f.content}`),
    `--- ${tests.publicTests.file.path}\n${tests.publicTests.file.content}`,
    `--- ${tests.evaluationTests.file.path}\n${tests.evaluationTests.file.content}`,
    "Incorrect solutions:",
    ...tests.incorrectSolutions.map((s, i) => `#${i + 1} ${s.description}\n${s.files.map((f) => `--- ${f.path}\n${f.content}`).join("\n")}`),
    "",
    "These checks failed when the files were actually executed:",
    report,
    "",
    ...(failures.some((c) => c.id === "baseline" && c.issues.some((i) => i.startsWith("These tests pass")))
      ? ["The starter's current code is correct for every test input. Before answering, trace one evaluation test's input through your new starter line by line and confirm it produces a different result from the expected value, while the reference produces the expected value."]
      : []),
    layout.conventions,
    failures.some((c) => c.id === "setup" || c.id === "baseline")
      ? "The starter must keep the problem the candidate is asked to solve: never fix the defect or add the missing behavior in starterFiles. Change starterFiles only to remove hangs or load errors, or, when the baseline check says no test fails on the starter, to put the described problem back into the starter so the evaluation tests fail on it while the reference still passes."
      : "The starter already shows the problem correctly. Do not return starterFiles; any starter change will be discarded.",
    failures.some((c) => c.id === "incorrect")
      ? "When an incorrect solution passes every test, either add an evaluation test that catches that mistake (it must pass on the reference), or replace that incorrect solution with a realistic mistake that the tests do catch. Never weaken existing tests."
      : "",
    `Current evaluation test mapping:\n${tests.evaluationTests.tests.map((t) => `${t.name} -> ${t.criterionIds.join(", ")}`).join("\n")}`,
    "Fix the cause with the smallest change. Return only what changes: starterFiles and referenceFiles contain only the files you modify, each with complete content; publicTestsContent and evaluationTestsContent only if that test file changes; incorrectSolutions only if they change (then the full list). Keep test names unchanged unless a test is wrong; tests must still only check the acceptance criteria.",
    "If an acceptance criterion has no test, add a fast evaluation test for it that fails on the starter and passes on the reference, and return evaluationTestRefs: the full updated list of evaluation tests with the criteria each one checks, using the exact names the test runner reports.",
    `JSON shape: {"starterFiles"?: {"<path>": "<content>"}, "referenceFiles"?: {"<path>": "<content>"}, "publicTestsContent"?: "<full file>", "evaluationTestsContent"?: "<full file>", "evaluationTestRefs"?: [{"name": "...", "criterionIds": ["AC-1"]}], "incorrectSolutions"?: [{"description": "...", "files": {"<path>": "<content>"}}], "notes": "what you changed"}`,
  ].join("\n");
  const out = await callJson(repairSchema, SYSTEM, user, 7000);
  const starterMayChange = failures.some((c) => c.id === "setup" || c.id === "baseline");
  return {
    code: {
      starterFiles: starterMayChange ? mergeFiles(code.starterFiles, stripHintComments(sanitizeFiles(out.starterFiles ?? [], config))) : code.starterFiles,
      referenceFiles: mergeFiles(code.referenceFiles, sanitizeFiles(out.referenceFiles ?? [], config)),
      approaches: code.approaches,
    },
    tests: {
      publicTests: out.publicTestsContent ? { ...tests.publicTests, file: { path: tests.publicTests.file.path, content: out.publicTestsContent } } : tests.publicTests,
      evaluationTests: {
        file: out.evaluationTestsContent ? { path: tests.evaluationTests.file.path, content: out.evaluationTestsContent } : tests.evaluationTests.file,
        tests: out.evaluationTestRefs?.length ? out.evaluationTestRefs : tests.evaluationTests.tests,
      },
      incorrectSolutions: out.incorrectSolutions?.length ? out.incorrectSolutions.map((s) => ({ ...s, files: sanitizeFiles(s.files, config) })) : tests.incorrectSolutions,
    },
    notes: out.notes ?? "",
  };
}

const RUBRIC_TEXT: Record<CapabilityId, { why: string; evidence: string; concern: string; partial: string; demonstrated: string; insufficient: string; limitations: string; candidate: string }> = {
  correctness: {
    why: "The change must do what the brief asks before anything else matters.",
    evidence: "Results of the evaluation tests mapped to each acceptance criterion.",
    concern: "Required behavior is missing or wrong in tested cases.",
    partial: "The main behavior works but some stated cases fail.",
    demonstrated: "All tested acceptance criteria pass.",
    insufficient: "The submission did not run, so no behavior could be observed.",
    limitations: "Tests cover stated cases only; untested paths are not judged.",
    candidate: "We ran tests for each requirement in the brief and report which passed.",
  },
  reliability: {
    why: "Production code meets failures, retries and edge cases.",
    evidence: "Tests that exercise the failure and edge cases stated in the brief.",
    concern: "Stated failure cases break or corrupt state.",
    partial: "Some stated failure cases are handled.",
    demonstrated: "All stated failure and edge cases behave as specified.",
    insufficient: "No failure-case tests could run against the submission.",
    limitations: "Only failure modes named in the brief are tested.",
    candidate: "We checked the failure and edge cases the brief describes.",
  },
  testing: {
    why: "A regression test keeps the fix from silently breaking later.",
    evidence: "Tests the candidate added, and whether they fail on the original starter.",
    concern: "No new test, or new tests do not exercise the change.",
    partial: "A test was added but would not catch the original defect.",
    demonstrated: "Added tests fail on the starter and pass on the submission.",
    insufficient: "The submission's tests could not be run.",
    limitations: "Judged by a reviewer from the submitted test files.",
    candidate: "Reviewers look at the tests you added and what they would catch.",
  },
  maintainability: {
    why: "Other engineers will read and change this code.",
    evidence: "The diff: naming, structure and scope of the change.",
    concern: "The change is hard to follow or reaches far beyond the task.",
    partial: "Readable, with some unnecessary complexity or unrelated edits.",
    demonstrated: "A focused, readable change that fits the existing code.",
    insufficient: "The diff was too small or empty to judge.",
    limitations: "A reviewer's judgment, anchored to the examples above. Not scored automatically.",
    candidate: "A reviewer reads your diff for clarity and focus.",
  },
  security: {
    why: "Boundaries such as validation and authorization must hold.",
    evidence: "Tests for the security boundary stated in the brief.",
    concern: "The stated boundary can be bypassed in tested cases.",
    partial: "The boundary holds for common cases but not all stated ones.",
    demonstrated: "All tested boundary cases are enforced.",
    insufficient: "Boundary tests could not run against the submission.",
    limitations: "Only the stated boundary is tested; this is not a security audit.",
    candidate: "We tested the security boundary the brief describes.",
  },
  performance: {
    why: "The brief states a bound on work done.",
    evidence: "Tests that count operations or calls against the stated bound.",
    concern: "The stated bound is exceeded.",
    partial: "The bound holds in some tested cases.",
    demonstrated: "The stated bound holds in all tested cases.",
    insufficient: "Performance tests could not run.",
    limitations: "Counts operations, not wall-clock time.",
    candidate: "We counted operations against the bound in the brief.",
  },
  technical_judgment: {
    why: "Real work involves tradeoffs that need explaining.",
    evidence: "The handoff: what was chosen, what was not, and why.",
    concern: "No tradeoffs considered, or claims contradicted by the code.",
    partial: "Tradeoffs mentioned without connecting them to the code.",
    demonstrated: "Clear tradeoffs that match the submitted change.",
    insufficient: "No handoff was written.",
    limitations: "A reviewer's judgment from the handoff. Writing style is not assessed.",
    candidate: "A reviewer reads your handoff for the reasoning behind your change.",
  },
  communication: {
    why: "Asking the right question and handing off clearly saves a team time.",
    evidence: "Questions asked when the brief left something open, and the handoff's usefulness.",
    concern: "Key assumptions made silently, or a handoff a teammate could not act on.",
    partial: "Some assumptions stated; the handoff misses important context.",
    demonstrated: "Necessary questions asked or assumptions stated; a handoff a teammate can act on.",
    insufficient: "No messages or handoff to review.",
    limitations: "Message volume is not counted, and personality or culture fit is not inferred.",
    candidate: "A reviewer looks at whether your questions and handoff would help a teammate.",
  },
};

export function buildRubric(config: AuthoringConfig, criteria: AcceptanceCriterion[]): RubricCriterion[] {
  const standard = config.capabilities.map((cap, i) => {
    const meta = CAPABILITIES.find((c) => c.id === cap)!;
    const text = RUBRIC_TEXT[cap];
    const judgedBy: RubricCriterion["judgedBy"] = meta.executable && cap !== "testing" ? "tests" : "reviewer";
    const mapped = criteria.filter((a) => a.capability === cap).map((a) => a.id);
    return {
      id: `CR-${i + 1}`,
      capability: cap,
      label: meta.label,
      whyItMatters: text.why,
      observableEvidence: text.evidence,
      anchors: { concern_observed: text.concern, partially_demonstrated: text.partial, demonstrated: text.demonstrated },
      insufficientEvidence: text.insufficient,
      limitations: text.limitations,
      candidateExplanation: text.candidate,
      acceptanceCriterionIds: judgedBy === "tests" ? (mapped.length ? mapped : criteria.map((a) => a.id)) : [],
      judgedBy,
    };
  });
  const custom = config.custom.customCapabilities.map((name, i): RubricCriterion => ({
    id: `CR-${standard.length + i + 1}`,
    capability: "technical_judgment",
    label: name,
    whyItMatters: `The hiring team asked to assess ${name}.`,
    observableEvidence: `What the submission and handoff show about ${name}.`,
    anchors: {
      concern_observed: `The submission shows a clear problem with ${name}.`,
      partially_demonstrated: `Some evidence of ${name}, with gaps a reviewer can name.`,
      demonstrated: `Clear evidence of ${name} in the submitted work.`,
    },
    insufficientEvidence: `The submission does not show enough to judge ${name}.`,
    limitations: "Defined by the hiring team and judged by a reviewer. Edit these anchors so reviewers apply them consistently.",
    candidateExplanation: `A reviewer looks at your work for ${name}.`,
    acceptanceCriterionIds: [],
    judgedBy: "reviewer",
  }));
  return [...standard, ...custom];
}

function nodePackageJson(): PackageFile {
  return { path: "package.json", content: `${JSON.stringify({ name: "work-sample", private: true, type: "module" }, null, 2)}\n` };
}

export function assemble(
  config: AuthoringConfig,
  brief: BriefStage,
  code: CodeStage,
  tests: TestsStage,
  model: string | null,
  path: ScenarioPackage["provenance"]["path"],
): { pkg: ScenarioPackage; prot: ProtectedMaterials } {
  const lang = LANGUAGES.find((l) => l.id === config.language)!;
  const env = ENVIRONMENTS[lang.environment];
  const starter = [...code.starterFiles];
  if (env.runtime === "node" && !starter.some((f) => f.path === "package.json")) starter.push(nodePackageJson());
  if (env.runtime === "python" && !starter.some((f) => f.path === "app/__init__.py") && starter.some((f) => f.path.startsWith("app/"))) starter.push({ path: "app/__init__.py", content: "" });
  starter.push(tests.publicTests.file);
  const publicTests: TestRef[] = tests.publicTests.tests.map((t) => ({ name: t.name, file: tests.publicTests.file.path, criterionIds: t.criterionIds }));
  const protectedRefs: TestRef[] = tests.evaluationTests.tests.map((t) => ({ name: t.name, file: tests.evaluationTests.file.path, criterionIds: t.criterionIds }));
  const coworkers: Coworker[] = brief.coworkers.map((c, i) => ({ id: `cw-${i + 1}`, name: c.name, title: c.title, responsibilities: c.responsibilities, topics: c.topics, tone: c.tone, boundaries: c.boundaries }));
  const coworkerFacts: ProtectedMaterials["coworkerFacts"] = {};
  brief.coworkers.forEach((c, i) => (coworkerFacts[`cw-${i + 1}`] = c.facts.map((text, j) => ({ id: `cw-${i + 1}-f${j + 1}`, text }))));
  const policy =
    config.aiPolicy === "custom"
      ? { id: "custom" as const, candidateText: config.custom.aiPolicyText ?? "" }
      : AI_POLICIES.find((p) => p.id === config.aiPolicy) ?? AI_POLICIES[1];
  const publicFiles = [tests.publicTests.file.path];
  const pkg: ScenarioPackage = {
    schema: 1,
    config,
    brief: {
      title: brief.title,
      summary: brief.summary,
      context: brief.context,
      task: brief.task,
      outcomes: brief.outcomes,
      constraints: brief.constraints,
      outOfScope: brief.outOfScope,
      optionalExtensions: brief.optionalExtensions,
      interface: brief.interfaceSpec,
    },
    acceptanceCriteria: brief.acceptanceCriteria,
    environment: {
      id: lang.environment,
      language: lang.id,
      setupCommands: [],
      testCommand: displayCommand(lang.environment, publicFiles),
      setupMinutes: config.setupMinutes,
      taskMinutes: config.taskMinutes,
    },
    setupInstructions: [
      env.runtime === "python" ? "Install Python 3.12 or newer. No packages are needed." : "Install Node.js 22 or newer. No npm packages are needed.",
      "Download the starter project and open it in your editor.",
      `Run the public tests: ${displayCommand(lang.environment, publicFiles)}`,
    ],
    starterFiles: starter,
    publicTests,
    fixturePaths: [],
    rubric: buildRubric(config, brief.acceptanceCriteria),
    coworkers,
    aiPolicy: { id: policy.id, candidateText: policy.candidateText },
    submission: {
      requirements: ["Upload your changed project as a zip, or the files you changed.", "Include any tests you added.", "Write a short handoff."],
      handoffPrompts: [
        { id: "changes", label: "What did you change?", help: "The files and the behavior that changed." },
        { id: "decisions", label: "What did you decide, and why?", help: "Tradeoffs and alternatives you considered." },
        { id: "risks", label: "What would you check before shipping?", help: "Anything untested, assumed or left out." },
      ],
    },
    accommodations: ["Extra time can be granted per invitation.", "Screen readers and keyboard-only use are supported in the browser workspace."],
    interruptionPolicy: "If your connection drops, your files and timer are saved. Reopen the invitation link to continue.",
    feedbackPolicy: "You receive a report of which requirements the tests confirmed, the evidence behind each criterion, and what could not be assessed. Hidden test code is not shared.",
    provenance: { path, model, generatedAt: new Date().toISOString(), sections: initialSections(path === "generated" ? "generator" : "author") },
  };
  const prot: ProtectedMaterials = {
    protectedTests: [tests.evaluationTests.file],
    protectedTestRefs: protectedRefs,
    reference: { files: code.referenceFiles, approaches: code.approaches },
    incorrectSolutions: tests.incorrectSolutions.map((s, i) => ({ id: `wrong-${i + 1}`, description: s.description, files: s.files })),
    coworkerFacts,
    rubricNotes: {},
  };
  return { pkg, prot };
}

/** Rebuilds the generation stages from a saved draft, so scoped regeneration keeps the author's edits. */
export function stagesFromPackage(pkg: ScenarioPackage, prot: ProtectedMaterials): { brief: BriefStage; code: CodeStage; tests: TestsStage } {
  const publicPath = pkg.publicTests[0]?.file ?? layoutFor(pkg.config).publicTestPath;
  const evalPath = prot.protectedTests[0]?.path ?? layoutFor(pkg.config).evaluationTestPath;
  const generatedHelpers = new Set(["package.json"]);
  return {
    brief: {
      ...pkg.brief,
      interfaceSpec: pkg.brief.interface,
      acceptanceCriteria: pkg.acceptanceCriteria,
      coworkers: pkg.coworkers.map((c) => ({ ...c, facts: (prot.coworkerFacts[c.id] ?? []).map((f) => f.text) })),
    },
    code: {
      starterFiles: pkg.starterFiles.filter((f) => f.path !== publicPath && !generatedHelpers.has(f.path)),
      referenceFiles: prot.reference.files,
      approaches: prot.reference.approaches,
    },
    tests: {
      publicTests: { file: pkg.starterFiles.find((f) => f.path === publicPath) ?? { path: publicPath, content: "" }, tests: pkg.publicTests.map((t) => ({ name: t.name, criterionIds: t.criterionIds })) },
      evaluationTests: {
        file: prot.protectedTests.find((f) => f.path === evalPath) ?? { path: evalPath, content: "" },
        tests: prot.protectedTestRefs.map((t) => ({ name: t.name, criterionIds: t.criterionIds })),
      },
      incorrectSolutions: prot.incorrectSolutions.map((s) => ({ description: s.description, files: s.files })),
    },
  };
}

/** An editable draft for the upload path: brief from the author's own words, files left for the author. */
export function skeletonPackage(config: AuthoringConfig): { pkg: ScenarioPackage; prot: ProtectedMaterials } {
  const criteria: AcceptanceCriterion[] = (config.outcomes.length ? config.outcomes : ["Describe the first required outcome."]).map((text, i) => ({
    id: `AC-${i + 1}`,
    text,
    capability: config.capabilities.find((c) => CAPABILITIES.find((x) => x.id === c)?.executable) ?? "correctness",
  }));
  const layout = layoutFor(config);
  const brief: BriefStage = {
    title: placeholderTitle(config),
    summary: config.description.slice(0, 380),
    context: config.background || config.description,
    task: config.description,
    outcomes: config.outcomes.length ? config.outcomes : criteria.map((c) => c.text),
    constraints: config.constraints,
    outOfScope: config.outOfScope,
    optionalExtensions: [],
    interfaceSpec: "",
    acceptanceCriteria: criteria,
    coworkers: [],
  };
  const empty: TestsStage = {
    publicTests: { file: { path: layout.publicTestPath, content: "" }, tests: [] },
    evaluationTests: { file: { path: layout.evaluationTestPath, content: "" }, tests: [] },
    incorrectSolutions: [],
  };
  return assemble(config, brief, { starterFiles: [], referenceFiles: [], approaches: [] }, empty, null, "uploaded");
}
