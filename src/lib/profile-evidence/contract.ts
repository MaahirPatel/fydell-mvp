/**
 * Engineer profile evidence: the immutable package an engineer publishes for
 * one piece of work, and the rules around it. Pure, so it runs in-process in
 * tests and in both server and client components.
 *
 * An evidence version says three different kinds of thing and keeps them
 * apart: what the engineer states (always attributed, never verified), what
 * Fydell observed in the analyzed source (with limits), and what neither
 * covers ("Not assessed"). Ownership comes only from the engineer's explicit
 * confirmation, never from repository access or commit counts.
 */

import { CATEGORY_LABEL, CATEGORY_ORDER } from "@/lib/passport/record-states";

export const EVIDENCE_SCHEMA = "evidence-version-v1";

export const GUIDE_KEYS = ["problem", "contribution", "constraints", "decisions", "checks", "outcomes"] as const;
export type GuideKey = (typeof GUIDE_KEYS)[number];

export const GUIDE_LABEL: Record<GuideKey, string> = {
  problem: "Problem",
  contribution: "Contribution",
  constraints: "Constraints",
  decisions: "Decisions",
  checks: "How it was checked",
  outcomes: "Outcomes",
};

/** "engineer" = written or confirmed by the engineer; "generated" = drafted from the analysis and not yet edited. */
export type FieldOrigin = "engineer" | "generated";

export type GuideSection = { key: GuideKey; text: string; origin: FieldOrigin | null };

export type EvidenceSourceKind = "github" | "upload" | "manual" | "work_sample";

export type SnapshotFinding = {
  id: string;
  finding: string;
  category: string;
  basis: "repository_observation" | "dependency_declaration";
  path: string;
  startLine: number;
  endLine: number;
  excerpt: string[];
  sourceUrl: string;
  limitations: string[];
};

export type SnapshotNote = {
  findingId: string;
  kind: "context" | "inaccurate" | "correction";
  text: string;
  proposedInterpretation: string;
  createdAt: string;
};

export type SnapshotDecision = {
  title: string;
  problem: string;
  constraints: string;
  alternatives: string;
  choice: string;
  tradeoffs: string;
  outcome: string;
};

export type CapabilityState = "supported" | "not_assessed";

export type SnapshotCapability = {
  key: string;
  label: string;
  state: CapabilityState;
  findingIds: string[];
  supports: string;
  doesNotEstablish: string[];
};

export type SimulationCitation = { kind: "file" | "message" | "handoff" | "public_check"; label: string };

export type SimulationReportSummary = {
  attemptId: string;
  title: string;
  releasedAt: string | null;
  summary: string;
  investigated: string[];
  clarified: string[];
  changes: string[];
  checks: string[];
  feedbackEffect: string[];
  unresolved: string[];
  evidence: Array<{ statement: string; citations: SimulationCitation[] }>;
};

export const RELATIONSHIPS = ["manager", "peer", "report", "client", "maintainer", "other"] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];
export const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  manager: "Managed the engineer",
  peer: "Worked alongside them",
  report: "Reported to them",
  client: "Client or user of the work",
  maintainer: "Maintainer who reviewed the work",
  other: "Other",
};
export type FeedbackVerification = "none" | "author_account";
export const VERIFICATION_LABEL: Record<FeedbackVerification, string> = {
  none: "Fydell has not verified this person or what they wrote. The engineer added it.",
  author_account: "Written from the author's own Fydell account. Fydell has not verified their role on the work.",
};

export type SnapshotFeedback = {
  id: string;
  authorName: string;
  relationship: Relationship;
  relationshipNote: string;
  directlyObserved: boolean;
  statement: string;
  verification: FeedbackVerification;
  createdAt: string;
};

