/**
 * Contribution context and decision records: what the engineer says about
 * their involvement and choices. Always attributed, never verified, and never
 * merged into findings. References point at evidence in the same work record.
 */

export type Collaboration = "unspecified" | "solo" | "team" | "open_source";

export const COLLABORATION_LABEL: Record<Collaboration, string> = {
  unspecified: "Not stated",
  solo: "Built alone",
  team: "Team project",
  open_source: "Open-source contribution",
};

/** A pointer from a statement to evidence: a finding, or a file range in a snapshot. */
export type EvidenceRef = {
  projectId: string;
  findingId: string | null;
  path: string;
  startLine: number | null;
  endLine: number | null;
};

export type ContributionContext = {
  repoFullName: string;
  problem: string;
  workedOn: string;
  inherited: string;
  collaboration: Collaboration;
  collaborationNote: string;
  constraintsFaced: string;
  checkedHow: string;
  results: string;
  improvements: string;
  evidenceRefs: EvidenceRef[];
  version: number;
  updatedAt: string | null;
};

export type DecisionRecord = {
  id: string;
  repoFullName: string;
  title: string;
  problem: string;
  constraintsFaced: string;
  alternatives: string;
  choice: string;
  tradeoffs: string;
  outcome: string;
  evidenceRefs: EvidenceRef[];
  version: number;
  withdrawnAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const TEXT_LIMIT = 2000;
export const MAX_REFS = 12;

export function emptyContribution(repoFullName: string): ContributionContext {
  return {
    repoFullName,
    problem: "",
    workedOn: "",
    inherited: "",
    collaboration: "unspecified",
    collaborationNote: "",
    constraintsFaced: "",
    checkedHow: "",
    results: "",
    improvements: "",
    evidenceRefs: [],
    version: 0,
    updatedAt: null,
  };
}

const UUID = /^[0-9a-f-]{36}$/;

const text = (v: unknown, max = TEXT_LIMIT): string | null => {
  if (v === undefined || v === null) return "";
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > max ? null : t;
};

export function parseEvidenceRefs(raw: unknown): EvidenceRef[] | { error: string } {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return { error: "Evidence links must be a list." };
  if (raw.length > MAX_REFS) return { error: `Link at most ${MAX_REFS} pieces of evidence.` };
  const out: EvidenceRef[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) return { error: "Each evidence link needs a project and a file." };
    const r = item as Record<string, unknown>;
    if (typeof r.projectId !== "string" || !UUID.test(r.projectId)) return { error: "An evidence link points at an unknown project." };
    if (typeof r.path !== "string" || !r.path || r.path.length > 400 || r.path.includes("..")) return { error: "An evidence link has an invalid file path." };
    const start = typeof r.startLine === "number" && Number.isInteger(r.startLine) && r.startLine > 0 ? r.startLine : null;
    const end = typeof r.endLine === "number" && Number.isInteger(r.endLine) && start !== null && r.endLine >= start ? r.endLine : start;
    const findingId = typeof r.findingId === "string" && /^ev_[0-9a-f]{16}$/.test(r.findingId) ? r.findingId : null;
    out.push({ projectId: r.projectId, findingId, path: r.path, startLine: start, endLine: end });
  }
  return out;
}

export type ContributionInput = Omit<ContributionContext, "repoFullName" | "version" | "updatedAt">;

export function parseContribution(raw: unknown): ContributionInput | { error: string } {
  if (typeof raw !== "object" || raw === null) return { error: "Send the contribution fields." };
  const b = raw as Record<string, unknown>;
  const fields = {
    problem: text(b.problem),
    workedOn: text(b.workedOn),
    inherited: text(b.inherited),
    collaborationNote: text(b.collaborationNote, 500),
    constraintsFaced: text(b.constraintsFaced),
    checkedHow: text(b.checkedHow),
    results: text(b.results),
    improvements: text(b.improvements),
  };
  for (const [k, v] of Object.entries(fields)) if (v === null) return { error: `Keep "${k}" under ${k === "collaborationNote" ? 500 : TEXT_LIMIT} characters.` };
  const collaboration: Collaboration =
    b.collaboration === "solo" || b.collaboration === "team" || b.collaboration === "open_source" ? b.collaboration : "unspecified";
  const refs = parseEvidenceRefs(b.evidenceRefs);
  if ("error" in refs) return refs;
  return {
    problem: fields.problem as string,
    workedOn: fields.workedOn as string,
    inherited: fields.inherited as string,
    collaboration,
    collaborationNote: fields.collaborationNote as string,
    constraintsFaced: fields.constraintsFaced as string,
    checkedHow: fields.checkedHow as string,
    results: fields.results as string,
    improvements: fields.improvements as string,
    evidenceRefs: refs,
  };
}

export type DecisionInput = Pick<DecisionRecord, "title" | "problem" | "constraintsFaced" | "alternatives" | "choice" | "tradeoffs" | "outcome" | "evidenceRefs">;

export function parseDecision(raw: unknown): DecisionInput | { error: string } {
  if (typeof raw !== "object" || raw === null) return { error: "Send the decision fields." };
  const b = raw as Record<string, unknown>;
  const title = text(b.title, 160);
  if (!title) return { error: "Give the decision a short title (up to 160 characters)." };
  const fields = {
    problem: text(b.problem),
    constraintsFaced: text(b.constraintsFaced),
    alternatives: text(b.alternatives),
    choice: text(b.choice),
    tradeoffs: text(b.tradeoffs),
    outcome: text(b.outcome),
  };
  for (const [k, v] of Object.entries(fields)) if (v === null) return { error: `Keep "${k}" under ${TEXT_LIMIT} characters.` };
  if (!fields.problem || !fields.choice) return { error: "Describe at least the problem and what you chose." };
  const refs = parseEvidenceRefs(b.evidenceRefs);
  if ("error" in refs) return refs;
  return {
    title,
    problem: fields.problem,
    constraintsFaced: fields.constraintsFaced as string,
    alternatives: fields.alternatives as string,
    choice: fields.choice,
    tradeoffs: fields.tradeoffs as string,
    outcome: fields.outcome as string,
    evidenceRefs: refs,
  };
}

/** True when the engineer has said anything about their contribution. */
export function hasContribution(c: ContributionContext): boolean {
  return Boolean(
    c.problem || c.workedOn || c.inherited || c.collaboration !== "unspecified" || c.constraintsFaced || c.checkedHow || c.results || c.improvements,
  );
}
