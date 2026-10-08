import { developmentFeedback } from "@/lib/passport/development-feedback";
import type { PassportProject } from "@/lib/passport/view";
import type {
  BuilderAnalysisReport,
  Dimension,
  DimensionId,
  EvidenceLevel,
  GrowthItem,
  Practice,
  ProjectBreakdown,
  RecurringPattern,
  RepoActivity,
  SignalRef,
  Strength,
  WorkingStyle,
} from "./types";
import { BUILDER_ANALYSIS_VERSION } from "./types";

type ActivityHit = { label: string };

type PracticeDef = {
  key: string;
  label: string;
  dimension: DimensionId;
  detectors?: string[];
  activity?: (a: RepoActivity, now: Date) => ActivityHit | null;
};

const RECENT_DAYS = 120;

export const PRACTICES: PracticeDef[] = [
  // Code quality and testing
  {
    key: "tests_present", label: "Automated tests", dimension: "quality", detectors: ["test_suite"],
    activity: (a) => a.structure && a.structure.testFiles >= 3 && a.structure.testFiles / Math.max(1, a.structure.sourceFiles) >= 0.05
      ? { label: `${a.structure.testFiles} test files alongside ${a.structure.sourceFiles} source files` } : null,
  },
  { key: "failure_tests", label: "Tests that exercise failure paths", dimension: "quality", detectors: ["failure_path_test"] },
  { key: "test_isolation", label: "Isolated or parametrized tests", dimension: "quality", detectors: ["test_isolation", "parametrized_test"] },
  {
    key: "typing", label: "Static typing enforced", dimension: "quality", detectors: ["strict_typing"],
    activity: (a) => (a.structure?.hasTypeConfig ? { label: "Type checker configuration in the repository" } : null),
  },
  { key: "linting", label: "Linter or formatter configured", dimension: "quality", activity: (a) => (a.structure?.hasLintConfig ? { label: "Lint or format configuration in the repository" } : null) },
  { key: "error_handling", label: "Explicit error handling", dimension: "quality", detectors: ["explicit_error_handling"] },

  // Reliability and safety
  { key: "retries", label: "Retries with backoff", dimension: "reliability", detectors: ["retry_with_backoff"] },
  { key: "timeouts", label: "Timeouts on outbound calls", dimension: "reliability", detectors: ["outbound_timeout"] },
  { key: "idempotency", label: "Idempotency guards", dimension: "reliability", detectors: ["idempotency_guard"] },
  { key: "data_safety", label: "Transactions or parameterized SQL", dimension: "reliability", detectors: ["db_transaction", "parameterized_sql"] },
  { key: "observability", label: "Logging, metrics or tracing", dimension: "reliability", detectors: ["observability"] },
  { key: "auth", label: "Authentication or authorization checks", dimension: "reliability", detectors: ["auth_boundary"] },
  { key: "config_validation", label: "Validated configuration", dimension: "reliability", detectors: ["validated_settings"] },
  { key: "caching", label: "Result caching", dimension: "reliability", detectors: ["result_caching"] },

  // Delivery
  {
    key: "ci", label: "Continuous integration", dimension: "delivery", detectors: ["ci_checks", "reusable_action"],
    activity: (a) => (a.structure?.hasCi ? { label: "CI workflow in the repository" } : null),
  },
  {
    key: "containers", label: "Containerized builds", dimension: "delivery", detectors: ["container_build", "container_non_root"],
    activity: (a) => (a.structure?.hasContainer ? { label: "Dockerfile or compose file in the repository" } : null),
  },
  { key: "migrations", label: "Schema migrations", dimension: "delivery", detectors: ["schema_migrations"] },
  { key: "releases", label: "Published releases", dimension: "delivery", activity: (a) => (a.releases && a.releases > 0 ? { label: `${a.releases} published release${a.releases === 1 ? "" : "s"}` } : null) },
  {
    key: "sustained", label: "Sustained work over weeks", dimension: "delivery",
    activity: (a) => (a.commits && a.commits.activeWeeks >= 6 ? { label: `Your commits fall in ${a.commits.activeWeeks} distinct weeks` } : null),
  },
  {
    key: "recent", label: "Recently active", dimension: "delivery",
    activity: (a, now) => {
      const last = a.commits?.lastAt;
      if (!last) return null;
      const days = (now.getTime() - new Date(last).getTime()) / 86_400_000;
      return days >= 0 && days <= RECENT_DAYS ? { label: `Last commit ${Math.max(0, Math.round(days))} days before this analysis` } : null;
    },
  },

  // Architecture and scope
  { key: "validated_api", label: "Validated API boundaries", dimension: "architecture", detectors: ["fastapi_validated_route", "schema_validated_handler"] },
  { key: "contracts", label: "Interfaces and typed contracts", dimension: "architecture", detectors: ["interface_contract"] },
  { key: "async_work", label: "Background or concurrent work", dimension: "architecture", detectors: ["concurrent_execution", "background_job"] },
  { key: "ui_structure", label: "Structured UI state and error boundaries", dimension: "architecture", detectors: ["react_component", "ui_state_management", "ui_error_boundary"] },
  { key: "cli", label: "Command-line interfaces", dimension: "architecture", detectors: ["cli_interface"] },
  {
    key: "modular", label: "Modular project layout", dimension: "architecture",
    activity: (a) => (a.structure && a.structure.topLevelDirs >= 4 && a.structure.sourceFiles >= 30
      ? { label: `${a.structure.sourceFiles} source files across ${a.structure.topLevelDirs} top-level folders` } : null),
  },

  // Communication
  {
    key: "readme_setup", label: "READMEs with setup instructions", dimension: "communication",
    activity: (a) => (a.readme && a.readme.hasSetup && a.readme.chars >= 600 ? { label: `README explains setup (${a.readme.chars.toLocaleString("en-US")} characters)` } : null),
  },
  {
    key: "readme_depth", label: "READMEs that explain the design", dimension: "communication",
    activity: (a) => (a.readme && a.readme.sections.length >= 3 ? { label: `README covers ${a.readme.sections.join(", ")}` } : null),
  },
  {
    key: "commit_messages", label: "Commit messages that say what changed", dimension: "communication",
    activity: (a) => {
      const m = a.commits?.messages;
      return m && m.sampled >= 10 && m.descriptivePct >= 60 ? { label: `${m.descriptivePct}% of ${m.sampled} sampled commit subjects describe the change` } : null;
    },
  },
  {
    key: "conventional_commits", label: "Consistent commit conventions", dimension: "communication",
    activity: (a) => {
      const m = a.commits?.messages;
      return m && m.sampled >= 10 && m.conventionalPct >= 50 ? { label: `${m.conventionalPct}% of sampled commits follow a type: subject convention` } : null;
    },
  },
  {
    key: "project_docs", label: "Project docs, changelog or contributing guide", dimension: "communication",
    activity: (a) => {
      const s = a.structure;
      if (!s) return null;
      const parts = [s.hasDocsDir && "docs folder", s.hasChangelog && "changelog", s.hasContributing && "contributing guide"].filter(Boolean);
      return parts.length ? { label: `Has a ${parts.join(", ")}` } : null;
    },
  },

  // Applied AI and ML
  { key: "llm_integration", label: "Model API integration", dimension: "applied_ai", detectors: ["llm_api_integration"] },
  { key: "llm_validation", label: "Validation of model output", dimension: "applied_ai", detectors: ["llm_output_validation"] },
  { key: "llm_latency", label: "Model latency measurement", dimension: "applied_ai", detectors: ["llm_latency_measurement"] },
  { key: "ml_training", label: "Training with held-out data", dimension: "applied_ai", detectors: ["ml_training_step", "ml_data_split"] },
  { key: "ml_evaluation", label: "Model evaluation metrics", dimension: "applied_ai", detectors: ["ml_evaluation_metric"] },
  { key: "ml_reproducibility", label: "Reproducible models and artifacts", dimension: "applied_ai", detectors: ["ml_reproducibility", "ml_artifact_versioning", "ml_inference_mode"] },
];

