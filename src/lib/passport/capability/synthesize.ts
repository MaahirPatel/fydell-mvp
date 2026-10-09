import { createHash } from "node:crypto";
import { canonicalJson } from "@/lib/profile-evidence/contract";
import { claimDetectors } from "../github/entailment";
import type { ContributionContext, DecisionRecord } from "../context-contract";
import { RELATIONSHIP_LABEL } from "../context-contract";
import type { PassportEvidence, PassportProject } from "../view";
import type { Correction, CorrectionKind } from "../corrections";
import { assessAttribution, pathSignal } from "./attribution";
import { READ_ONLY_CHECKS, ROLE_REQUIREMENTS, TEST_DETECTORS, phrase, requirementsFor } from "./catalog";
import {
  CAPABILITY_SCHEMA_VERSION,
  type Attribution,
  type CapabilityEntry,
  type CapabilityEvidence,
  type CapabilityGroup,
  type CapabilityReview,
  type ContributionEvidenceItem,
  type ContributionStatus,
  type EngineerStatement,
  type EnrichmentRecord,
  type EvidenceBasis,
  type ProjectObservation,
  type RequirementCoverage,
  type RequirementSet,
  type ReviewerJudgment,
  type SupportedRole,
  type TaskDemonstration,
  type UnansweredQuestion,
} from "./types";

export type ReviewInput = {
  project: PassportProject;
  contribution: ContributionContext | null;
  decisions?: DecisionRecord[];
  /** The engineer's notes and corrections on this snapshot's findings. Shown beside a finding; they never change it. */
  corrections?: Correction[];
  taskDemonstrations?: TaskDemonstration[];
  reviewerJudgments?: ReviewerJudgment[];
  /** Other current projects of the same engineer, used to count identical code once. */
  otherProjects?: PassportProject[];
  /** Repository description from the host, when known. Untrusted text, shown as the project's own description. */
  description?: string | null;
  roles?: SupportedRole[];
};

/** Checked model output, keyed by capability id. It may reword or narrow an entry, never add one or widen it. */
export type ReviewOverrides = {
  entries: Record<string, { title?: string; what?: string; followUp?: string; narrowed?: string }>;
  record: EnrichmentRecord;
};

const CORRECTION_LABEL: Record<CorrectionKind, string> = {
  context: "Context from the engineer",
  inaccurate: "Engineer says this finding is inaccurate",
  correction: "Correction proposed by the engineer",
};

const NOT_RUN = "Fydell read this code and did not run it.";
const TEST_NOT_RUN = "Read, not run: this shows the test exists and what it asserts, not that it passes.";

function hash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

const lines = (s: number, e: number) => (s === e ? `L${s}` : `L${s}-${e}`);
const loc = (e: { path: string; startLine: number; endLine: number }) => `${e.path} ${lines(e.startLine, e.endLine)}`;

function excerptKey(e: PassportEvidence): string {
  const body = e.excerpt.map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
  return `${e.detector}:${hash(body).slice(0, 16)}`;
}

function commitUrl(project: PassportProject, sha: string): string | null {
  return project.sourceKind === "upload" || !project.htmlUrl ? null : `${project.htmlUrl.replace(/\/$/, "")}/commit/${sha}`;
}

function contributionStatus(a: Attribution, linked: boolean, stated: boolean): ContributionStatus {
  if (a.relationship === "reference") return "reference_project";
  if (linked) return "linked_by_commits";
  if (a.automatic.some((r) => r.reason === "no_history")) return stated ? "stated_only" : "no_history";
  return stated ? "stated_only" : "not_linked";
}

function statementText(c: ContributionContext | null): string {
  if (!c) return "";
  return [c.workedOn, c.problem, c.inherited ? `Inherited: ${c.inherited}` : ""].filter(Boolean).join(" ").trim();
}

