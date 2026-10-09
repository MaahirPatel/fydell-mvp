import { isCiWorkflow, isManifest, isReadme, isTestFile } from "./select";
import { runPracticeDetectors } from "./practice-detectors";
import type { EvidenceBasis, EvidenceCategory } from "./types";

export type DraftFinding = {
  detector: string;
  category: EvidenceCategory;
  finding: string;
  basis: EvidenceBasis;
  path: string;
  startLine: number;
  endLine: number;
  limitations: string[];
};

type Files = Map<string, string>;

const PER_DETECTOR = 3;
const TOTAL = 36;

const lines = (text: string) => text.split(/\r?\n/);
const ext = (path: string) => path.slice(path.lastIndexOf(".") + 1).toLowerCase();
const isPython = (p: string) => ext(p) === "py";
const isScript = (p: string) => ["ts", "tsx", "js", "jsx", "mjs", "cjs"].includes(ext(p));

function sourceFiles(files: Files): Array<[string, string[]]> {
  return [...files.entries()].filter(([p]) => !isReadme(p) && !/\.(md|txt)$/i.test(p)).map(([p, t]) => [p, lines(t)]);
}

function fastapiValidatedRoutes(files: Files): DraftFinding[] {
  const bases = new Map<string, string[]>();
  for (const [p, text] of files) {
    if (!isPython(p)) continue;
    for (const m of text.matchAll(/^\s*class\s+([A-Z]\w*)\s*\(([^)]*)\)/gm)) {
      bases.set(m[1], m[2].split(",").map((b) => b.trim().split("=")[0].trim().split(".").pop() ?? ""));
    }
  }
  const ROOTS = new Set(["BaseModel", "SQLModel", "Schema"]);
  const models = new Set<string>();
  let grew = true;
  while (grew) {
    grew = false;
    for (const [name, parents] of bases) {
      if (!models.has(name) && parents.some((b) => ROOTS.has(b) || models.has(b))) {
        models.add(name);
        grew = true;
      }
    }
  }
  const out: DraftFinding[] = [];
  for (const [path, ls] of sourceFiles(files)) {
    if (!isPython(path)) continue;
    ls.forEach((line, i) => {
      if (!/^\s*@\w+\.(get|post|put|patch|delete)\(/.test(line)) return;
      for (let j = i + 1; j < Math.min(ls.length, i + 9); j++) {
        const model = [...ls[j].matchAll(/\b\w+\s*:\s*([A-Z]\w*)\b/g)].map((m) => m[1]).find((name) => models.has(name));
        if (model) {
          out.push({
            detector: "fastapi_validated_route",
            category: "backend",
            finding: `API route validates its request body with the typed model ${model}.`,
            basis: "repository_observation",
            path,
            startLine: i + 1,
            endLine: j + 1,
            limitations: ["How thoroughly the model constrains input is not assessed."],
          });
          return;
        }
      }
    });
  }
  return out;
}