export const DIMENSIONS: Array<{ id: DimensionId; label: string; question: string; optional?: boolean }> = [
  { id: "quality", label: "Code quality and testing", question: "Is the work checked, typed and tested?" },
  { id: "reliability", label: "Reliability and safety", question: "Does the code expect things to fail?" },
  { id: "delivery", label: "Delivery", question: "Does the work ship, and keep shipping?" },
  { id: "architecture", label: "Architecture and scope", question: "How is the work structured as it grows?" },
  { id: "communication", label: "Communication", question: "Can someone else pick the work up?" },
  { id: "applied_ai", label: "Applied AI and ML", question: "Are models used with checks around them?", optional: true },
];

const LEVEL_RANK: Record<EvidenceLevel, number> = { insufficient_evidence: 0, limited: 1, developing: 2, strong: 3 };

export const LEVEL_LABEL: Record<EvidenceLevel, string> = {
  strong: "Strong evidence",
  developing: "Developing evidence",
  limited: "Limited evidence",
  insufficient_evidence: "Insufficient evidence",
};

/**
 * Levels describe how much evidence exists, never how good someone is.
 * Strong needs four distinct practices seen across at least two projects,
 * so one large repository or a high commit count cannot reach it alone.
 */
export function levelFor(practiceCount: number, repoCount: number): EvidenceLevel {
  if (practiceCount >= 4 && repoCount >= 2) return "strong";
  if (practiceCount >= 2) return "developing";
  if (practiceCount === 1) return "limited";
  return "insufficient_evidence";
}