function layers(input: ReviewInput, attribution: Attribution) {
  const { project, contribution } = input;
  const projectObservations: ProjectObservation[] = project.evidence.map((e) => {
    const ent = e.entailment ?? null;
    const p = phrase(e.detector, e.finding, ent?.symbol ?? null);
    return {
      findingId: e.id,
      detector: e.detector,
      statement: `This snapshot ${p.observation} (${loc(e)}).`,
      path: e.path,
      startLine: e.startLine,
      endLine: e.endLine,
      revision: project.commitSha,
      sourceUrl: e.sourceUrl || null,
      symbol: ent?.symbol ?? null,
      basis: "inspected_code",
      status: ent?.status ?? "supported",
      narrowedBecause: ent?.status === "narrowed" ? ent.checks.map((c) => c.detail) : [],
      executed: false,
    };
  });

  const contributionEvidence: ContributionEvidenceItem[] = [];
  const signals = project.contributionSignals;
  if (project.sourceKind === "upload") {
    contributionEvidence.push({ kind: "no_history", path: null, detail: "Uploaded code has no commit history.", commit: null, strength: "none" });
  } else if (!signals || signals.checked !== "checked") {
    contributionEvidence.push({ kind: "not_checked", path: null, detail: attribution.summary, commit: null, strength: "none" });
  } else {
    if (!signals.ownerMatchesLogin) {
      contributionEvidence.push({ kind: "repository_owner", path: null, detail: `Repository owner ${signals.repositoryOwner} is not the engineer's named GitHub account ${signals.login ?? ""}.`, commit: null, strength: "none" });
    }
    if (signals.fork || project.isFork) {
      contributionEvidence.push({ kind: "fork", path: null, detail: "The repository is a fork of another project.", commit: null, strength: "none" });
    }
    for (const p of signals.paths) {
      contributionEvidence.push({
        kind: "commits_on_path",
        path: p.path,
        detail: p.commitsByLogin > 0 ? `${p.commitsByLogin}${p.commitsByLogin >= 20 ? "+" : ""} commit${p.commitsByLogin === 1 ? "" : "s"} by ${signals.login} touch this file.` : `No commits by ${signals.login} touch this file.`,
        commit: p.latest ? { ...p.latest, url: commitUrl(project, p.latest.sha) } : null,
        strength: p.commitsByLogin > 0 ? "signal" : "none",
      });
    }
  }

  const engineerStatements: EngineerStatement[] = [];
  if (contribution && contribution.relationship !== "unspecified") {
    engineerStatements.push({ kind: "relationship", label: "Relationship to the project", text: RELATIONSHIP_LABEL[contribution.relationship], findingIds: [], version: contribution.version, updatedAt: contribution.updatedAt });
  }
  const said = statementText(contribution) || project.contributionStatement.trim();
  if (said) {
    engineerStatements.push({
      kind: "contribution",
      label: "Contribution, in the engineer's words",
      text: said,
      findingIds: (contribution?.evidenceRefs ?? []).flatMap((r) => (r.findingId ? [r.findingId] : [])),
      version: contribution?.version ?? null,
      updatedAt: contribution?.updatedAt ?? null,
    });
  }
  for (const d of input.decisions ?? []) {
    if (d.withdrawnAt) continue;
    engineerStatements.push({ kind: "decision", label: d.title, text: [d.problem, d.choice].filter(Boolean).join(" "), findingIds: d.evidenceRefs.flatMap((r) => (r.findingId ? [r.findingId] : [])), version: d.version, updatedAt: d.updatedAt });
  }
  const findingIds = new Set(project.evidence.map((e) => e.id));
  for (const c of input.corrections ?? []) {
    if (!findingIds.has(c.findingId) || (c.projectId && project.id && c.projectId !== project.id)) continue;
    engineerStatements.push({
      kind: "correction",
      label: CORRECTION_LABEL[c.kind],
      text: c.proposedInterpretation ? `${c.reason} Should read: ${c.proposedInterpretation}` : c.reason,
      findingIds: [c.findingId],
      version: null,
      updatedAt: c.resolvedAt ?? c.withdrawnAt ?? c.createdAt,
      status: c.withdrawnAt ? "withdrawn" : c.status,
      noteId: c.id,
    });
  }

  return {
    projectObservations,
    contributionEvidence,
    taskDemonstrations: input.taskDemonstrations ?? [],
    engineerStatements,
    reviewerJudgments: input.reviewerJudgments ?? [],
  };
}

export function capabilityId(project: PassportProject, key: string): string {
  return `cap_${hash({ project: project.id ?? project.repoFullName, key }).slice(0, 16)}`;
}

/** Entries before overrides, with the excerpt each was built from. Used by model enrichment. */
export function capabilityDrafts(project: PassportProject): Array<{ id: string; evidence: PassportEvidence }> {
  const seen = new Set<string>();
  const out: Array<{ id: string; evidence: PassportEvidence }> = [];
  for (const e of project.evidence) {
    const k = excerptKey(e);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ id: capabilityId(project, k), evidence: e });
  }
  return out;
}

