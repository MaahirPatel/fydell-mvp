/**
 * Employer chunk — EMP-02: preview the assessment.
 *
 * Before sending an invite, the employer sees what the candidate will see:
 * candidate instructions, required tools, expected effort, the rubric, the
 * supported scope, and a pointer to an example report. The preview is
 * assembled from the same pinned scenario content the candidate receives,
 * so preview and reality cannot drift.
 */

export interface PreviewScenario {
  title: string;
  mission: string; // candidate-facing instructions
  durationMinutes: number;
  requiredTools: string[];
  resources: { title: string; kind: string }[];
  questions: { prompt: string; kind: string; points: number }[];
  aiPolicy: string;
  versionLabel: string;
}

export interface PreviewRubric {
  versionLabel: string;
  dimensions: { label: string; description: string; weight: number }[];
}

export interface AssessmentPreview {
  scenarioTitle: string;
  scenarioVersion: string;
  candidateInstructions: string;
  requiredTools: string[];
  expectedEffort: string;
  supportedScope: string[];
  rubricVersion: string;
  rubricDimensions: { label: string; description: string; weight: number }[];
  evaluationFlow: string[];
  exampleReport: { reportId: string; note: string } | null;
  aiPolicy: string;
}

export function assembleAssessmentPreview(input: {
  scenario: PreviewScenario;
  rubric: PreviewRubric;
  exampleReportId?: string | null;
}): AssessmentPreview {
  const { scenario, rubric } = input;
  return {
    scenarioTitle: scenario.title,
    scenarioVersion: scenario.versionLabel,
    candidateInstructions: scenario.mission,
    requiredTools: scenario.requiredTools,
    expectedEffort: `About ${scenario.durationMinutes} minutes of focused work, plus setup and submission.`,
    supportedScope: scenario.resources.map((r) => `${r.title} (${r.kind})`),
    rubricVersion: rubric.versionLabel,
    rubricDimensions: rubric.dimensions,
    evaluationFlow: [
      "Candidate accepts the invite and provisions the workspace (pinned scenario version).",
      "Candidate works through the brief; public tests and teammate context are available.",
      "Candidate submits; analysis runs against the pinned rubric version.",
      "Consequential findings are human-reviewed before the report is released.",
      "Employer receives the decision brief with evidence links.",
    ],
    exampleReport: input.exampleReportId
      ? {
          reportId: input.exampleReportId,
          note: "Example report from labeled sample data — not a real candidate.",
        }
      : null,
    aiPolicy: scenario.aiPolicy,
  };
}
