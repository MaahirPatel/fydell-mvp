/**
 * Evidence ledger for one Builder Analysis run. Pure.
 *
 * Every entry is one thing the report can point to: a cited code finding from
 * an analyzed snapshot, or a measurement of public repository history. Each
 * entry keeps eight verification facets apart instead of collapsing them into
 * one "verified" badge, because a static read of code says nothing about
 * whether its tests ran, whether it behaves in production, or who wrote it.
 */

import { currentSnapshots } from "@/lib/passport/snapshots";
import type { PassportProject } from "@/lib/passport/view";
import { PRACTICES, LEVEL_LABEL, type Synthesis } from "./synthesize";
import type { DimensionId, EvidenceLevel, RepoActivity } from "./types";

export const LEDGER_VERSION = "ledger-v1";

export const FACETS = [
  "code_exists",
  "code_inspected",
  "tests_exist",
  "tests_executed",
  "tests_passed",
  "production_observed",
  "contribution_claimed",
  "attribution_supported",
] as const;
export type Facet = (typeof FACETS)[number];

export const FACET_LABEL: Record<Facet, string> = {
  code_exists: "Code exists",
  code_inspected: "Code inspected",
  tests_exist: "Tests exist",
  tests_executed: "Tests executed",
  tests_passed: "Tests passed",
  production_observed: "Production behaviour observed",
  contribution_claimed: "Engineer claims the contribution",
  attribution_supported: "Attribution supported",
};

/**
 * observed: Fydell saw it in this run's inputs. not_observed: Fydell looked
 * and did not find it. claimed: the engineer says so; Fydell has not checked.
 * not_assessed: this run had no way to look. Only "observed" is Fydell's own
 * observation; nothing else may be presented as one.
 */
export type FacetState = "observed" | "not_observed" | "claimed" | "not_assessed";
export type FacetValue = { state: FacetState; detail: string };

export type LedgerEvidenceRef =
  | { kind: "code"; repo: string; path: string; startLine: number; endLine: number; url: string | null }
  | { kind: "activity"; repo: string; measure: string; url: string | null };

export type LedgerEntry = {
  /** Stable for the same finding at the same revision, or the same measurement of the same repository. */
  id: string;
  claim: string;
  evidence: LedgerEvidenceRef;
  source: { repo: string; revision: string | null; snapshotId: string | null; analysisVersion: string | null };
  basis: "observation" | "inference";
  capability: { practice: string; practiceLabel: string; dimension: DimensionId };
  limitations: string[];
  verification: Record<Facet, FacetValue>;
};

const NOT_RUN = "Fydell does not run imported code in this analysis.";
const NO_PRODUCTION = "No production system was observed.";

function practiceForDetector(detector: string): { key: string; label: string; dimension: DimensionId } | null {
  const def = PRACTICES.find((p) => p.detectors?.includes(detector));
  return def ? { key: def.key, label: def.label, dimension: def.dimension } : null;
}

function contributionFacet(project: PassportProject): FacetValue {
  return project.contributionStatement.trim()
    ? { state: "claimed", detail: "The engineer wrote a contribution statement for this project. Fydell has not checked it." }
    : { state: "not_observed", detail: "No contribution statement was written for this project." };
}

function attributionFacet(project: PassportProject): FacetValue {
  return {
    state: "not_assessed",
    detail:
      project.sourceKind === "upload"
        ? "Uploaded code has no commit history, so who wrote it was not assessed."
        : "Repository analysis reads code at a commit; it does not establish who wrote the cited lines.",
  };
}

