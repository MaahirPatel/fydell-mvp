import type { CandidateReport } from "@/lib/eng/candidate-report";
import type { SimulationCitation, SimulationReportSummary } from "./contract";

const REQUIREMENT_UPDATE = "Response to the requirement update";

function citationLabel(c: CandidateReport["findings"][number]["citations"][number]): SimulationCitation | null {
  switch (c.kind) {
    case "file":
      return { kind: "file", label: c.lineStart ? `${c.path}:${c.lineStart}${c.lineEnd && c.lineEnd !== c.lineStart ? `-${c.lineEnd}` : ""}` : c.path };
    case "message":
      return { kind: "message", label: "Message in the work sample conversation" };
    case "handoff":
      return { kind: "handoff", label: `Handoff note: ${c.field}` };
    case "public_check":
      return { kind: "public_check", label: `Public check: ${c.title}` };
    case "hidden_check":
      return null;
  }
}

/**
 * The part of a released work-sample report an engineer may put in their
 * Passport: what they investigated, clarified, changed and checked, how the
 * requirement update affected the work, and what stayed unresolved, with the
 * cited evidence. Levels, hidden checks, reviewer identity and notes are left
 * out, so nothing here reads as a score.
 */
export function workSampleSummary(attemptId: string, title: string, report: CandidateReport): SimulationReportSummary {
  const withCitation = (kind: SimulationCitation["kind"]) =>
    report.findings.filter((f) => f.citations.some((c) => c.kind === kind)).map((f) => f.statement);
  return {
    attemptId,
    title,
    releasedAt: report.releasedAt,
    summary: report.summary,
    investigated: report.criteria.filter((c) => c.observed).map((c) => `${c.label}: ${c.observed}`),
    clarified: withCitation("message"),
    changes: withCitation("file"),
    checks: report.publicChecks.map((c) => `${c.title}: ${c.outcome.replace(/_/g, " ")}`),
    feedbackEffect: report.findings.filter((f) => f.dimension === REQUIREMENT_UPDATE).map((f) => f.statement),
    unresolved: [...report.gaps, ...report.notAssessed.map((label) => `Not assessed: ${label}`)],
    evidence: report.findings.map((f) => ({
      statement: f.statement,
      citations: f.citations.map(citationLabel).filter((c): c is SimulationCitation => c !== null),
    })),
  };
}

/** Narrows a stored passport_work_samples.summary back to the shape above. */
export function parseWorkSampleSummary(raw: unknown): SimulationReportSummary | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  if (typeof r.attemptId !== "string" || typeof r.title !== "string") return null;
  const evidence = Array.isArray(r.evidence)
    ? r.evidence.flatMap((e) => {
        if (!e || typeof e !== "object") return [];
        const item = e as Record<string, unknown>;
        if (typeof item.statement !== "string") return [];
        const citations = Array.isArray(item.citations)
          ? item.citations.flatMap((c) => {
              if (!c || typeof c !== "object") return [];
              const cc = c as Record<string, unknown>;
              const kind: SimulationCitation["kind"] | null =
                cc.kind === "file" || cc.kind === "message" || cc.kind === "handoff" || cc.kind === "public_check" ? cc.kind : null;
              return kind && typeof cc.label === "string" ? [{ kind, label: cc.label } satisfies SimulationCitation] : [];
            })
          : [];
        return [{ statement: item.statement, citations }];
      })
    : [];
  return {
    attemptId: r.attemptId,
    title: r.title,
    releasedAt: typeof r.releasedAt === "string" ? r.releasedAt : null,
    summary: typeof r.summary === "string" ? r.summary : "",
    investigated: list(r.investigated),
    clarified: list(r.clarified),
    changes: list(r.changes),
    checks: list(r.checks),
    feedbackEffect: list(r.feedbackEffect),
    unresolved: list(r.unresolved),
    evidence,
  };
}