function narrowedQuestion(checks: string[], symbol: string | null): string {
  const name = symbol ? `${symbol}` : "this code";
  if (checks.includes("broken_import")) return "Which function was this test written against, and where is it now?";
  if (checks.includes("skipped_test")) return `Why is "${name}" skipped, and what would make it run?`;
  if (checks.includes("assertion_free_test")) return `What result should "${name}" assert?`;
  if (checks.includes("stub_body")) return `What is left to implement in ${name}(), and what happens today when that path is reached?`;
  if (checks.includes("unused_function")) return `Where is ${name}() meant to be called from?`;
  return "Which code path actually runs this behaviour?";
}

function capabilities(input: ReviewInput, attribution: Attribution, statements: EngineerStatement[], overrides: ReviewOverrides | null): CapabilityEntry[] {
  const { project } = input;
  const login = attribution.login ?? "the named GitHub account";
  const elsewhere = new Map<string, string[]>();
  for (const other of input.otherProjects ?? []) {
    if (other.id && other.id === project.id) continue;
    if (other.repoFullName.toLowerCase() === project.repoFullName.toLowerCase()) continue;
    for (const e of other.evidence) {
      const k = excerptKey(e);
      const list = elsewhere.get(k) ?? [];
      if (!list.includes(other.repoFullName)) list.push(other.repoFullName);
      elsewhere.set(k, list);
    }
  }
  const statedFindings = new Set(statements.flatMap((s) => s.findingIds));
  const stated = statements.some((s) => s.kind === "contribution");

  const byKey = new Map<string, PassportEvidence[]>();
  for (const e of project.evidence) {
    const k = excerptKey(e);
    byKey.set(k, [...(byKey.get(k) ?? []), e]);
  }

  const out: CapabilityEntry[] = [];
  for (const [key, group] of byKey) {
    const e = group[0];
    const id = capabilityId(project, key);
    const o = overrides?.entries[id];
    const ent = e.entailment ?? null;
    const status = ent?.status === "narrowed" || o?.narrowed ? "narrowed" : "supported";
    const symbol = ent?.symbol ?? null;
    const template = phrase(e.detector, e.finding, symbol);
    const p = { title: o?.title ?? template.title, observation: o?.what ?? template.observation, followUp: o?.followUp ?? template.followUp };
    const signal = pathSignal(attribution, e.path);
    const linked = attribution.personClaimsAllowed && (signal?.commitsByLogin ?? 0) > 0;
    const scope: CapabilityEntry["scope"] = linked && status === "supported" ? "person" : "project_only";
    const isTest = TEST_DETECTORS.has(e.detector);
    const cStatus = contributionStatus(attribution, linked, stated);

    const evidence: CapabilityEvidence[] = group.map((g) =>
      isTest
        ? { kind: "test_file", findingId: g.id, path: g.path, startLine: g.startLine, endLine: g.endLine, revision: project.commitSha, url: g.sourceUrl || null, executed: false }
        : { kind: "source_lines", findingId: g.id, path: g.path, startLine: g.startLine, endLine: g.endLine, revision: project.commitSha, url: g.sourceUrl || null },
    );
    if (linked && signal?.latest) evidence.push({ kind: "commit", ...signal.latest, url: commitUrl(project, signal.latest.sha) });
    const ownWords = statements.find((s) => s.kind === "contribution" && s.findingIds.some((id) => group.some((g) => g.id === id)));
    if (ownWords) evidence.push({ kind: "statement", text: ownWords.text });

    const basis: EvidenceBasis[] = ["inspected_code"];
    if (group.some((g) => statedFindings.has(g.id))) basis.push("engineer_statement");
    if ((input.reviewerJudgments ?? []).some((j) => j.findingIds.some((id) => group.some((g) => g.id === id)))) basis.push("reviewer_judgment");

    const contributionText =
      cStatus === "linked_by_commits"
        ? `${signal?.commitsByLogin ?? 0}${(signal?.commitsByLogin ?? 0) >= 20 ? "+" : ""} commit${signal?.commitsByLogin === 1 ? "" : "s"} by ${login} touch ${e.path}${signal?.latest ? `; latest "${signal.latest.subject}"` : ""}.`
        : cStatus === "reference_project"
          ? "The engineer marked this project as reference only."
          : cStatus === "no_history"
            ? "Uploaded code has no history, so nothing links the engineer to these lines."
            : cStatus === "stated_only"
              ? "Only the engineer's statement connects them to this project. No commit history links them to these lines."
              : signal
                ? `No commits by ${login} touch ${e.path}.`
                : attribution.summary;
    const contributionLimits = cStatus === "linked_by_commits" ? attribution.limits.slice(0, 1) : [];

    const limits: string[] = [];
    if (ent?.status === "narrowed") limits.push(...ent.checks.map((c) => c.detail));
    if (o?.narrowed) limits.push(`Model review narrowed this: ${o.narrowed}`);
    if (!ent) limits.push("Analyzed before entailment checks existed; re-analyze to check whether the cited lines are used and reachable.");
    limits.push(isTest ? TEST_NOT_RUN : NOT_RUN);
    for (const l of e.limitations) if (!limits.includes(l)) limits.push(l);
    const also = elsewhere.get(key) ?? [];
    if (also.length) limits.push(`Identical code also appears in ${also.join(", ")}; it counts once.`);

    const result =
      status === "narrowed"
        ? `Narrowed: the lines exist, but ${(ent?.checks[0]?.detail ?? o?.narrowed ?? "they do not carry the claim").replace(/\.$/, "").replace(/^./, (c) => c.toLowerCase())}.`
        : isTest
          ? "The test is present and asserts behaviour. It was not run."
          : "Reading the cited lines shows this behaviour. It was not observed at runtime.";

    const followUp =
      scope === "person"
        ? p.followUp
        : cStatus === "reference_project"
          ? "What, if anything, did you take from this project into your own work?"
          : status === "narrowed"
            ? ent?.status === "narrowed"
              ? narrowedQuestion(ent.checks.map((c) => c.check), symbol)
              : p.followUp
            : `Which parts of ${e.path}, if any, did you write or change?`;

    out.push({
      id,
      scope,
      status,
      detector: e.detector,
      title: p.title,
      specificWork: scope === "person" ? `${login}'s commits touch ${e.path}, where the code ${p.observation} (${lines(e.startLine, e.endLine)}).` : `This snapshot ${p.observation} (${loc(e)}).`,
      evidence,
      basis,
      contribution: { status: cStatus, text: contributionText, limits: contributionLimits },
      result,
      limits,
      followUp,
      requirementIds: requirementsFor(e.detector),
      findingIds: group.map((g) => g.id),
      independentSources: 1,
      alsoSeenIn: also,
      project: project.repoFullName,
    });
  }
  const rank = (c: CapabilityEntry) => (c.scope === "person" ? 0 : 2) + (c.status === "narrowed" ? 4 : 0) + (TEST_DETECTORS.has(c.detector) ? 1 : 0);
  return out.sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
}