export type EvidenceVersionContent = {
  schema: typeof EVIDENCE_SCHEMA;
  projectKey: string;
  sourceKind: EvidenceSourceKind;
  title: string;
  summary: { text: string; origin: FieldOrigin | null };
  technologies: string[];
  links: Array<{ label: string; url: string }>;
  period: string;
  teamContext: string;
  projectState: string;
  collaboration: { label: string; note: string };
  guide: GuideSection[];
  decisions: SnapshotDecision[];
  confirmation: { confirmed: boolean; confirmedAt: string | null };
  findings: SnapshotFinding[];
  notes: SnapshotNote[];
  capabilities: SnapshotCapability[];
  simulations: SimulationReportSummary[];
  feedback: SnapshotFeedback[];
  provenance: {
    snapshotId: string | null;
    commitSha: string | null;
    analyzedAt: string | null;
    analysisVersion: string | null;
    importerVersion: string | null;
    coverage: string | null;
    presentationVersion: number;
    contributionVersion: number;
    /** Presentation fields still as drafted from the analysis, shown as unconfirmed drafts. */
    generatedFields: string[];
  };
};

/* ------------------------------------------------------------------ */
/* Building a version from its sources                                 */
/* ------------------------------------------------------------------ */

export type PresentationSource = {
  title: string;
  summary: string;
  purpose: string;
  contribution: string;
  outcomes: string;
  technologies: string[];
  links: Array<{ label: string; url: string }>;
  period: string;
  teamContext: string;
  projectState: string;
  fieldSources: Partial<Record<string, FieldOrigin>>;
  version: number;
  saved: boolean;
};

export type ContributionSource = {
  problem: string;
  workedOn: string;
  inherited: string;
  collaborationLabel: string;
  collaborationNote: string;
  constraintsFaced: string;
  checkedHow: string;
  results: string;
  version: number;
};

export type SnapshotSource = {
  id: string;
  commitSha: string;
  analyzedAt: string;
  analysisVersion: string | null;
  importerVersion: string | null;
  coverage: string;
  findings: SnapshotFinding[];
};

export type EvidenceSources = {
  projectKey: string;
  sourceKind: EvidenceSourceKind;
  presentation: PresentationSource | null;
  contribution: ContributionSource | null;
  decisions: SnapshotDecision[];
  snapshot: SnapshotSource | null;
  notes: SnapshotNote[];
  simulations: SimulationReportSummary[];
  feedback: SnapshotFeedback[];
  confirmation: ConfirmationRecord | null;
};

export type ConfirmationRecord = { presentationVersion: number; contributionVersion: number; createdAt: string };

export type ConfirmationState = "unconfirmed" | "confirmed" | "changed_since_confirmed";

/** A confirmation covers exactly the statement versions it was made against; any later edit needs a fresh one. */
export function confirmationState(latest: ConfirmationRecord | null, current: { presentationVersion: number; contributionVersion: number }): ConfirmationState {
  if (!latest) return "unconfirmed";
  return latest.presentationVersion === current.presentationVersion && latest.contributionVersion === current.contributionVersion
    ? "confirmed"
    : "changed_since_confirmed";
}

function originOf(presentation: PresentationSource | null, field: string): FieldOrigin | null {
  if (!presentation) return null;
  return presentation.fieldSources[field] === "engineer" ? "engineer" : presentation.saved ? "engineer" : "generated";
}

function section(key: GuideKey, candidates: Array<{ text: string; origin: FieldOrigin | null }>): GuideSection {
  const hit = candidates.find((c) => c.text.trim().length > 0);
  return hit ? { key, text: hit.text.trim(), origin: hit.origin } : { key, text: "", origin: null };
}

/** The six guide sections, preferring the engineer's contribution statement over presentation text. */
export function buildGuide(s: Pick<EvidenceSources, "presentation" | "contribution" | "decisions">): GuideSection[] {
  const p = s.presentation;
  const c = s.contribution;
  const contributionText = c
    ? [c.workedOn, c.inherited ? `Already there: ${c.inherited}` : ""].filter(Boolean).join("\n\n")
    : "";
  return [
    section("problem", [
      { text: c?.problem ?? "", origin: "engineer" },
      { text: p?.purpose ?? "", origin: originOf(p, "purpose") },
    ]),
    section("contribution", [
      { text: c?.workedOn ? contributionText : "", origin: "engineer" },
      { text: p?.contribution ?? "", origin: originOf(p, "contribution") },
    ]),
    section("constraints", [{ text: c?.constraintsFaced ?? "", origin: "engineer" }]),
    section("decisions", [{ text: s.decisions.map((d) => d.title).join("\n"), origin: "engineer" }]),
    section("checks", [{ text: c?.checkedHow ?? "", origin: "engineer" }]),
    section("outcomes", [
      { text: c?.results ?? "", origin: "engineer" },
      { text: p?.outcomes ?? "", origin: originOf(p, "outcomes") },
    ]),
  ];
}

