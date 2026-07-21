/**
 * Evidence credibility math for employer reports (never shown to candidates as scores).
 * θ̂_c = U_c θ_c + (1-U_c) μ_c with separate confidence.
 */

export type EvidenceAtom = {
  id: string;
  competency: string;
  /** [-1,1] */
  alignment: number;
  /** [0,1] */
  diagnosticity: number;
  qSource: number;
  qDirectness: number;
  qRecency: number;
  qIntegrity: number;
  qRelevance: number;
};

export type CompetencyReport = {
  competency: string;
  state:
    | "strong_evidence"
    | "moderate_evidence"
    | "mixed_evidence"
    | "limited_evidence"
    | "insufficient_evidence";
  estimate: number;
  confidence: number;
  supportingIds: string[];
  contradictingIds: string[];
  claim: string;
};

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function quality(e: EvidenceAtom): number {
  return e.qSource * e.qDirectness * e.qRecency * e.qIntegrity * e.qRelevance;
}

export function scoreCompetency(
  competency: string,
  atoms: EvidenceAtom[],
  opts?: { tau?: number; kappa?: number; alpha?: number; lambda?: number; mu?: number; m?: number; h?: number }
): CompetencyReport {
  const tau = opts?.tau ?? 2;
  const kappa = opts?.kappa ?? 2;
  const alpha = opts?.alpha ?? 0;
  const lambda = opts?.lambda ?? 1;
  const mu = opts?.mu ?? 0.5;
  const m = opts?.m ?? 3;
  const h = opts?.h ?? 2;

  const relevant = atoms.filter((a) => a.competency === competency);
  let S = 0;
  let N = 0;
  const supporting: string[] = [];
  const contradicting: string[] = [];

  for (const e of relevant) {
    const q = quality(e);
    const z = q * e.alignment * e.diagnosticity;
    if (z >= 0) {
      S += z;
      supporting.push(e.id);
    } else {
      N += -z;
      contradicting.push(e.id);
    }
  }

  const E = 1 - Math.exp(-S / tau);
  const B = 1 - Math.exp(-N / kappa);
  void E;
  void B;
  const theta = sigmoid(alpha + S - lambda * N);
  const nSources = new Set(relevant.map((a) => a.id.split(":")[0])).size;
  const scenarioCoverage = Math.min(1, relevant.length / h);
  const U = Math.min(1, nSources / m) * Math.min(1, scenarioCoverage);
  const estimate = U * theta + (1 - U) * mu;
  const confidence = U * 0.85 * (relevant.every((a) => a.qIntegrity > 0.5) ? 1 : 0.7);

  let state: CompetencyReport["state"] = "insufficient_evidence";
  if (confidence < 0.25 || relevant.length === 0) state = "insufficient_evidence";
  else if (N > S * 0.6 && S > 0.2) state = "mixed_evidence";
  else if (confidence >= 0.7 && estimate >= 0.65) state = "strong_evidence";
  else if (confidence >= 0.45 && estimate >= 0.55) state = "moderate_evidence";
  else state = "limited_evidence";

  return {
    competency,
    state,
    estimate,
    confidence,
    supportingIds: supporting,
    contradictingIds: contradicting,
    claim: `${competency}: ${state.replace(/_/g, " ")} (confidence ${confidence.toFixed(2)})`,
  };
}

export function atomsFromEngineEvents(
  events: { id: string; event_type: string; payload: Record<string, unknown> }[]
): EvidenceAtom[] {
  const atoms: EvidenceAtom[] = [];
  for (const e of events) {
    if (e.event_type === "dataset.cell_updated" || e.event_type === "file.patch_applied") {
      atoms.push({
        id: `${e.id}:data_integrity`,
        competency: "data_integrity",
        alignment: 0.4,
        diagnosticity: 0.5,
        qSource: 1,
        qDirectness: 0.8,
        qRecency: 1,
        qIntegrity: 1,
        qRelevance: 0.7,
      });
    }
    if (e.event_type === "tests.completed" && e.payload.ok === true) {
      atoms.push({
        id: `${e.id}:verification`,
        competency: "verification",
        alignment: 0.8,
        diagnosticity: 0.9,
        qSource: 1,
        qDirectness: 1,
        qRecency: 1,
        qIntegrity: 1,
        qRelevance: 1,
      });
    }
    if (e.event_type === "message.sent") {
      atoms.push({
        id: `${e.id}:customer_communication`,
        competency: "customer_communication",
        alignment: 0.5,
        diagnosticity: 0.4,
        qSource: 1,
        qDirectness: 0.7,
        qRecency: 1,
        qIntegrity: 1,
        qRelevance: 0.6,
      });
    }
    if (e.event_type === "ai.patch_accepted") {
      atoms.push({
        id: `${e.id}:ai_judgment`,
        competency: "ai_judgment",
        alignment: 0.2,
        diagnosticity: 0.5,
        qSource: 1,
        qDirectness: 0.6,
        qRecency: 1,
        qIntegrity: 1,
        qRelevance: 0.5,
      });
    }
    if (e.event_type === "curveball.acknowledged") {
      atoms.push({
        id: `${e.id}:adaptation`,
        competency: "adaptation",
        alignment: 0.5,
        diagnosticity: 0.5,
        qSource: 1,
        qDirectness: 0.7,
        qRecency: 1,
        qIntegrity: 1,
        qRelevance: 0.7,
      });
    }
  }
  return atoms;
}