function rolesFor(input: ReviewInput, caps: CapabilityEntry[]): SupportedRole[] {
  if (input.roles?.length) return input.roles;
  const roles: SupportedRole[] = ["backend_engineer"];
  if (caps.some((c) => c.detector.startsWith("llm_"))) roles.push("applied_ai_engineer");
  return roles;
}

function coverageFor(
  req: { id: string; label: string; detectors: string[]; whatWouldCount: string },
  caps: CapabilityEntry[],
  contradictions: CapabilityReview["contradictions"],
  tasks: TaskDemonstration[],
): RequirementCoverage {
  const mine = caps.filter((c) => c.requirementIds.includes(req.id));
  const ids = mine.map((c) => c.id);
  const base = { id: req.id, label: req.label, capabilityIds: ids, whatWouldCount: req.whatWouldCount };
  const task = tasks.find((t) => t.executed && t.requirementIds.includes(req.id));
  if (task) return { ...base, coverage: "supports", why: `Task demonstration: ${task.outcome}` };
  if (!req.detectors.length) return { ...base, coverage: "not_assessed", why: "The source analysis has no check for this. A task or interview would be needed." };
  const person = mine.filter((c) => c.scope === "person" && c.status === "supported");
  const personCode = person.filter((c) => !READ_ONLY_CHECKS.has(c.detector));
  if (personCode.length) return { ...base, coverage: "supports", why: `Inspected code in files with the engineer's commits: ${personCode.slice(0, 2).map((c) => c.title).join("; ")}.` };
  if (person.length) return { ...base, coverage: "partially_supports", why: "Tests or CI checks in files with the engineer's commits were read but not run." };
  const contra = contradictions.find((c) => claimDetectors(c.claims).some((d) => req.detectors.includes(d)));
  if (contra && !mine.some((c) => c.status === "supported")) return { ...base, coverage: "contradicted", why: `${contra.detail} (${contra.path} L${contra.line})` };
  if (mine.some((c) => c.status === "narrowed") && !mine.some((c) => c.status === "supported")) {
    return { ...base, coverage: "insufficient_evidence", why: "Matching code exists but was narrowed because the cited lines do not show the behaviour on their own." };
  }
  if (mine.length) return { ...base, coverage: "insufficient_evidence", why: "Seen in the project, but nothing links the engineer to that code." };
  return { ...base, coverage: "insufficient_evidence", why: "Not found in the analyzed files. Absence from one snapshot says nothing about the engineer." };
}