export type SynthesisInput = {
  displayName: string;
  githubLogin: string | null;
  projects: PassportProject[];
  activity: RepoActivity[];
  scope: BuilderAnalysisReport["scope"];
  now: Date;
};

export type Synthesis = Omit<BuilderAnalysisReport, "narrative">;

function repoKey(name: string): string {
  return name.toLowerCase();
}

function collectPractices(projects: PassportProject[], activity: RepoActivity[], now: Date): Practice[] {
  const out: Practice[] = [];
  for (const def of PRACTICES) {
    const refs: SignalRef[] = [];
    const repos = new Map<string, string>();
    for (const project of projects) {
      if (!def.detectors) break;
      const hits = project.evidence.filter((e) => def.detectors?.includes(e.detector));
      for (const e of hits.slice(0, 3)) {
        refs.push({ kind: "finding", id: e.id, repo: project.repoFullName, label: e.finding, url: e.sourceUrl || null });
      }
      if (hits.length) repos.set(repoKey(project.repoFullName), project.repoFullName);
    }
    if (def.activity) {
      for (const a of activity) {
        const hit = def.activity(a, now);
        if (!hit) continue;
        refs.push({ kind: "activity", id: `act:${a.repo}:${def.key}`, repo: a.repo, label: hit.label, url: a.url });
        repos.set(repoKey(a.repo), repos.get(repoKey(a.repo)) ?? a.repo);
      }
    }
    if (refs.length) out.push({ key: def.key, label: def.label, repos: [...repos.values()], refs });
  }
  return out;
}

function practiceDef(key: string): PracticeDef {
  const def = PRACTICES.find((p) => p.key === key);
  if (!def) throw new Error(`Unknown practice ${key}`);
  return def;
}

function joinLabels(labels: string[]): string {
  const lower = labels.map((l, i) => (i === 0 ? l : l.charAt(0).toLowerCase() + l.slice(1)));
  if (lower.length <= 1) return lower.join("");
  return `${lower.slice(0, -1).join(", ")} and ${lower[lower.length - 1]}`;
}

function buildDimensions(practices: Practice[], input: SynthesisInput): Dimension[] {
  const deep = input.projects.length;
  const scanned = input.activity.length;
  const dims: Dimension[] = [];
  for (const d of DIMENSIONS) {
    const own = practices.filter((p) => practiceDef(p.key).dimension === d.id).sort((a, b) => b.repos.length - a.repos.length);
    if (d.optional && own.length === 0) continue;
    const repos = new Set(own.flatMap((p) => p.repos.map(repoKey)));
    const level = levelFor(own.length, repos.size);
    const notObserved = PRACTICES.filter((p) => p.dimension === d.id && !own.some((o) => o.key === p.key)).map((p) => p.label);
    const summary =
      level === "insufficient_evidence"
        ? `None of the practices this area looks for were observed in the ${deep + scanned > 0 ? "projects analysed" : "available sources"}. That is missing evidence, not proof they are absent.`
        : `${joinLabels(own.slice(0, 3).map((p) => p.label))} ${own.length > 3 ? `and ${own.length - 3} more ` : ""}observed across ${repos.size} project${repos.size === 1 ? "" : "s"}.`;
    const limits: string[] = [];
    const codeLevel = PRACTICES.some((p) => p.dimension === d.id && p.detectors && !p.activity);
    if (deep === 0 && codeLevel) limits.push("No imported projects, so code-level practices in this area were not checked. Only repository structure and history were read.");
    if (d.id === "communication" && !input.activity.some((a) => a.commits?.messages)) limits.push("No commit history could be read, so commit messages were not assessed.");
    if (d.id === "delivery" && !input.githubLogin) limits.push("No GitHub username is linked, so release and commit activity were not read.");
    dims.push({ id: d.id, label: d.label, question: d.question, level, summary, practices: own, notObserved, limits });
  }
  return dims;
}