function schemaValidatedHandlers(files: Files): DraftFinding[] {
  const out: DraftFinding[] = [];
  for (const [path, ls] of sourceFiles(files)) {
    if (!isScript(path)) continue;
    const text = ls.join("\n");
    const isHandler = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(|\b(app|router)\.(get|post|put|patch|delete)\(/.test(text);
    if (!isHandler || !/\bz\.object\(/.test(text)) continue;
    const i = ls.findIndex((l) => /\.(safeParse|parse)\(/.test(l));
    if (i < 0) continue;
    out.push({
      detector: "schema_validated_handler",
      category: "backend",
      finding: "Request handler validates input against a schema before using it.",
      basis: "repository_observation",
      path,
      startLine: i + 1,
      endLine: Math.min(ls.length, i + 2),
      limitations: ["Schema coverage of every field is not assessed."],
    });
  }
  return out;
}

/** The line without its comment. String contents are kept: `event.get("already_processed")` is a real check. */
export function codeOnly(line: string): string {
  const masked = line.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, (s) => s[0] + " ".repeat(s.length - 2) + s[0]);
  const comment = masked.search(/(^|\s)(#|\/\/)/);
  return comment < 0 ? line : line.slice(0, comment);
}

/** An identifier that names already-done work: alreadyProcessed, seen_ids, PROCESSED, isDuplicate, dedupeKey... */
const DONE_NAME = /\b\w*(processed|handled|seen|dedup\w*|duplicate|idempot\w*|delivered)\w*\b/i;
/** A write that claims a key atomically and does nothing on a repeat: ON CONFLICT DO NOTHING, INSERT OR IGNORE, Redis SET NX. */
const DEDUPE_CLAIM = /\bON\s+CONFLICT\b[^;]*\bDO\s+NOTHING\b|\bINSERT\s+OR\s+IGNORE\b|\bsetnx\(|\bnx\s*=\s*True\b|\bnx:\s*true\b|['"]NX['"]/i;

/**
 * Either an `if` that tests already-done work (a call such as
 * alreadyProcessed(), a membership test such as `x in PROCESSED` or
 * `seenIds.has(x)`, or a flag) and leaves within three lines, or an atomic
 * dedupe claim. The words must be code, not comments or string contents,
 * except the claim, which normally sits inside a SQL or Redis call.
 */
export function idempotencyMatch(ls: string[]): { start: number; end: number; kind: "guard" | "claim" } | null {
  for (let i = 0; i < ls.length; i++) {
    const code = codeOnly(ls[i]);
    if (code.trim() && DEDUPE_CLAIM.test(ls[i])) return { start: i + 1, end: i + 1, kind: "claim" };
    const at = code.search(/\bif\b/);
    if (at < 0) continue;
    const condition = code.slice(at).split(/\b(?:return|continue|raise|throw)\b|\{\s*$|:\s*$/)[0];
    if (!DONE_NAME.test(condition)) continue;
    const window = [code.slice(at), ...ls.slice(i + 1, i + 4).map(codeOnly)];
    const end = window.findIndex((l) => /\b(return|continue|raise|throw)\b/.test(l));
    if (end < 0) continue;
    return { start: i + 1, end: i + 1 + end, kind: "guard" };
  }
  return null;
}

function idempotencyGuards(files: Files): DraftFinding[] {
  const out: DraftFinding[] = [];
  for (const [path, ls] of sourceFiles(files)) {
    if (isTestFile(path) || !(isPython(path) || isScript(path) || ["go", "rb", "java", "kt"].includes(ext(path)))) continue;
    const m = idempotencyMatch(ls);
    if (!m) continue;
    out.push({
      detector: "idempotency_guard",
      category: "backend",
      finding:
        m.kind === "claim"
          ? "Claims a key atomically so a repeated request does nothing."
          : "Checks whether work was already processed before repeating it.",
      basis: "repository_observation",
      path,
      startLine: m.start,
      endLine: m.end,
      limitations: ["Behaviour under concurrent delivery is not observed."],
    });
  }
  return out;
}

function testSuites(files: Files): DraftFinding[] {
  const tests = [...files.keys()].filter(isTestFile);
  if (tests.length === 0) return [];
  for (const path of tests) {
    const ls = lines(files.get(path) ?? "");
    const i = ls.findIndex((l) =>
      /^\s*(async\s+)?def\s+test_\w+|^\s*(it|test|describe)(\.\w+)*\(|^\s*func\s+Test\w+|^\s*@Test\b|^\s*(it|describe|context)\s+["']/.test(l),
    );
    if (i >= 0) {
      return [
        {
          detector: "test_suite",
          category: "testing",
          finding: `Includes automated tests (${tests.length} test file${tests.length === 1 ? "" : "s"} in the analyzed set).`,
          basis: "repository_observation",
          path,
          startLine: i + 1,
          endLine: i + 1,
          limitations: ["Fydell does not run imported code, so whether these tests pass is unknown."],
        },
      ];
    }
  }
  return [];
}

function ciWorkflows(files: Files): DraftFinding[] {
  const out: DraftFinding[] = [];
  for (const [path, text] of files) {
    if (!isCiWorkflow(path)) continue;
    const ls = lines(text);
    const i = ls.findIndex((l) => /\brun:\s*.*\b(pytest|test|lint|ruff|mypy|tsc|eslint|go vet|cargo test)\b/i.test(l));
    if (i < 0) continue;
    out.push({
      detector: "ci_checks",
      category: "delivery",
      finding: "Runs tests or static checks in a CI workflow.",
      basis: "repository_observation",
      path,
      startLine: i + 1,
      endLine: i + 1,
      limitations: ["Workflow run results were not checked."],
    });
  }
  return out;
}

function migrations(files: Files): DraftFinding[] {
  const path = [...files.keys()].find((p) => /(^|\/)(alembic\/versions|migrations)\/[^/]+\.(py|sql)$/.test(p));
  if (!path) return [];
  const ls = lines(files.get(path) ?? "");
  const i = ls.findIndex((l) => /\b(create table|alter table|op\.create_table|op\.add_column|migrations\.)/i.test(l));
  if (i < 0) return [];
  return [
    {
      detector: "schema_migrations",
      category: "backend",
      finding: "Manages database schema changes through versioned migrations.",
      basis: "repository_observation",
      path,
      startLine: i + 1,
      endLine: i + 1,
      limitations: ["Migration safety on real data is not assessed."],
    },
  ];
}

const DEPENDENCIES: Array<[RegExp, string, EvidenceCategory]> = [
  [/\bfastapi\b/i, "FastAPI", "backend"],
  [/\bdjango\b/i, "Django", "backend"],
  [/\bflask\b/i, "Flask", "backend"],
  [/\bsqlalchemy\b/i, "SQLAlchemy", "backend"],
  [/"express"\s*:/, "Express", "backend"],
  [/"react"\s*:/, "React", "frontend"],
  [/"next"\s*:/, "Next.js", "frontend"],
  [/"vue"\s*:/, "Vue", "frontend"],
  [/\b(torch|pytorch)\b/i, "PyTorch", "ml_engineering"],
  [/\btensorflow\b/i, "TensorFlow", "ml_engineering"],
  [/\bscikit-learn\b|\bsklearn\b/i, "scikit-learn", "ml_engineering"],
  [/\btransformers\b/i, "Hugging Face Transformers", "ml_engineering"],
  [/\bopenai\b/i, "OpenAI SDK", "applied_ai"],
  [/\banthropic\b/i, "Anthropic SDK", "applied_ai"],
  [/\blangchain\b/i, "LangChain", "applied_ai"],
];

function dependencyDeclarations(files: Files): DraftFinding[] {
  const out: DraftFinding[] = [];
  const seen = new Set<string>();
  for (const [path, text] of files) {
    if (!isManifest(path)) continue;
    const ls = lines(text);
    for (const [pattern, name, category] of DEPENDENCIES) {
      if (seen.has(name)) continue;
      const i = ls.findIndex((l) => pattern.test(l));
      if (i < 0) continue;
      seen.add(name);
      out.push({
        detector: "dependency_declaration",
        category,
        finding: `Declares ${name} as a dependency.`,
        basis: "dependency_declaration",
        path,
        startLine: i + 1,
        endLine: i + 1,
        limitations: ["A declared dependency does not establish use or proficiency."],
      });
    }
  }
  return out.slice(0, 6);
}

function mlTraining(files: Files): DraftFinding[] {
  const out: DraftFinding[] = [];
  for (const [path, ls] of sourceFiles(files)) {
    if (!isPython(path)) continue;
    const i = ls.findIndex((l) => /\bloss\.backward\(\)|\boptimizer\.step\(\)|\bmodel\.fit\(|\btrainer\.train\(\)/.test(l));
    if (i < 0) continue;
    out.push({
      detector: "ml_training_step",
      category: "ml_engineering",
      finding: "Contains a model training step.",
      basis: "repository_observation",
      path,
      startLine: i + 1,
      endLine: i + 1,
      limitations: ["Training results were not reproduced; data and evaluation quality are not assessed."],
    });
  }
  return out;
}

function llmIntegrations(files: Files): DraftFinding[] {
  const out: DraftFinding[] = [];
  for (const [path, ls] of sourceFiles(files)) {
    if (!isPython(path) && !isScript(path)) continue;
    const i = ls.findIndex((l) => /\.chat\.completions\.create\(|\.responses\.create\(|\.messages\.create\(|\bChatOpenAI\(|\bChatAnthropic\(/.test(l));
    if (i < 0) continue;
    out.push({
      detector: "llm_api_integration",
      category: "applied_ai",
      finding: "Calls a hosted language-model API from application code.",
      basis: "repository_observation",
      path,
      startLine: i + 1,
      endLine: i + 1,
      limitations: ["An LLM API integration is applied AI evidence, not ML engineering evidence."],
    });
  }
  return out;
}

function reactComponents(files: Files): DraftFinding[] {
  const out: DraftFinding[] = [];
  for (const [path, ls] of sourceFiles(files)) {
    if (!["tsx", "jsx"].includes(ext(path)) || isTestFile(path)) continue;
    const i = ls.findIndex((l) => /^export\s+(default\s+)?function\s+[A-Z]\w*\s*\(/.test(l));
    if (i < 0 || !ls.slice(i, i + 40).some((l) => /return\s*\(?\s*<|^\s*<[A-Za-z]/.test(l))) continue;
    out.push({
      detector: "react_component",
      category: "frontend",
      finding: "Implements a React UI component.",
      basis: "repository_observation",
      path,
      startLine: i + 1,
      endLine: i + 1,
      limitations: ["Accessibility and visual quality are not assessed from source alone."],
    });
  }
  return out;
}

const DETECTORS = [
  fastapiValidatedRoutes,
  schemaValidatedHandlers,
  idempotencyGuards,
  testSuites,
  ciWorkflows,
  migrations,
  mlTraining,
  llmIntegrations,
  reactComponents,
];

export function runDetectors(files: Files): DraftFinding[] {
  const observed = [...DETECTORS.flatMap((detect) => detect(files).slice(0, PER_DETECTOR)), ...runPracticeDetectors(files)];
  // Declarations are the weakest evidence: kept separate and capped, never crowding out observations.
  return [...observed.slice(0, TOTAL), ...dependencyDeclarations(files)];
}
