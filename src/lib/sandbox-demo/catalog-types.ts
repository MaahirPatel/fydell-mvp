/**
 * A simulation the public demo can run end to end in the browser. Every
 * entry is derived from a validated role-model scenario package; the demo
 * never hand-writes a separate, unvalidated copy.
 */

export type DemoDifficulty = "introductory" | "moderate" | "challenging";

export type DemoFile = { path: string; content: string; editable: boolean; language: "javascript" | "typescript" | "python" | "markdown" | "json" | "text" };

export type DemoTest = {
  /** Exact test title as registered in the test file. */
  name: string;
  file: string;
  visibility: "public" | "protected";
  /** The acceptance criteria ids this test checks. */
  criterionIds: string[];
};

export type DemoCriterion = { id: string; text: string };

export type DemoTeammate = {
  id: string;
  name: string;
  title: string;
  initials: string;
  /** What the candidate can expect to learn from them, shown in the brief. */
  knows: string[];
  wontShare: string;
};

export type DemoScenario = {
  key: string;
  version: string;
  trackId: string;
  trackLabel: string;
  taskFamilyLabel: string;
  title: string;
  summary: string;
  businessContext: string;
  stackLabel: string;
  minutes: number;
  difficulty: DemoDifficulty;
  levelLabel: string;
  brief: { context: string[]; task: string; constraints: string[]; outOfScope: string[]; aiPolicy: string };
  criteria: DemoCriterion[];
  files: DemoFile[];
  /** Evaluator-only tests, run on submit. Kept out of the file tree. */
  protectedFiles: DemoFile[];
  tests: DemoTest[];
  teammates: DemoTeammate[];
  /** How the candidate should run tests, in words, for the brief and the Tests panel. */
  testCommandLabel: string;
};

export type DemoCatalogEntry =
  | { status: "playable"; scenario: DemoScenario }
  /** Validated for real simulations but not runnable in a browser (for example Python). Listed, not selectable. */
  | { status: "desktop_only"; key: string; trackId: string; trackLabel: string; title: string; summary: string; stackLabel: string; minutes: number; difficulty: DemoDifficulty; reason: string };
