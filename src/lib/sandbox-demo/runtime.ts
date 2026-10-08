import type { DemoFile, DemoScenario } from "./catalog-types";
import type { TestMeta } from "./types";

/**
 * Everything the workspace, runner, state and report derive from a
 * DemoScenario, computed once per scenario. Test ids are `file::name`, so a
 * result always points at exactly one registered test.
 */
export type ScenarioRuntime = {
  scenario: DemoScenario;
  /** Files the candidate sees, in tree order. */
  candidateFiles: DemoFile[];
  candidatePaths: string[];
  editablePaths: string[];
  /** Read-only files, test files and README among them. */
  lockedPaths: string[];
  /** Starting content of every visible file. */
  starterFiles: Record<string, string>;
  protectedFiles: Record<string, string>;
  publicTestFiles: string[];
  protectedTestFiles: string[];
  tests: TestMeta[];
  publicTests: TestMeta[];
  testMeta: (id: string) => TestMeta | undefined;
  teammateIds: string[];
  /** The file opened first: the first editable source file. */
  defaultFile: string;
};

export function testId(file: string, name: string): string {
  return `${file}::${name}`;
}

const cache = new WeakMap<DemoScenario, ScenarioRuntime>();

export function runtimeFor(scenario: DemoScenario): ScenarioRuntime {
  const hit = cache.get(scenario);
  if (hit) return hit;
  const criterionText = new Map(scenario.criteria.map((c) => [c.id, c.text]));
  const tests: TestMeta[] = scenario.tests.map((t) => ({
    id: testId(t.file, t.name),
    name: t.name,
    file: t.file,
    visibility: t.visibility,
    requirement: t.criterionIds.map((id) => criterionText.get(id) ?? id).join(" ") || t.name,
  }));
  const byId = new Map(tests.map((t) => [t.id, t]));
  const unique = <T,>(list: T[]) => [...new Set(list)];
  const editablePaths = scenario.files.filter((f) => f.editable).map((f) => f.path);
  const runtime: ScenarioRuntime = {
    scenario,
    candidateFiles: scenario.files,
    candidatePaths: scenario.files.map((f) => f.path),
    editablePaths,
    lockedPaths: scenario.files.filter((f) => !f.editable).map((f) => f.path),
    starterFiles: Object.fromEntries(scenario.files.map((f) => [f.path, f.content])),
    protectedFiles: Object.fromEntries(scenario.protectedFiles.map((f) => [f.path, f.content])),
    publicTestFiles: unique(scenario.tests.filter((t) => t.visibility === "public").map((t) => t.file)),
    protectedTestFiles: unique(scenario.tests.filter((t) => t.visibility === "protected").map((t) => t.file)),
    tests,
    publicTests: tests.filter((t) => t.visibility === "public"),
    testMeta: (id) => byId.get(id),
    teammateIds: scenario.teammates.map((m) => m.id),
    defaultFile: editablePaths.find((p) => !p.endsWith(".md")) ?? scenario.files[0]?.path ?? "",
  };
  cache.set(scenario, runtime);
  return runtime;
}

/** Problems that would make a scenario unplayable in the browser. Empty when it is sound. */
export function scenarioProblems(scenario: DemoScenario): string[] {
  const problems: string[] = [];
  const visible = new Set(scenario.files.map((f) => f.path));
  const hidden = new Set(scenario.protectedFiles.map((f) => f.path));
  const criteria = new Set(scenario.criteria.map((c) => c.id));
  if (!/^[a-z0-9][a-z0-9-]*$/.test(scenario.key)) problems.push(`key ${JSON.stringify(scenario.key)} must be lowercase letters, digits and hyphens`);
  if (!scenario.files.some((f) => f.editable)) problems.push("no editable file");
  for (const f of scenario.protectedFiles) if (visible.has(f.path)) problems.push(`${f.path} is both visible and protected`);
  const seen = new Set<string>();
  for (const t of scenario.tests) {
    const id = testId(t.file, t.name);
    if (seen.has(id)) problems.push(`duplicate test ${id}`);
    seen.add(id);
    if (t.visibility === "public" && !visible.has(t.file)) problems.push(`public test file ${t.file} is not a visible file`);
    if (t.visibility === "protected" && !hidden.has(t.file)) problems.push(`protected test file ${t.file} is not a protected file`);
    if (t.visibility === "public" && scenario.files.find((f) => f.path === t.file)?.editable) problems.push(`public test file ${t.file} must be read-only`);
    for (const c of t.criterionIds) if (!criteria.has(c)) problems.push(`test ${t.name} names unknown criterion ${c}`);
  }
  if (!scenario.tests.some((t) => t.visibility === "public")) problems.push("no public tests");
  const ids = new Set<string>();
  for (const m of scenario.teammates) {
    if (ids.has(m.id) || m.id === "you" || m.id === "system") problems.push(`teammate id ${m.id} is reserved or repeated`);
    ids.add(m.id);
  }
  return problems;
}
