/**
 * Portable simulation-evidence summaries (PASS-09).
 *
 * A Fydell scenario produces a rich internal result (canonical.json style):
 * hidden tests, reference solutions, answer keys, employer notes. The
 * candidate-facing summary is built with an allowlist: only known-safe
 * fields are copied, everything else is dropped. The sanitizer also requires
 * scope, date and version so a summary can never circulate without them.
 *
 * Hidden tests and answer-leaking details can never pass through, because
 * the builder never reads them - there is no code path that copies an
 * unlisted key.
 */

import { redactSecrets } from "./github/redact";

export const SIM_EVIDENCE_VERSION = "simulation-evidence-v1";

export type SimulationDimension = {
  name: string;
  score: number;
  maxScore: number;
  band: string;
  note?: string;
};

export type SimulationEvidenceSummary = {
  format: typeof SIM_EVIDENCE_VERSION;
  scenarioId: string;
  scenarioName: string;
  scenarioVersion: string;
  completedAt: string;
  durationMinutes: number | null;
  dimensions: SimulationDimension[];
  publicTests: { passed: number; total: number } | null;
  candidateStatement: string | null;
};

const asString = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const asNumber = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

function cleanDimension(raw: unknown): SimulationDimension | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const name = asString(r.name);
  const score = asNumber(r.score);
  const maxScore = asNumber(r.maxScore);
  const band = asString(r.band);
  if (!name || score === null || maxScore === null || !band) return null;
  const note = asString(r.note);
  return {
    name: name.slice(0, 80),
    score,
    maxScore,
    band: band.slice(0, 40),
    note: note ? redactSecrets(note).slice(0, 300) : undefined,
  };
}

/**
 * Builds the candidate-facing summary from an internal scenario result.
 * Returns `{ error }` when the result lacks the required scope/date/version,
 * so an incomplete record can never be published.
 */
export function buildSimulationEvidenceSummary(
  input: unknown,
): { ok: true; summary: SimulationEvidenceSummary } | { ok: false; error: string } {
  if (typeof input !== "object" || input === null) return { ok: false, error: "A scenario result object is required." };
  const r = input as Record<string, unknown>;

  const scenarioId = asString(r.scenarioId ?? r.scenario_id);
  const scenarioVersion = asString(r.scenarioVersion ?? r.scenario_version);
  const completedAt = asString(r.completedAt ?? r.completed_at ?? r.submittedAt);
  if (!scenarioId) return { ok: false, error: "Scenario id is required." };
  if (!scenarioVersion) return { ok: false, error: "Scenario version is required." };
  if (!completedAt || Number.isNaN(new Date(completedAt).getTime())) {
    return { ok: false, error: "A valid completion date is required." };
  }

  const dimensions = Array.isArray(r.dimensions)
    ? (r.dimensions.map(cleanDimension).filter(Boolean) as SimulationDimension[])
    : [];
  const publicTests =
    typeof r.publicTests === "object" && r.publicTests !== null
      ? (() => {
          const t = r.publicTests as Record<string, unknown>;
          const passed = asNumber(t.passed);
          const total = asNumber(t.total);
          return passed !== null && total !== null ? { passed, total } : null;
        })()
      : null;

  const summary: SimulationEvidenceSummary = {
    format: SIM_EVIDENCE_VERSION,
    scenarioId,
    scenarioName: asString(r.scenarioName ?? r.scenario_name) ?? scenarioId,
    scenarioVersion,
    completedAt: new Date(completedAt).toISOString(),
    durationMinutes: asNumber(r.durationMinutes ?? r.duration_minutes),
    dimensions,
    publicTests,
    candidateStatement: (() => {
      const s = asString(r.candidateStatement ?? r.candidate_statement);
      return s ? redactSecrets(s).slice(0, 2000) : null;
    })(),
  };
  return { ok: true, summary };
}