/** Guide sections the engineer has not filled. Used to show where help is needed, never as a penalty. */
export function guideGaps(guide: GuideSection[]): GuideKey[] {
  return guide.filter((g) => g.origin === null).map((g) => g.key);
}

const REPO_LIMIT = "Repository analysis shows what the code contains, not who wrote it or how it behaves in production.";

/**
 * One row per capability area. An area with cited findings links to those
 * findings and states what they do not establish; an area without any is
 * "Not assessed", which is not a negative finding.
 */
export function buildCapabilities(findings: SnapshotFinding[], hasSource: boolean): SnapshotCapability[] {
  const known = new Set<string>(CATEGORY_ORDER);
  const extra = [...new Set(findings.map((f) => f.category).filter((c) => !known.has(c)))].sort();
  return [...CATEGORY_ORDER, ...extra].map((key) => {
    const cited = findings.filter((f) => f.category === key);
    const label = CATEGORY_LABEL[key] ?? key.replace(/_/g, " ");
    if (cited.length === 0) {
      return {
        key,
        label,
        state: "not_assessed" as const,
        findingIds: [],
        supports: hasSource ? "No cited work in this project for this area." : "No analyzed source for this project.",
        doesNotEstablish: [],
      };
    }
    const files = [...new Set(cited.map((f) => f.path))];
    const limits = [...new Set(cited.flatMap((f) => f.limitations).filter(Boolean))].slice(0, 4);
    return {
      key,
      label,
      state: "supported" as const,
      findingIds: cited.map((f) => f.id),
      supports: `${cited.length} cited finding${cited.length === 1 ? "" : "s"} in ${files.length} file${files.length === 1 ? "" : "s"}.`,
      doesNotEstablish: [...limits, REPO_LIMIT],
    };
  });
}

export function buildEvidenceContent(s: EvidenceSources): EvidenceVersionContent {
  const p = s.presentation;
  const presentationVersion = p?.version ?? 0;
  const contributionVersion = s.contribution?.version ?? 0;
  const state = confirmationState(s.confirmation, { presentationVersion, contributionVersion });
  const findings = s.snapshot?.findings ?? [];
  const findingIds = new Set(findings.map((f) => f.id));
  const generatedFields =
    p && !p.saved
      ? Object.entries(p.fieldSources)
          .filter(([, origin]) => origin === "generated")
          .map(([k]) => k)
          .sort()
      : [];
  return {
    schema: EVIDENCE_SCHEMA,
    projectKey: s.projectKey,
    sourceKind: s.sourceKind,
    title: p?.title || s.simulations[0]?.title || s.projectKey,
    summary: p?.summary ? { text: p.summary, origin: originOf(p, "summary") } : { text: "", origin: null },
    technologies: p?.technologies ?? [],
    links: p?.links ?? [],
    period: p?.period ?? "",
    teamContext: p?.teamContext ?? "",
    projectState: p?.projectState ?? "",
    collaboration: { label: s.contribution?.collaborationLabel ?? "", note: s.contribution?.collaborationNote ?? "" },
    guide: s.sourceKind === "work_sample" ? [] : buildGuide(s),
    decisions: s.decisions,
    confirmation: { confirmed: state === "confirmed", confirmedAt: state === "confirmed" ? (s.confirmation?.createdAt ?? null) : null },
    findings,
    notes: s.notes.filter((n) => findingIds.has(n.findingId)),
    capabilities: s.sourceKind === "work_sample" ? [] : buildCapabilities(findings, s.snapshot !== null),
    simulations: s.simulations,
    feedback: s.feedback,
    provenance: {
      snapshotId: s.snapshot?.id ?? null,
      commitSha: s.snapshot?.commitSha ?? null,
      analyzedAt: s.snapshot?.analyzedAt ?? null,
      analysisVersion: s.snapshot?.analysisVersion ?? null,
      importerVersion: s.snapshot?.importerVersion ?? null,
      coverage: s.snapshot?.coverage ?? null,
      presentationVersion,
      contributionVersion,
      generatedFields,
    },
  };
}