function groupsFrom(caps: CapabilityEntry[], sets: RequirementSet[]): CapabilityGroup[] {
  const out: CapabilityGroup[] = [];
  const used = new Set<string>();
  for (const set of sets) {
    for (const r of set.requirements) {
      const mine = caps.filter((c) => r.capabilityIds.includes(c.id) && !used.has(c.id));
      if (!mine.length) continue;
      for (const c of mine) used.add(c.id);
      const person = mine.filter((c) => c.scope === "person" && c.status === "supported").length;
      out.push({
        requirementId: r.id,
        label: r.label,
        summary:
          person > 0
            ? `${person} of ${mine.length} linked to the engineer by commits.`
            : mine.every((c) => c.status === "narrowed")
              ? "Matching code was narrowed and supports nothing on its own."
              : "Seen in the project only. Nothing links the engineer to it.",
        coverage: r.coverage,
        basis: [...new Set(mine.flatMap((c) => c.basis))],
        projects: [...new Set(mine.map((c) => c.project))],
        capabilityIds: mine.map((c) => c.id),
        gaps: r.coverage === "supports" ? [] : [r.why],
      });
    }
  }
  const rest = caps.filter((c) => !used.has(c.id));
  if (rest.length) {
    out.push({
      requirementId: "other",
      label: "Other observations",
      summary: "Findings outside the requirement dimensions.",
      coverage: "not_assessed",
      basis: [...new Set(rest.flatMap((c) => c.basis))],
      projects: [...new Set(rest.map((c) => c.project))],
      capabilityIds: rest.map((c) => c.id),
      gaps: [],
    });
  }
  return out;
}

function questions(caps: CapabilityEntry[], attribution: Attribution, review: Pick<CapabilityReview, "contradictions">): UnansweredQuestion[] {
  const out: UnansweredQuestion[] = [];
  if (!attribution.personClaimsAllowed && attribution.relationship !== "reference") {
    out.push({ id: "q_contribution", question: "Which parts of this project did you write, and which did you inherit?", why: attribution.summary, findingIds: [] });
  }
  for (const c of review.contradictions.slice(0, 2)) {
    out.push({ id: `q_${hash(c).slice(0, 10)}`, question: `The comment at ${c.path} L${c.line} says ${c.claims}. Where does the code do that?`, why: c.detail, findingIds: [] });
  }
  for (const c of caps.filter((c) => c.status === "supported").slice(0, 3)) {
    out.push({ id: `q_${c.id.slice(4)}`, question: c.followUp, why: c.title, findingIds: c.findingIds });
  }
  const seen = new Set<string>();
  return out.filter((q) => (seen.has(q.question) ? false : (seen.add(q.question), true))).slice(0, 5);
}

