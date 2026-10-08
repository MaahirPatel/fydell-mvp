import type { DemoCatalogEntry, DemoDifficulty, DemoScenario } from "./catalog-types";
import { runtimeFor, scenarioProblems } from "./runtime";
import {
  BRIEF,
  CANDIDATE_FILES,
  COWORKERS,
  PROTECTED_FILES,
  REQUIREMENTS,
  SCENARIO_TITLE,
  SCENARIO_VERSION,
  SOLUTIONS,
  STARTER_FILES,
  SUGGESTED_MINUTES,
  TESTS,
} from "./scenario";

/**
 * The simulations the public demo lists. Playable entries run end to end in
 * the browser; desktop-only entries are listed with the reason they cannot.
 */

const EVENT_INBOX: DemoScenario = {
  key: "event-inbox",
  version: SCENARIO_VERSION,
  trackId: "backend_api",
  trackLabel: "Backend & API",
  taskFamilyLabel: "Reliability debugging",
  title: SCENARIO_TITLE,
  summary: "Find out why payment events are lost after a provider timeout, fix the inbox and keep its public contract intact.",
  businessContext: "Lumen Ledger, a fictional payments ledger for small merchants.",
  stackLabel: "JavaScript, Node style CommonJS",
  minutes: SUGGESTED_MINUTES,
  difficulty: "moderate",
  levelLabel: "Mid-level",
  brief: {
    context: BRIEF.context.slice(0, 2),
    task: BRIEF.context[2],
    constraints: BRIEF.constraints,
    outOfScope: ["Changing how the payment providers deliver events.", "Changing the handler that writes to the merchant's ledger."],
    aiPolicy: BRIEF.aiPolicy,
  },
  criteria: REQUIREMENTS.map((r) => ({ id: r.id, text: r.text })),
  files: CANDIDATE_FILES.map((f) => ({ path: f.path, content: STARTER_FILES[f.path], editable: f.editable, language: f.language })),
  protectedFiles: Object.entries(PROTECTED_FILES).map(([path, content]) => ({ path, content, editable: false, language: "javascript" as const })),
  tests: TESTS.map((t) => ({
    name: t.name,
    file: t.file,
    visibility: t.visibility,
    criterionIds: REQUIREMENTS.filter((r) => r.testIds.includes(t.id)).map((r) => r.id),
  })),
  teammates: COWORKERS.map((c) => ({ id: c.id, name: c.name, title: c.title, initials: c.initials, knows: c.knows, wontShare: c.wontShare })),
  testCommandLabel: "Run tests runs the public tests in test/inbox.test.js in your browser. Protected tests run when you submit.",
};

export const DEMO_CATALOG: DemoCatalogEntry[] = [{ status: "playable", scenario: EVENT_INBOX }];

/**
 * Reference solutions, used only to build the illustrative example report
 * and to show the package's validation checks. Kept out of DemoScenario so
 * nothing in the candidate workspace can reach them.
 */
const REFERENCE_SOLUTIONS: Record<string, Record<string, string>> = {
  "event-inbox": SOLUTIONS.reference.files,
};

/** Paths under /sandbox that already belong to other pages. */
export const RESERVED_KEYS = ["overview", "simulation", "work", "task", "candidates", "evidence", "outcomes", "receipts", "roles"];

/** What a library card shows. `reason` is set exactly when the entry cannot be played here. */
export type CatalogSummary = {
  key: string;
  trackId: string;
  trackLabel: string;
  title: string;
  summary: string;
  stackLabel: string;
  minutes: number;
  difficulty: DemoDifficulty;
  levelLabel: string | null;
  taskFamilyLabel: string | null;
  playable: boolean;
  reason: string | null;
};

export function entryKey(entry: DemoCatalogEntry): string {
  return entry.status === "playable" ? entry.scenario.key : entry.key;
}

export function summarize(entry: DemoCatalogEntry): CatalogSummary {
  if (entry.status === "playable") {
    const s = entry.scenario;
    return {
      key: s.key,
      trackId: s.trackId,
      trackLabel: s.trackLabel,
      title: s.title,
      summary: s.summary,
      stackLabel: s.stackLabel,
      minutes: s.minutes,
      difficulty: s.difficulty,
      levelLabel: s.levelLabel,
      taskFamilyLabel: s.taskFamilyLabel,
      playable: true,
      reason: null,
    };
  }
  return {
    key: entry.key,
    trackId: entry.trackId,
    trackLabel: entry.trackLabel,
    title: entry.title,
    summary: entry.summary,
    stackLabel: entry.stackLabel,
    minutes: entry.minutes,
    difficulty: entry.difficulty,
    levelLabel: null,
    taskFamilyLabel: null,
    playable: false,
    reason: entry.reason,
  };
}

/** A playable scenario by key, or null for unknown and desktop-only keys. */
export function demoScenario(key: string): DemoScenario | null {
  for (const entry of DEMO_CATALOG) if (entry.status === "playable" && entry.scenario.key === key) return entry.scenario;
  return null;
}

export function playableScenarios(): DemoScenario[] {
  return DEMO_CATALOG.flatMap((e) => (e.status === "playable" ? [e.scenario] : []));
}

export function referenceSolution(key: string): Record<string, string> | null {
  const scenario = demoScenario(key);
  const files = REFERENCE_SOLUTIONS[key];
  if (!scenario || !files) return null;
  const editable = new Set(runtimeFor(scenario).editablePaths);
  return Object.fromEntries(Object.entries(files).filter(([path]) => editable.has(path)));
}

const TRACK_ORDER = ["backend_api", "applied_ai", "frontend", "fullstack_product"];

export type TrackGroup = { trackId: string; trackLabel: string; entries: CatalogSummary[] };

/** Tracks that have at least one entry, in a stable order, playable entries first. */
export function catalogByTrack(): TrackGroup[] {
  const groups = new Map<string, TrackGroup>();
  for (const entry of DEMO_CATALOG) {
    const s = summarize(entry);
    const group = groups.get(s.trackId) ?? { trackId: s.trackId, trackLabel: s.trackLabel, entries: [] };
    group.entries.push(s);
    groups.set(s.trackId, group);
  }
  const rank = (id: string) => {
    const i = TRACK_ORDER.indexOf(id);
    return i === -1 ? TRACK_ORDER.length : i;
  };
  return [...groups.values()]
    .sort((a, b) => rank(a.trackId) - rank(b.trackId) || a.trackLabel.localeCompare(b.trackLabel))
    .map((g) => ({ ...g, entries: [...g.entries].sort((a, b) => Number(b.playable) - Number(a.playable)) }));
}

/** Catalog problems: duplicate or reserved keys and unplayable scenarios. Empty when sound. */
export function catalogProblems(catalog: DemoCatalogEntry[] = DEMO_CATALOG): string[] {
  const problems: string[] = [];
  const keys = new Set<string>();
  for (const entry of catalog) {
    const key = entryKey(entry);
    if (keys.has(key)) problems.push(`duplicate key ${key}`);
    if (RESERVED_KEYS.includes(key)) problems.push(`key ${key} is already a page under /sandbox`);
    keys.add(key);
    if (entry.status === "playable") problems.push(...scenarioProblems(entry.scenario).map((p) => `${key}: ${p}`));
  }
  return problems;
}