/** Stable JSON: object keys sorted at every level, so equal content hashes equally. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

/** Narrows stored JSON back to a version. Rejects anything that is not this schema. */
export function parseEvidenceContent(raw: unknown): EvidenceVersionContent | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r.schema !== EVIDENCE_SCHEMA || typeof r.projectKey !== "string" || typeof r.title !== "string") return null;
  if (!Array.isArray(r.guide) || !Array.isArray(r.findings) || !Array.isArray(r.capabilities)) return null;
  return raw as EvidenceVersionContent;
}

/* ------------------------------------------------------------------ */
/* Applications: selection, order, access                               */
/* ------------------------------------------------------------------ */

export const MAX_APPLICATION_PROJECTS = 10;
const KEY = /^[A-Za-z0-9._:/-]{1,300}$/;

/** Ordered, de-duplicated project keys an applicant chose. Order is the order the team sees. */
export function parseEvidenceSelection(raw: unknown): string[] | { error: string } {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return { error: "Send the selected projects as a list." };
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string" || !KEY.test(item)) return { error: "One of the selected projects is not valid." };
    if (!out.some((k) => k.toLowerCase() === item.toLowerCase())) out.push(item);
  }
  if (out.length > MAX_APPLICATION_PROJECTS) return { error: `Choose at most ${MAX_APPLICATION_PROJECTS} projects for one application.` };
  return out;
}

export type EvidenceAccess = "visible" | "revoked" | "withdrawn" | "forbidden";

/** Recipient access check for one pinned version. Applied on every read, server-side. */
export function employerEvidenceAccess(input: {
  sameOrganization: boolean;
  applicationStatus: "submitted" | "withdrawn";
  revokedAt: string | null;
}): EvidenceAccess {
  if (!input.sameOrganization) return "forbidden";
  if (input.applicationStatus === "withdrawn") return "withdrawn";
  if (input.revokedAt) return "revoked";
  return "visible";
}

/* ------------------------------------------------------------------ */
/* Questions and feedback input                                         */
/* ------------------------------------------------------------------ */

export type QuestionInput = {
  question: string;
  evidenceVersionId: string | null;
  findingId: string | null;
  /** One of the role's requirements, checked against the role by the caller. */
  requirementId: string | null;
  dueAt: string | null;
  clientRequestId: string | null;
};

const UUID = /^[0-9a-f-]{36}$/;
const MAX_DUE_DAYS = 60;

export function parseQuestionInput(raw: unknown, now = Date.now()): QuestionInput | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "Send the question." };
  const b = raw as Record<string, unknown>;
  const question = typeof b.question === "string" ? b.question.trim() : "";
  if (!question) return { error: "Write the question." };
  if (question.length > 2000) return { error: "Keep the question under 2,000 characters." };
  const evidenceVersionId = typeof b.evidenceVersionId === "string" && UUID.test(b.evidenceVersionId) ? b.evidenceVersionId : null;
  const findingId = typeof b.findingId === "string" && /^ev_[0-9a-f]{16}$/.test(b.findingId) ? b.findingId : null;
  if (findingId && !evidenceVersionId) return { error: "A question about a finding needs the project it belongs to." };
  const requirementId = typeof b.requirementId === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(b.requirementId) ? b.requirementId : null;
  let dueAt: string | null = null;
  if (typeof b.dueAt === "string" && b.dueAt) {
    const t = Date.parse(b.dueAt);
    if (Number.isNaN(t) || t <= now) return { error: "The answer-by date must be in the future." };
    if (t > now + MAX_DUE_DAYS * 86_400_000) return { error: `The answer-by date can be at most ${MAX_DUE_DAYS} days away.` };
    dueAt = new Date(t).toISOString();
  }
  const clientRequestId = typeof b.clientRequestId === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(b.clientRequestId) ? b.clientRequestId : null;
  return { question, evidenceVersionId, findingId, requirementId, dueAt, clientRequestId };
}

