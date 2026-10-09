import "server-only";
import type { Admin } from "./context";
import { criteriaOf, observedSentence, STATE_LABEL } from "./criteria";
import { ReportError } from "./reports";
import type { ScenarioDefinition } from "./scenarios/types";
import type { AttemptRow, Citation, Finding, ProbeResult, ReportRow } from "./types";

/**
 * What a candidate sees of their released report. Built from an allowlist:
 * interview follow-ups, reviewer identity, decisions, private notes, finding
 * flags and hidden check inputs are never read into this object.
 */
export interface CandidateReport {
  version: number;
  releasedAt: string | null;
  rubricVersion: string;
  changeReason: string | null;
  summary: string;
  dimensions: { label: string; level: string; rationale: string }[];
  criteria: {
    id: string;
    label: string;
    requirement: string;
    state: string;
    stateKey: string;
    observed: string | null;
    rationale: string;
    notCovered: string;
  }[];
  strengths: string[];
  gaps: string[];
  limitations: string[];
  findings: {
    id: string;
    dimension: string;
    kind: Finding["kind"];
    basis: Finding["basis"];
    statement: string;
    citations: CandidateCitation[];
  }[];
  /** Public tests ship with the starter, so their titles and outcomes are shown. */
  publicChecks: { id: string; title: string; outcome: ProbeResult["outcome"] }[];
  /** Hidden checks are reported by count only. */
  hiddenChecks: { passed: number; total: number } | null;
  /** Criteria with no evidence either way. Listed so they are not read as weaknesses. */
  notAssessed: string[];
  improvements: {
    criterionId: string;
    label: string;
    observation: string;
    whyItMatters: string;
    nextStep: string;
    recheck: string | null;
    limit: string;
  }[];
  versions: { version: number; releasedAt: string | null; changeReason: string | null; current: boolean }[];
  responses: CandidateResponse[];
}

export type CandidateCitation =
  | { kind: "file"; path: string; lineStart: number | null; lineEnd: number | null }
  | { kind: "message"; messageId: string }
  | { kind: "handoff"; field: string }
  | { kind: "public_check"; id: string; title: string; outcome: ProbeResult["outcome"] }
  | { kind: "hidden_check"; outcome: ProbeResult["outcome"] };