function buildStrengths(dimensions: Dimension[]): Strength[] {
  return dimensions
    .filter((d) => d.level === "strong" || d.level === "developing")
    .sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || b.practices.length - a.practices.length)
    .slice(0, 4)
    .map((d) => {
      const top = d.practices.slice(0, 3);
      const repos = new Set(d.practices.flatMap((p) => p.repos.map(repoKey)));
      return {
        id: `strength:${d.id}`,
        title: d.label,
        detail: `${joinLabels(top.map((p) => p.label))}, seen in ${repos.size} project${repos.size === 1 ? "" : "s"}.`,
        dimension: d.id,
        refs: top.flatMap((p) => p.refs.slice(0, 2)),
      };
    });
}

function buildPatterns(practices: Practice[], totalProjects: number): RecurringPattern[] {
  return practices
    .filter((p) => p.repos.length >= 2)
    .sort((a, b) => b.repos.length - a.repos.length)
    .slice(0, 6)
    .map((p) => ({
      id: `pattern:${p.key}`,
      title: p.label,
      detail: `Seen in ${p.repos.length} of ${totalProjects} projects analysed, so it is a habit rather than a one-off.`,
      repos: p.repos,
      refs: p.refs.slice(0, 4),
    }));
}

function buildGrowth(input: SynthesisInput, practices: Practice[]): GrowthItem[] {
  const has = (key: string) => practices.some((p) => p.key === key);
  const items: GrowthItem[] = [];

  const grouped = new Map<string, { first: ReturnType<typeof developmentFeedback>[number]; repos: string[]; refs: SignalRef[] }>();
  for (const project of input.projects) {
    for (const item of developmentFeedback(project)) {
      const entry = grouped.get(item.id) ?? { first: item, repos: [], refs: [] };
      entry.repos.push(project.repoFullName);
      for (const id of item.evidenceIds.slice(0, 2)) {
        const e = project.evidence.find((x) => x.id === id);
        if (e) entry.refs.push({ kind: "finding", id: e.id, repo: project.repoFullName, label: e.finding, url: e.sourceUrl || null });
      }
      grouped.set(item.id, entry);
    }
  }
  for (const [id, { first, repos, refs }] of [...grouped.entries()].sort((a, b) => b[1].repos.length - a[1].repos.length)) {
    items.push({
      id: `growth:${id}`,
      title: first.title,
      observation: repos.length > 1 ? `${first.observation} The same gap appears in ${repos.length} projects.` : first.observation,
      whyItMatters: first.implication,
      nextStep: first.nextStep,
      basis: "observation",
      repos,
      refs: refs.slice(0, 4),
    });
  }

  const withMessages = input.activity.filter((a) => a.commits?.messages);
  const sampled = withMessages.reduce((n, a) => n + (a.commits?.messages?.sampled ?? 0), 0);
  if (sampled >= 20) {
    const descriptive = withMessages.reduce((n, a) => n + ((a.commits?.messages?.descriptivePct ?? 0) * (a.commits?.messages?.sampled ?? 0)) / 100, 0);
    const pct = Math.round((descriptive / sampled) * 100);
    if (pct < 40) {
      items.push({
        id: "growth:commit_messages",
        title: "Commit messages rarely say what changed",
        observation: `${pct}% of ${sampled} sampled commit subjects describe the change. The rest are short or generic, such as "update" or "fix".`,
        whyItMatters: "Reviewers and future you read history to understand why code looks the way it does. Generic subjects make that history unusable.",
        nextStep: "Write each subject as what changed and where, for example \"Retry webhook delivery on 5xx responses\". Split unrelated changes into separate commits.",
        basis: "observation",
        repos: withMessages.filter((a) => (a.commits?.messages?.descriptivePct ?? 100) < 40).map((a) => a.repo),
        refs: withMessages.slice(0, 3).map((a) => ({ kind: "activity", id: `act:${a.repo}:commit_sample`, repo: a.repo, label: `${a.commits?.messages?.descriptivePct}% descriptive of ${a.commits?.messages?.sampled} sampled`, url: a.url })),
      });
    }
  }

  const withReadme = input.activity.filter((a) => a.readme);
  const thin = withReadme.filter((a) => (a.readme?.chars ?? 0) < 300 || !a.readme?.hasSetup);
  if (withReadme.length >= 2 && thin.length / withReadme.length >= 0.5) {
    items.push({
      id: "growth:readme",
      title: "Most projects cannot be run from their README",
      observation: `${thin.length} of ${withReadme.length} scanned repositories have no README or no setup instructions.`,
      whyItMatters: "A reviewer who cannot run the project in a few minutes usually stops looking. Setup steps are the cheapest proof the work runs.",
      nextStep: "Add a README to your two most important projects with what it does, how to install and run it, and how to run the tests.",
      basis: "observation",
      repos: thin.map((a) => a.repo),
      refs: thin.slice(0, 3).map((a) => ({ kind: "activity", id: `act:${a.repo}:readme`, repo: a.repo, label: a.readme?.chars ? `README is ${a.readme.chars} characters without setup steps` : "No README", url: a.url })),
    });
  }

  const measured = input.activity.filter((a) => a.structure && a.structure.sourceFiles >= 10);
  if (!has("tests_present") && (measured.length >= 2 || input.projects.length >= 1) && !grouped.has("tests_missing")) {
    items.push({
      id: "growth:no_tests",
      title: "No automated tests were found",
      observation: `No test files or test suites were found in the ${measured.length + input.projects.length} sources checked.`,
      whyItMatters: "Tests are how a team trusts a change without re-reading everything. Their absence is the first thing most reviewers check.",
      nextStep: "Pick your most-used project and add tests for its core path and one failure case, then run them in CI.",
      basis: "observation",
      repos: measured.map((a) => a.repo),
      refs: [],
    });
  }

  if (!has("ci") && measured.some((a) => (a.structure?.sourceFiles ?? 0) >= 20)) {
    items.push({
      id: "growth:no_ci",
      title: "Nothing runs checks automatically",
      observation: "No CI workflow was found in any scanned repository with more than 20 source files.",
      whyItMatters: "CI turns tests and linting from intentions into guarantees on every change.",
      nextStep: "Add a GitHub Actions workflow that installs dependencies, lints and runs tests on every push.",
      basis: "observation",
      repos: measured.filter((a) => (a.structure?.sourceFiles ?? 0) >= 20).map((a) => a.repo),
      refs: [],
    });
  }

  const bursts = input.activity.filter((a) => a.commits && a.commits.byYou > 0 && a.commits.activeWeeks <= 1);
  if (input.activity.length >= 5 && bursts.length / input.activity.length >= 0.6) {
    items.push({
      id: "growth:short_bursts",
      title: "Many projects stop after a first burst",
      observation: `${bursts.length} of ${input.activity.length} scanned repositories have all of your sampled commits inside a single week.`,
      whyItMatters: "Depth over time shows how someone handles maintenance, feedback and change, which short projects cannot show.",
      nextStep: "Choose one project to keep developing for a month: add a feature someone asked for, fix a bug report, and write down the decisions.",
      basis: "inference",
      repos: bursts.map((a) => a.repo),
      refs: bursts.slice(0, 3).map((a) => ({ kind: "activity", id: `act:${a.repo}:burst`, repo: a.repo, label: `${a.commits?.byYou} commits in one week`, url: a.url })),
    });
  }

  return items.sort((a, b) => (a.basis === b.basis ? 0 : a.basis === "observation" ? -1 : 1)).slice(0, 5);
}

