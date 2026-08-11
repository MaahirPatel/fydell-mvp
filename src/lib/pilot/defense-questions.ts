/** Pure oral-defense question builder (no DB). */

export interface EvidenceSeed {
  id: string;
  claim: string;
  competencyKey?: string;
}

/** Build 3–5 evidence-grounded oral-defense questions from scored evidence. */
export function buildDefenseQuestions(input: {
  strengths: string[];
  improvements: string[];
  evidence: EvidenceSeed[];
  residualSegmentHint?: string;
}): {
  question_text: string;
  purpose: string;
  source_evidence_ids: string[];
  expected_understanding: string;
}[] {
  const qs: {
    question_text: string;
    purpose: string;
    source_evidence_ids: string[];
    expected_understanding: string;
  }[] = [];

  const firstEv = input.evidence[0];
  if (firstEv) {
    qs.push({
      question_text: `Walk through how you arrived at: "${firstEv.claim.slice(0, 180)}". Which exact rows or definitions did you rely on?`,
      purpose: "Verify the candidate can explain a specific calculation or assumption from their work.",
      source_evidence_ids: [firstEv.id],
      expected_understanding:
        "Cites concrete source rows/definitions rather than restating the claim vaguely.",
    });
  }

  if (input.improvements[0]) {
    qs.push({
      question_text: `Your report noted a gap: "${input.improvements[0].slice(0, 180)}". How would you close that gap with one additional check?`,
      purpose: "Probe a gap or contradiction without inventing missing evidence.",
      source_evidence_ids: input.evidence.slice(0, 2).map((e) => e.id),
      expected_understanding: "Names a concrete validation step tied to the gap.",
    });
  }

  qs.push({
    question_text:
      input.residualSegmentHint ||
      "Why did you prioritize the segment you did for residual operational risk, rather than treating the whole plant as equal?",
    purpose: "Ask why a particular segment was prioritized.",
    source_evidence_ids: input.evidence.slice(0, 3).map((e) => e.id),
    expected_understanding: "Separates plant-wide measurement noise from a defensible segment.",
  });

  qs.push({
    question_text:
      "Counterfactual: if the reporting-code change had been restated in the prior period, what in your recommendation would change, and what would stay?",
    purpose: "Present one counterfactual and ask what would change.",
    source_evidence_ids: input.evidence.slice(0, 2).map((e) => e.id),
    expected_understanding:
      "Shows which conclusions depend on the reclass timing vs residual ops signal.",
  });

  qs.push({
    question_text:
      "What is the single next validation step you would run before the next shift huddle, and what result would change your mind?",
    purpose: "Ask how the candidate would validate the next step.",
    source_evidence_ids: input.evidence.slice(0, 2).map((e) => e.id),
    expected_understanding: "Gives a falsifiable next check with a decision rule.",
  });

  return qs.slice(0, 5);
}