export type FeedbackInput = {
  authorName: string;
  relationship: Relationship;
  relationshipNote: string;
  directlyObserved: boolean;
  statement: string;
};

export function parseFeedbackInput(raw: unknown): FeedbackInput | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "Send the feedback." };
  const b = raw as Record<string, unknown>;
  const authorName = typeof b.authorName === "string" ? b.authorName.trim() : "";
  if (!authorName || authorName.length > 120) return { error: "Name the person who gave the feedback (up to 120 characters)." };
  const relationship = RELATIONSHIPS.find((r) => r === b.relationship);
  if (!relationship) return { error: "Choose how they worked with you." };
  const relationshipNote = typeof b.relationshipNote === "string" ? b.relationshipNote.trim() : "";
  if (relationshipNote.length > 200) return { error: "Keep the relationship note under 200 characters." };
  if (typeof b.directlyObserved !== "boolean") return { error: "Say whether they saw the work directly." };
  const statement = typeof b.statement === "string" ? b.statement.trim() : "";
  if (!statement || statement.length > 1500) return { error: "Add what they said (up to 1,500 characters)." };
  return { authorName, relationship, relationshipNote, directlyObserved: b.directlyObserved, statement };
}

/* ------------------------------------------------------------------ */
/* Measurement                                                          */
/* ------------------------------------------------------------------ */

/**
 * How much an engineer changed drafted text: share of compared fields
 * changed, and an approximate share of characters changed. Counts only;
 * the text itself is never recorded.
 */
export function draftEditStats(before: Record<string, string>, after: Record<string, string>): { fieldsCompared: number; fieldsChanged: number; charChangeRatio: number } {
  let compared = 0;
  let changed = 0;
  let total = 0;
  let diff = 0;
  for (const key of Object.keys(before)) {
    const a = (before[key] ?? "").trim();
    const b = (after[key] ?? "").trim();
    if (!a && !b) continue;
    compared += 1;
    if (a !== b) changed += 1;
    let prefix = 0;
    while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix += 1;
    let suffix = 0;
    while (suffix < a.length - prefix && suffix < b.length - prefix && a[a.length - 1 - suffix] === b[b.length - 1 - suffix]) suffix += 1;
    const longest = Math.max(a.length, b.length);
    total += longest;
    diff += longest - prefix - suffix;
  }
  return { fieldsCompared: compared, fieldsChanged: changed, charChangeRatio: total === 0 ? 0 : Math.round((diff / total) * 100) / 100 };
}

export type EventValue = number | boolean | string | string[];

const TOKEN_SHAPE = /^[a-z][a-z0-9_.:-]{0,63}$/;
/** Long unbroken runs look like keys or hashes, not enum values. */
const SECRET_LIKE = /[a-z0-9]{16,}/;
const isSafeToken = (s: string) => TOKEN_SHAPE.test(s) && !SECRET_LIKE.test(s);

/**
 * Product event payloads carry counts, flags, ids and short enum tokens only.
 * Free text (which could hold source code, answers or credentials) is dropped.
 */
export function sanitizeEventPayload(payload: Record<string, unknown>): Record<string, EventValue> {
  const out: Record<string, EventValue> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (!isSafeToken(k)) continue;
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "boolean") out[k] = v;
    else if (typeof v === "string" && (UUID.test(v) || isSafeToken(v))) out[k] = v;
    else if (Array.isArray(v)) {
      const tokens = v.filter((x): x is string => typeof x === "string" && isSafeToken(x)).slice(0, 20);
      if (tokens.length === v.length) out[k] = tokens;
    }
  }
  return out;
}