function buildWorkingStyle(dimensions: Dimension[], practices: Practice[], input: SynthesisInput): WorkingStyle {
  const dim = (id: DimensionId) => dimensions.find((d) => d.id === id);
  const rank = (id: DimensionId) => LEVEL_RANK[dim(id)?.level ?? "insufficient_evidence"];
  const has = (key: string) => practices.some((p) => p.key === key);
  const reasonsFor = (id: DimensionId) =>
    (dim(id)?.practices ?? []).slice(0, 3).map((p) => `${p.label} in ${p.repos.length} project${p.repos.length === 1 ? "" : "s"}`);
  const languages = new Set(
    [...input.activity.map((a) => a.language), ...input.projects.map((p) => p.primaryLanguage)].filter((l): l is string => !!l),
  );

  const candidates: Array<WorkingStyle & { score: number }> = [];
  const add = (score: number, id: string, label: string, description: string, reasons: string[]) =>
    candidates.push({ id, label, description, reasons, basis: "inference", score });

  if (rank("reliability") >= 2)
    add(rank("reliability") * 10 + (dim("reliability")?.practices.length ?? 0), "reliability_minded", "Reliability-minded builder",
      "Writes code that expects failure: retries, timeouts and guarded writes show up repeatedly.", reasonsFor("reliability"));
  if (rank("quality") >= 2 && has("failure_tests"))
    add(rank("quality") * 10 + (dim("quality")?.practices.length ?? 0), "test_minded", "Test-minded engineer",
      "Checks work with tests, including the paths where things go wrong.", reasonsFor("quality"));
  if (rank("delivery") >= 2 && has("ci") && (has("releases") || has("sustained")))
    add(rank("delivery") * 10 + (dim("delivery")?.practices.length ?? 0), "steady_shipper", "Steady shipper",
      "Ships work through automated checks and keeps coming back to it.", reasonsFor("delivery"));
  if (rank("communication") >= 3)
    add(30 + (dim("communication")?.practices.length ?? 0), "clear_communicator", "Clear communicator",
      "Leaves work that others can pick up: documented setup and readable history.", reasonsFor("communication"));
  if (rank("applied_ai") >= 2)
    add(rank("applied_ai") * 10 + (dim("applied_ai")?.practices.length ?? 0) + (has("llm_validation") || has("ml_evaluation") ? 2 : 0), "applied_ai", "Applied AI builder",
      "Builds with models and puts checks around them.", reasonsFor("applied_ai"));
  if (rank("architecture") >= 3)
    add(30 + (dim("architecture")?.practices.length ?? 0), "structurer", "Systems structurer",
      "Gives growing projects a clear structure: validated boundaries, contracts and modules.", reasonsFor("architecture"));
  if (input.activity.length >= 5 && languages.size >= 3 && !dimensions.some((d) => d.level === "strong"))
    add(15, "explorer", "Broad explorer",
      "Tries many tools and languages across many projects, with depth still forming.",
      [`${input.activity.length} public repositories`, `${languages.size} primary languages: ${[...languages].slice(0, 4).join(", ")}`]);

  const best = candidates.sort((a, b) => b.score - a.score)[0];
  if (best) {
    const { score: _score, ...style } = best;
    void _score;
    return style;
  }
  if (practices.length < 3)
    return {
      id: "early_record", label: "Early record",
      description: "There is not yet enough observable work to describe a working style.",
      reasons: [`${practices.length} practice${practices.length === 1 ? "" : "s"} observed across all sources`],
      basis: "inference",
    };
  return {
    id: "generalist", label: "Generalist builder",
    description: "Works across several areas without one clearly leading.",
    reasons: dimensions.filter((d) => d.level !== "insufficient_evidence").map((d) => `${d.label}: ${LEVEL_LABEL[d.level].toLowerCase()}`),
    basis: "inference",
  };
}