function codeEntries(project: PassportProject): LedgerEntry[] {
  const hasTests = project.evidence.some((e) => e.detector === "test_suite");
  const out: LedgerEntry[] = [];
  for (const e of project.evidence) {
    const practice = practiceForDetector(e.detector);
    if (!practice) continue;
    const revision = project.commitSha || null;
    out.push({
      id: e.id,
      claim: e.finding,
      evidence: { kind: "code", repo: project.repoFullName, path: e.path, startLine: e.startLine, endLine: e.endLine, url: e.sourceUrl || null },
      source: { repo: project.repoFullName, revision, snapshotId: project.id ?? null, analysisVersion: project.analysisVersion ?? null },
      basis: "observation",
      capability: { practice: practice.key, practiceLabel: practice.label, dimension: practice.dimension },
      limitations: e.limitations,
      verification: {
        code_exists: { state: "observed", detail: `Lines ${e.startLine}-${e.endLine} of ${e.path} exist at revision ${(revision ?? "").slice(0, 7)}.` },
        code_inspected: { state: "observed", detail: "Matched by a pattern rule and the citation was checked against the file. Not a human code review." },
        tests_exist: hasTests
          ? { state: "observed", detail: "The analyzed files of this project include automated tests." }
          : { state: "not_observed", detail: "No test suite was found in the analyzed files of this project." },
        tests_executed: { state: "not_assessed", detail: NOT_RUN },
        tests_passed: { state: "not_assessed", detail: NOT_RUN },
        production_observed: { state: "not_assessed", detail: NO_PRODUCTION },
        contribution_claimed: contributionFacet(project),
        attribution_supported: attributionFacet(project),
      },
    });
  }
  return out;
}

function activityEntries(activity: RepoActivity[], practiceRefs: Map<string, { key: string; label: string; dimension: DimensionId }>, githubLogin: string | null): LedgerEntry[] {
  const out: LedgerEntry[] = [];
  for (const a of activity) {
    for (const [refId, practice] of practiceRefs) {
      if (!refId.startsWith(`act:${a.repo}:`)) continue;
      const commitBased = practice.key === "sustained" || practice.key === "recent" || practice.key === "commit_messages" || practice.key === "conventional_commits";
      out.push({
        id: refId,
        claim: `${practice.label} (repository measurement).`,
        evidence: { kind: "activity", repo: a.repo, measure: practice.key, url: a.url },
        source: { repo: a.repo, revision: a.pushedAt ? `pushed ${a.pushedAt}` : null, snapshotId: null, analysisVersion: null },
        basis: "observation",
        capability: { practice: practice.key, practiceLabel: practice.label, dimension: practice.dimension },
        limitations: ["Measured from public repository metadata and at most 100 recent commits; code was not read."],
        verification: {
          code_exists: { state: "not_assessed", detail: "Repository structure and history only; source lines were not cited." },
          code_inspected: { state: "not_assessed", detail: "Only file names, metadata and commit history were read." },
          tests_exist: (a.structure?.testFiles ?? 0) > 0
            ? { state: "observed", detail: `${a.structure?.testFiles} test files in the repository tree.` }
            : a.structure
              ? { state: "not_observed", detail: "No test files in the repository tree." }
              : { state: "not_assessed", detail: "The repository tree could not be read." },
          tests_executed: { state: "not_assessed", detail: NOT_RUN },
          tests_passed: { state: "not_assessed", detail: NOT_RUN },
          production_observed: { state: "not_assessed", detail: NO_PRODUCTION },
          contribution_claimed: { state: "not_observed", detail: "Scanned repositories carry no contribution statement." },
          attribution_supported: commitBased && githubLogin
            ? { state: "observed", detail: `GitHub attributes the sampled commits to ${githubLogin}. This does not establish who wrote specific lines.` }
            : { state: "not_assessed", detail: "This measurement does not depend on who made the commits." },
        },
      });
    }
  }
  return out;
}

