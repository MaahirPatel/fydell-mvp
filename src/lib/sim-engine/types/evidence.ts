/**
 * Evidence distinguishes observation (what happened) from inference (interpretation).
 */
export type CompetencyOutcome =
  | "DEMONSTRATED"
  | "PARTIALLY_DEMONSTRATED"
  | "CONCERN"
  | "INSUFFICIENT_EVIDENCE";

export interface EvidenceObservation {
  id: string;
  kind: "OBSERVATION";
  statement: string;
  sourceEventIds: string[];
  sourceArtifactIds: string[];
}

export interface EvidenceInference {
  id: string;
  kind: "INFERENCE";
  statement: string;
  confidence: number;
  observationIds: string[];
  competencyId?: string;
}

export type EvidenceItem = EvidenceObservation | EvidenceInference;

export interface CompetencyEvidence {
  competencyId: string;
  label: string;
  outcome: CompetencyOutcome;
  confidence: number;
  observations: EvidenceObservation[];
  inferences: EvidenceInference[];
  strengths: string[];
  concerns: string[];
  supportingEventIds: string[];
  supportingArtifactIds: string[];
}

export type AnalysisSectionKind =
  | "summary"
  | "capabilities"
  | "work_produced"
  | "execution"
  | "communication"
  | "ai_usage"
  | "investigation"
  | "follow_up"
  | "raw_evidence";

export interface AnalysisSection {
  kind: AnalysisSectionKind;
  title: string;
  /** Omit empty sections from employer UI. */
  hasContent: boolean;
  body: string;
  items?: Array<{
    id: string;
    label: string;
    detail?: string;
    eventIds?: string[];
    artifactIds?: string[];
  }>;
}

export interface PlaybackEntry {
  elapsedMs: number;
  timestamp: number;
  label: string;
  category: "code" | "ai" | "communication" | "execution" | "navigation" | "integrity" | "system";
  eventId: string;
  detail?: string;
}

export interface AnalysisResult {
  attemptId: string;
  versions: {
    scenarioVersion: string;
    engineVersion: string;
    competencyModelVersion: string;
    evidenceDerivationVersion: string;
    analysisVersion: string;
  };
  generatedAt: number;
  competencies: CompetencyEvidence[];
  observations: EvidenceObservation[];
  inferences: EvidenceInference[];
  sections: AnalysisSection[];
  playback: PlaybackEntry[];
  /** Present only when enough evidence exists — never invented. */
  overallNarrative: string;
}