/** Hash of everything the review is derived from. Equal inputs never produce a second stored version. */
function reviewInputHash(input: ReviewInput, roles: SupportedRole[], alsoSeenIn: string[][]): string {
  const p = input.project;
  return hash({
    schema: CAPABILITY_SCHEMA_VERSION,
    analysisVersion: p.analysisVersion ?? null,
    snapshot: p.id ?? null,
    revision: p.commitSha,
    evidence: p.evidence.map((e) => ({ id: e.id, entailment: e.entailment ?? null })),
    signals: p.contributionSignals ?? null,
    checks: p.checks ?? null,
    relationship: input.contribution?.relationship ?? "unspecified",
    contribution: input.contribution ? { v: input.contribution.version, refs: input.contribution.evidenceRefs } : null,
    statement: p.contributionStatement,
    decisions: (input.decisions ?? []).map((d) => ({ id: d.id, v: d.version, w: d.withdrawnAt })),
    corrections: (input.corrections ?? [])
      .filter((c) => p.evidence.some((e) => e.id === c.findingId))
      .map((c) => ({ id: c.id, s: c.status, w: c.withdrawnAt, r: c.resolvedAt }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    tasks: input.taskDemonstrations ?? [],
    judgments: input.reviewerJudgments ?? [],
    // Other projects matter only where they hold identical code, so unrelated imports do not make this report stale.
    alsoSeenIn,
    description: input.description ?? null,
    roles,
  });
}

/**
 * Builds the capability review for one project snapshot. Deterministic: model
 * enrichment, when used, runs afterwards and may only reword or narrow.
 */
export function buildCapabilityReview(input: ReviewInput, overrides: ReviewOverrides | null = null): CapabilityReview {
  const { project } = input;
  const attribution = assessAttribution({
    sourceKind: project.sourceKind ?? "github",
    isFork: project.isFork,
    repoFullName: project.repoFullName,
    signals: project.contributionSignals,
    relationship: input.contribution?.relationship ?? "unspecified",
    statement: statementText(input.contribution) || project.contributionStatement,
  });
  const l = layers(input, attribution);
  const caps = capabilities(input, attribution, l.engineerStatements, overrides);
  const contradictions = (project.checks?.contradictions ?? []).map((c) => ({ path: c.path, line: c.line, text: c.text, claims: c.claims, detail: c.detail }));
  const roles = rolesFor(input, caps);
  const requirementSets: RequirementSet[] = roles.map((role) => ({
    role,
    label: ROLE_REQUIREMENTS[role].label,
    requirements: ROLE_REQUIREMENTS[role].requirements.map((r) => coverageFor(r, caps, contradictions, l.taskDemonstrations)),
  }));
  const groups = groupsFrom(caps, requirementSets);
  const supported = caps.filter((c) => c.status === "supported");
  const narrowed = caps.length - supported.length;
  const limits = [
    `Fydell read ${project.coverage.analyzedFiles} of ${project.coverage.totalFiles} files at ${project.commitSha.slice(0, 7)} and ran nothing.`,
    ...(narrowed ? [`${narrowed} finding${narrowed === 1 ? " was" : "s were"} narrowed because the cited lines do not show the behaviour on their own. Each says why.`] : []),
    ...(contradictions.length ? [`${contradictions.length} comment${contradictions.length === 1 ? " claims" : "s claim"} behaviour the code does not show.`] : []),
    ...attribution.limits.slice(0, 1),
  ];
  const description = input.description?.trim() || null;
  const ownWords = statementText(input.contribution);
  const purpose = description ?? (ownWords ? `In the engineer's words: ${ownWords.slice(0, 280)}` : null);
  const nextAction =
    attribution.relationship === "reference"
      ? "Nothing to add: reference projects describe the project only."
      : !attribution.personClaimsAllowed && !ownWords
        ? "Describe your contribution. We'll show your statement separately from source evidence."
        : !attribution.personClaimsAllowed && attribution.automatic.some((a) => a.reason === "not_recorded" || a.reason === "no_login")
          ? "Connect GitHub and re-analyze so commits on the cited files can be checked."
          : "Answer the open questions, or link findings to your contribution statement.";

  return {
    schemaVersion: CAPABILITY_SCHEMA_VERSION,
    analysisVersion: project.analysisVersion ?? null,
    inputHash: reviewInputHash(input, roles, caps.map((c) => [c.id, ...c.alsoSeenIn]).sort((a, b) => a[0].localeCompare(b[0]))),
    subject: {
      project: project.repoFullName,
      revision: project.commitSha,
      snapshotId: project.id ?? null,
      sourceKind: project.sourceKind ?? "github",
      url: project.htmlUrl || null,
      languages: project.coverage.languages,
      analyzedAt: project.analyzedAt,
    },
    attribution,
    layers: l,
    capabilities: caps,
    groups,
    requirementSets,
    questions: questions(caps, attribution, { contradictions }),
    contradictions,
    rejectedClaims: (project.checks?.rejectedClaims ?? []).map((r) => ({ path: r.path, startLine: r.startLine, reason: r.reason })),
    ignoredInstructions: (project.checks?.untrustedInstructions ?? []).map((u) => ({ path: u.path, line: u.line })),
    overview: {
      purpose,
      contributionScope: attribution.summary,
      strongest: supported.slice(0, 3).map((c) => `${c.title} (${c.evidence[0] && "path" in c.evidence[0] ? loc(c.evidence[0]) : c.project})`),
      limits,
      nextAction,
    },
    method: {
      enrichment: overrides?.record ?? { source: "template", model: null, accepted: 0, rejected: [], narrowedByModel: [] },
      coverage: `${project.coverage.analyzedFiles} of ${project.coverage.totalFiles} files analyzed${project.coverage.treeTruncated ? "; the file tree was truncated" : ""}.`,
      notRun: "No code, tests or builds were executed for this report. Test findings say a test exists, not that it passes.",
    },
  };
}