export interface CandidateResponse {
  id: string;
  reportVersion: number;
  targetKind: "finding" | "criterion" | "report";
  targetId: string;
  kind: "context" | "inaccurate";
  body: string;
  status: "open" | "resolved";
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

const DIMENSION_LABEL: Record<Finding["dimension"], string> = {
  correctness: "Correctness",
  engineering_judgment: "Engineering judgment",
  requirement_response: "Response to the requirement update",
  work_communication: "Work communication",
};

function citationFor(c: Citation, results: Map<string, ProbeResult>): CandidateCitation | null {
  switch (c.kind) {
    case "file":
      return { kind: "file", path: c.ref, lineStart: c.lineStart ?? null, lineEnd: c.lineEnd ?? c.lineStart ?? null };
    case "message":
      return { kind: "message", messageId: c.ref };
    case "handoff":
      return { kind: "handoff", field: c.ref };
    case "test": {
      const probe = results.get(c.ref);
      if (!probe) return null;
      return probe.visibility === "public"
        ? { kind: "public_check", id: probe.id, title: probe.title, outcome: probe.outcome }
        : { kind: "hidden_check", outcome: probe.outcome };
    }
  }
}

export function projectCandidateReport(
  scenario: ScenarioDefinition,
  report: ReportRow,
  results: ProbeResult[],
  history: ReportRow[],
  responses: CandidateResponse[]
): CandidateReport {
  const byId = new Map(results.map((r) => [r.id, r]));
  const defs = new Map(criteriaOf(scenario.rubric).map((d) => [d.id, d]));
  const criteria = (report.brief.criteria ?? []).map((c) => {
    const def = defs.get(c.id);
    return {
      id: c.id,
      label: c.label,
      requirement: def?.requirement ?? "",
      state: STATE_LABEL[c.state],
      stateKey: c.state,
      observed: c.observed ? `${observedSentence(c.observed)}.` : null,
      rationale: c.rationale,
      notCovered: c.notCovered,
    };
  });
  const improvements = (report.brief.criteria ?? [])
    .filter((c) => c.state === "concern_observed" || c.state === "partially_demonstrated")
    .flatMap((c) => {
      const def = defs.get(c.id);
      if (!def?.improvement) return [];
      const observation = `${STATE_LABEL[c.state]}${c.observed ? `. ${observedSentence(c.observed)}` : ""}.`;
      return [{ criterionId: c.id, label: c.label, observation, whyItMatters: def.requirement, nextStep: def.improvement, recheck: def.recheck ?? null, limit: `Not covered by this criterion: ${def.notCovered}` }];
    });
  const hidden = results.filter((r) => r.visibility === "hidden");
  return {
    version: report.version,
    releasedAt: report.released_at,
    rubricVersion: report.rubric_version,
    changeReason: report.change_reason,
    summary: report.brief.summary,
    dimensions: report.brief.dimensions.map((d) => ({ label: DIMENSION_LABEL[d.key], level: STATE_LABEL[d.level], rationale: d.rationale })),
    criteria,
    strengths: report.brief.strengths,
    gaps: report.brief.gaps,
    limitations: report.brief.limitations,
    findings: report.findings.map((f) => ({
      id: f.id,
      dimension: DIMENSION_LABEL[f.dimension],
      kind: f.kind,
      basis: f.basis,
      statement: f.statement,
      citations: f.citations.map((c) => citationFor(c, byId)).filter((c): c is CandidateCitation => c !== null),
    })),
    publicChecks: results.filter((r) => r.visibility === "public").map((r) => ({ id: r.id, title: r.title, outcome: r.outcome })),
    hiddenChecks: hidden.length ? { passed: hidden.filter((r) => r.outcome === "passed").length, total: hidden.length } : null,
    notAssessed: (report.brief.criteria ?? []).filter((c) => c.state === "not_assessed").map((c) => c.label),
    improvements,
    versions: history
      .filter((r) => r.status === "released" || r.status === "superseded")
      .map((r) => ({ version: r.version, releasedAt: r.released_at, changeReason: r.change_reason, current: r.id === report.id })),
    responses,
  };
}

function toResponse(row: Record<string, unknown>): CandidateResponse {
  return {
    id: row.id as string,
    reportVersion: row.report_version as number,
    targetKind: row.target_kind as CandidateResponse["targetKind"],
    targetId: row.target_id as string,
    kind: row.kind as CandidateResponse["kind"],
    body: row.body as string,
    status: row.status as CandidateResponse["status"],
    resolution: (row.resolution as string | null) ?? null,
    createdAt: row.created_at as string,
    resolvedAt: (row.resolved_at as string | null) ?? null,
  };
}

export async function listResponses(db: Admin, attemptId: string): Promise<CandidateResponse[]> {
  const { data } = await db.from("eng_report_responses").select("*").eq("attempt_id", attemptId).order("created_at", { ascending: true });
  return (data ?? []).map((r) => toResponse(r as Record<string, unknown>));
}

/** Null until the hiring team releases a report. */
export async function buildCandidateReport(db: Admin, attempt: AttemptRow, scenario: ScenarioDefinition): Promise<CandidateReport | null> {
  if (attempt.status !== "submitted") return null;
  const { data: history } = await db.from("eng_reports").select("*").eq("attempt_id", attempt.id).in("status", ["released", "superseded"]).order("version", { ascending: false });
  const rows = (history as ReportRow[] | null) ?? [];
  const report = rows.find((r) => r.status === "released");
  if (!report) return null;
  const { data: run } = await db.from("eng_evaluation_runs").select("results").eq("id", report.evaluation_run_id).maybeSingle();
  const results = ((run?.results as ProbeResult[] | null) ?? []).filter((r) => typeof r?.id === "string");
  return projectCandidateReport(scenario, report, results, rows, await listResponses(db, attempt.id));
}

export async function addResponse(
  db: Admin,
  attempt: AttemptRow,
  userId: string,
  input: { targetKind: CandidateResponse["targetKind"]; targetId: string; kind: CandidateResponse["kind"]; body: string; clientRequestId: string | null }
): Promise<{ response: CandidateResponse; created: boolean }> {
  const { data: report } = await db.from("eng_reports").select("*").eq("attempt_id", attempt.id).eq("status", "released").maybeSingle();
  if (!report) throw new ReportError("There is no released report to respond to yet.", [], 409);
  const row = report as ReportRow;
  const body = input.body.trim();
  if (!body || body.length > 2000) throw new ReportError("Write between 1 and 2,000 characters.");
  const known =
    input.targetKind === "report" ||
    (input.targetKind === "finding" && row.findings.some((f) => f.id === input.targetId)) ||
    (input.targetKind === "criterion" &&
      ((row.brief.criteria ?? []).some((c) => c.id === input.targetId) ||
        (row.brief.authored?.criteria ?? []).some((c) => c.id === input.targetId) ||
        (row.brief.authored?.acceptance ?? []).some((a) => a.id === input.targetId)));
  if (!known) throw new ReportError("That part of the report no longer exists. Reload the page.", [], 409);
  if (input.clientRequestId) {
    const { data: existing } = await db.from("eng_report_responses").select("*").eq("attempt_id", attempt.id).eq("client_request_id", input.clientRequestId).maybeSingle();
    if (existing) return { response: toResponse(existing as Record<string, unknown>), created: false };
  }
  const { data, error } = await db
    .from("eng_report_responses")
    .insert({
      attempt_id: attempt.id,
      organization_id: attempt.organization_id,
      report_id: row.id,
      report_version: row.version,
      target_kind: input.targetKind,
      target_id: input.targetKind === "report" ? "report" : input.targetId,
      kind: input.kind,
      body,
      candidate_user_id: userId,
      client_request_id: input.clientRequestId,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505" && input.clientRequestId) {
      const { data: again } = await db.from("eng_report_responses").select("*").eq("attempt_id", attempt.id).eq("client_request_id", input.clientRequestId).single();
      return { response: toResponse(again as Record<string, unknown>), created: false };
    }
    throw new Error(`Could not save your response: ${error.message}`);
  }
  return { response: toResponse(data as Record<string, unknown>), created: true };
}

export async function resolveResponse(db: Admin, attempt: AttemptRow, responseId: string, resolverEmail: string, resolution: string): Promise<CandidateResponse> {
  const text = resolution.trim();
  if (!text || text.length > 2000) throw new ReportError("Explain the resolution in up to 2,000 characters.");
  const { data, error } = await db
    .from("eng_report_responses")
    .update({ status: "resolved", resolution: text, resolved_by_email: resolverEmail, resolved_at: new Date().toISOString() })
    .eq("id", responseId)
    .eq("attempt_id", attempt.id)
    .eq("status", "open")
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`Could not resolve the response: ${error.message}`);
  if (!data) throw new ReportError("This response was already resolved or does not belong to this attempt.", [], 409);
  return toResponse(data as Record<string, unknown>);
}