function buildProjects(input: SynthesisInput, practices: Practice[]): ProjectBreakdown[] {
  const byRepo = new Map<string, ProjectBreakdown>();
  for (const p of input.projects) {
    byRepo.set(repoKey(p.repoFullName), {
      repo: p.repoFullName,
      url: p.htmlUrl || null,
      depth: "deep",
      language: p.primaryLanguage,
      description: null,
      findings: p.evidence.length,
      practices: [],
      commitsByYou: null,
      activeWeeks: null,
      lastActiveAt: null,
    });
  }
  for (const a of input.activity) {
    const existing = byRepo.get(repoKey(a.repo));
    const row: ProjectBreakdown = existing ?? {
      repo: a.repo, url: a.url, depth: "scan", language: a.language, description: null, findings: 0, practices: [],
      commitsByYou: null, activeWeeks: null, lastActiveAt: null,
    };
    row.description = a.description;
    row.language = row.language ?? a.language;
    row.commitsByYou = a.commits?.byYou ?? null;
    row.activeWeeks = a.commits?.activeWeeks ?? null;
    row.lastActiveAt = a.commits?.lastAt ?? a.pushedAt;
    byRepo.set(repoKey(a.repo), row);
  }
  for (const p of practices) {
    for (const repo of p.repos) byRepo.get(repoKey(repo))?.practices.push(p.label);
  }
  return [...byRepo.values()].sort((a, b) =>
    a.depth !== b.depth ? (a.depth === "deep" ? -1 : 1) : b.practices.length - a.practices.length || (b.lastActiveAt ?? "").localeCompare(a.lastActiveAt ?? ""),
  );
}