/** Every entry the report cites, in a stable order. */
export function buildLedger(s: Synthesis, input: { projects: PassportProject[]; activity: RepoActivity[] }): LedgerEntry[] {
  const activityRefs = new Map<string, { key: string; label: string; dimension: DimensionId }>();
  for (const d of s.dimensions) {
    for (const p of d.practices) for (const r of p.refs) if (r.kind === "activity") activityRefs.set(r.id, { key: p.key, label: p.label, dimension: d.id });
  }
  const entries = [...currentSnapshots(input.projects).flatMap(codeEntries), ...activityEntries(input.activity, activityRefs, s.subject.githubLogin)];
  const seen = new Set<string>();
  return entries.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true))).sort((a, b) => a.id.localeCompare(b.id));
}

/* ------------------------------------------------------------------ */
/* Capability statements                                                */
/* ------------------------------------------------------------------ */

export type CapabilityStatement = {
  dimension: DimensionId;
  label: string;
  level: EvidenceLevel;
  /** What was observed, where, and at which revision. Empty when nothing was. */
  observed: string;
  /** The engineer's own statements, kept apart from observations. */
  claimed: string;
  /** What this run could not look at. Never a negative finding. */
  notAssessed: string[];
  entryIds: string[];
};

function short(rev: string | null): string {
  if (!rev) return "an unknown revision";
  return /^[0-9a-f]{40}$/.test(rev) ? rev.slice(0, 7) : rev;
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * One sentence group per capability area, built only from ledger entries:
 * "Reliability and safety: retries with backoff cited in acme/api at
 * revision 1a2b3c4. Tests were not run. Production behaviour was not observed."
 */
export function capabilityStatements(s: Synthesis, ledger: LedgerEntry[]): CapabilityStatement[] {
  return s.dimensions.map((d) => {
    const entries = ledger.filter((e) => e.capability.dimension === d.id);
    const code = entries.filter((e) => e.evidence.kind === "code");
    const activity = entries.filter((e) => e.evidence.kind === "activity");
    const parts: string[] = [];
    const byRepo = new Map<string, { revision: string | null; practices: Set<string>; lines: number }>();
    for (const e of code) {
      const row = byRepo.get(e.source.repo) ?? { revision: e.source.revision, practices: new Set<string>(), lines: 0 };
      row.practices.add(e.capability.practiceLabel.toLowerCase());
      row.lines += 1;
      byRepo.set(e.source.repo, row);
    }
    for (const [repo, row] of byRepo) {
      parts.push(`${joinList([...row.practices])} cited in ${repo} at revision ${short(row.revision)} (${row.lines} cited location${row.lines === 1 ? "" : "s"})`);
    }
    const measured = [...new Set(activity.map((e) => e.capability.practiceLabel.toLowerCase()))];
    if (measured.length) parts.push(`${joinList(measured)} measured from the history of ${new Set(activity.map((e) => e.source.repo)).size} public repositor${new Set(activity.map((e) => e.source.repo)).size === 1 ? "y" : "ies"}`);
    const observed = parts.length ? `${parts.join("; ")}.`.replace(/^./, (c) => c.toUpperCase()) : "";
    const claimedRepos = [...new Set(code.filter((e) => e.verification.contribution_claimed.state === "claimed").map((e) => e.source.repo))];
    const claimed = claimedRepos.length
      ? `The engineer states a contribution to ${joinList(claimedRepos)}. Fydell has not checked which cited lines that covers.`
      : "";
    const notAssessed: string[] = [];
    if (code.length) {
      notAssessed.push("Tests were not run, so whether they pass is not assessed.");
      notAssessed.push("Production behaviour was not observed.");
      notAssessed.push("Who wrote the cited lines was not assessed.");
    }
    if (!entries.length) notAssessed.push(`No evidence for this area was observed in the sources read (${LEVEL_LABEL[d.level].toLowerCase()}). This is not evidence of inability.`);
    for (const l of d.limits) notAssessed.push(l);
    return { dimension: d.id, label: d.label, level: d.level, observed, claimed, notAssessed, entryIds: entries.map((e) => e.id) };
  });
}

/* ------------------------------------------------------------------ */
/* Input snapshot                                                       */
/* ------------------------------------------------------------------ */

export type AnalysisInputSnapshot = {
  githubLogin: string | null;
  projects: Array<{ repo: string; snapshotId: string | null; revision: string; analysisVersion: string | null; findingIds: string[]; contributionStated: boolean }>;
  activity: Array<{ repo: string; pushedAt: string | null; reused: boolean; commitsRead: number | null; errors: string[] }>;
};

/** Exactly what this run read, so the report can be traced and a rerun on the same inputs compared. */
export function inputSnapshot(input: { githubLogin: string | null; projects: PassportProject[]; activity: RepoActivity[] }): AnalysisInputSnapshot {
  return {
    githubLogin: input.githubLogin,
    projects: currentSnapshots(input.projects)
      .map((p) => ({
        repo: p.repoFullName,
        snapshotId: p.id ?? null,
        revision: p.commitSha,
        analysisVersion: p.analysisVersion ?? null,
        findingIds: p.evidence.map((e) => e.id).sort(),
        contributionStated: p.contributionStatement.trim().length > 0,
      }))
      .sort((a, b) => a.repo.localeCompare(b.repo)),
    activity: input.activity
      .map((a) => ({ repo: a.repo, pushedAt: a.pushedAt, reused: a.reused, commitsRead: a.commits?.byYou ?? null, errors: a.errors }))
      .sort((a, b) => a.repo.localeCompare(b.repo)),
  };
}

/* ------------------------------------------------------------------ */
/* Version comparison                                                   */
/* ------------------------------------------------------------------ */

export type VersionComparison = {
  sameInputs: boolean;
  levelChanges: Array<{ dimension: DimensionId; label: string; from: EvidenceLevel; to: EvidenceLevel }>;
  entriesAdded: string[];
  entriesRemoved: string[];
  projectsAdded: string[];
  projectsRemoved: string[];
  revisionsChanged: Array<{ repo: string; from: string; to: string }>;
};

type Comparable = {
  inputHash: string | null;
  input: AnalysisInputSnapshot | null;
  dimensions: Array<{ id: DimensionId; label: string; level: EvidenceLevel }>;
  ledgerIds: string[];
};

/** What changed between two stored runs, and whether the inputs did. Wording changes alone never show up here. */
export function compareVersions(before: Comparable, after: Comparable): VersionComparison {
  const levelChanges = after.dimensions.flatMap((d) => {
    const prev = before.dimensions.find((x) => x.id === d.id);
    const from: EvidenceLevel = prev?.level ?? "insufficient_evidence";
    return from === d.level ? [] : [{ dimension: d.id, label: d.label, from, to: d.level }];
  });
  const prevIds = new Set(before.ledgerIds);
  const nextIds = new Set(after.ledgerIds);
  const prevProjects = new Map((before.input?.projects ?? []).map((p) => [p.repo.toLowerCase(), p]));
  const nextProjects = new Map((after.input?.projects ?? []).map((p) => [p.repo.toLowerCase(), p]));
  return {
    sameInputs: !!before.inputHash && before.inputHash === after.inputHash,
    levelChanges,
    entriesAdded: after.ledgerIds.filter((id) => !prevIds.has(id)),
    entriesRemoved: before.ledgerIds.filter((id) => !nextIds.has(id)),
    projectsAdded: [...nextProjects.values()].filter((p) => !prevProjects.has(p.repo.toLowerCase())).map((p) => p.repo),
    projectsRemoved: [...prevProjects.values()].filter((p) => !nextProjects.has(p.repo.toLowerCase())).map((p) => p.repo),
    revisionsChanged: [...nextProjects.values()].flatMap((p) => {
      const prev = prevProjects.get(p.repo.toLowerCase());
      return prev && prev.revision !== p.revision ? [{ repo: p.repo, from: prev.revision, to: p.revision }] : [];
    }),
  };
}