function buildMonths(activity: RepoActivity[], now: Date): Array<{ month: string; commits: number }> {
  const months: Array<{ month: string; commits: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = d.toISOString().slice(0, 7);
    months.push({ month: key, commits: activity.reduce((n, a) => n + (a.commits?.months[key] ?? 0), 0) });
  }
  return months;
}

function buildHeadline(style: WorkingStyle, dimensions: Dimension[]): string {
  const ranked = [...dimensions].sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || b.practices.length - a.practices.length);
  const top = ranked.filter((d) => LEVEL_RANK[d.level] >= 2).slice(0, 2).map((d) => d.label.toLowerCase());
  const low = ranked.filter((d) => d.level === "insufficient_evidence" || d.level === "limited").slice(-1)[0];
  if (!top.length) return `${style.label}. Not enough evidence yet to name a strongest area.`;
  return `${style.label}. Most evidence in ${top.join(" and ")}${low ? `; least in ${low.label.toLowerCase()}` : ""}.`;
}

function buildLimits(input: SynthesisInput): string[] {
  const limits = [
    "Levels describe how much evidence was found, not how good you are. Missing evidence is not proof a practice is absent.",
    "Code practices are found by pattern matching on source files and can miss practices written in unusual ways.",
    "Only public repositories and projects you imported were read. Private work, work at employers and code review are not visible.",
  ];
  if (input.githubLogin)
    limits.push("Commits are matched to your GitHub username by GitHub. Squashed, co-authored or differently attributed commits may be missing, and at most 100 recent commits per repository were sampled.");
  if (input.scope.forksExcluded) limits.push(`${input.scope.forksExcluded} forked repositor${input.scope.forksExcluded === 1 ? "y was" : "ies were"} excluded because most of their history belongs to others.`);
  if (input.scope.skipped.length) limits.push(`${input.scope.skipped.length} repositor${input.scope.skipped.length === 1 ? "y was" : "ies were"} not scanned: see the scope section.`);
  return limits;
}

export function synthesize(input: SynthesisInput): Synthesis {
  const practices = collectPractices(input.projects, input.activity, input.now);
  const dimensions = buildDimensions(practices, input);
  const totalProjects = new Set([...input.projects.map((p) => repoKey(p.repoFullName)), ...input.activity.map((a) => repoKey(a.repo))]).size;
  const workingStyle = buildWorkingStyle(dimensions, practices, input);
  return {
    version: BUILDER_ANALYSIS_VERSION,
    generatedAt: input.now.toISOString(),
    subject: { displayName: input.displayName, githubLogin: input.githubLogin },
    scope: input.scope,
    headline: buildHeadline(workingStyle, dimensions),
    workingStyle,
    dimensions,
    strengths: buildStrengths(dimensions),
    patterns: buildPatterns(practices, totalProjects),
    growth: buildGrowth(input, practices),
    projects: buildProjects(input, practices),
    activityByMonth: buildMonths(input.activity, input.now),
    limits: buildLimits(input),
    activity: input.activity,
  };
}

/** Every ref id the report can cite, used to validate model narrative. */
export function citableIds(s: Synthesis): Set<string> {
  const ids = new Set<string>();
  for (const d of s.dimensions) for (const p of d.practices) for (const r of p.refs) ids.add(r.id);
  for (const g of s.growth) for (const r of g.refs) ids.add(r.id);
  for (const d of s.dimensions) ids.add(`dimension:${d.id}`);
  for (const g of s.growth) ids.add(g.id);
  for (const st of s.strengths) ids.add(st.id);
  for (const p of s.patterns) ids.add(p.id);
  return ids;
}
