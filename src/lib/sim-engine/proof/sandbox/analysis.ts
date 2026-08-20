import type { EvidenceClaimDraft, RunSnapshot } from "../types";
import { ACME_ROLLOUT_FIXTURE } from "./fixture";

const MODEL = "sandbox_rules_v1";
const PROMPT = "sandbox_evidence_v1";

function idsFor(snapshot: RunSnapshot, type: string, extra?: (payload: Record<string, unknown>) => boolean): string[] {
  return snapshot.events
    .filter((event) => event.event_type === type && (!extra || extra(event.payload ?? {})))
    .map((event) => event.id);
}

export function analyzePassA(snapshot: RunSnapshot): {
  claims: EvidenceClaimDraft[];
  defensePrompt: string;
  defenseTarget: string;
  observations: string[];
  uncertainties: string[];
} {
  const fixture = ACME_ROLLOUT_FIXTURE;
  const decisionIds = idsFor(snapshot, "DECISION_COMMITTED");
  const revisionIds = idsFor(snapshot, "ARTIFACT_REVISION");
  const factIds = idsFor(snapshot, "FACT_RELEASED");
  const support = [...revisionIds, ...decisionIds, ...factIds];
  const rec = snapshot.artifact?.recommendation ?? "";
  const adapted = rec.toLowerCase().includes("sandbox") && rec.toLowerCase().includes("defer");
  const claims: EvidenceClaimDraft[] = [
    {
      claim: adapted
        ? "Candidate revised the rollout after the six-week production block and moved enablement to sandbox."
        : "Candidate submitted a rollout recommendation, but the revision does not clearly defer production access.",
      competency: "Adaptation",
      direction: adapted ? "STRENGTH" : "CONCERN",
      confidence: "HIGH",
      supporting_event_ids: support,
      counterevidence_event_ids: [],
      rubric_version: fixture.rubric.version,
      prompt_version: PROMPT,
      model_version: MODEL,
    },
    {
      claim: "The 200-user weekly-active figure remains an unverified sponsor estimate.",
      competency: "Discovery judgment",
      direction: "CONCERN",
      confidence: "HIGH",
      supporting_event_ids: support,
      counterevidence_event_ids: [],
      rubric_version: fixture.rubric.version,
      prompt_version: PROMPT,
      model_version: MODEL,
    },
  ];
  return {
    claims,
    defensePrompt: fixture.defenseQuestion.prompt,
    defenseTarget: fixture.defenseQuestion.target,
    observations: [
      "Initial recommendation sized the first cohort from a sponsor license estimate.",
      "Security review blocks production access for six weeks.",
    ],
    uncertainties: fixture.unverifiedAssumptions,
  };
}

export function analyzePassB(snapshot: RunSnapshot): {
  claims: EvidenceClaimDraft[];
  brief: {
    recommendation: "INTERVIEW" | "HOLD" | "INSUFFICIENT_EVIDENCE";
    why: string;
    strengths: string[];
    concerns: string[];
    probes: string[];
  };
} {
  const passA = analyzePassA(snapshot);
  const fixture = ACME_ROLLOUT_FIXTURE;
  const defenseIds = idsFor(snapshot, "DEFENSE_RESPONSE_RECEIVED");
  const defenseText = snapshot.defense.map((row) => row.response).join(" ").toLowerCase();
  const testedAssumption =
    defenseText.includes("active-user") ||
    defenseText.includes("weekly") ||
    defenseText.includes("directional") ||
    defenseText.includes("smaller");
  const defenseClaim: EvidenceClaimDraft = {
    claim: testedAssumption
      ? "In oral defense, the candidate refused to size the first production cohort from an unverified sponsor estimate."
      : "The oral defense did not explain how the sponsor adoption estimate would be tested.",
    competency: "Commercial judgment",
    direction: testedAssumption ? "STRENGTH" : "CONCERN",
    confidence: "MODERATE",
    supporting_event_ids: defenseIds.length > 0 ? defenseIds : passA.claims[0]?.supporting_event_ids ?? [],
    counterevidence_event_ids: passA.claims[1] ? passA.claims[1].supporting_event_ids : [],
    rubric_version: fixture.rubric.version,
    prompt_version: PROMPT,
    model_version: MODEL,
  };
  const claims = [
    ...passA.claims.map((claim) => ({
      ...claim,
      counterevidence_event_ids: claim.competency === "Discovery judgment" ? claim.supporting_event_ids : claim.counterevidence_event_ids,
    })),
    defenseClaim,
  ];
  return {
    claims,
    brief: {
      recommendation: testedAssumption ? "INTERVIEW" : "HOLD",
      why: testedAssumption
        ? "The candidate adapted the rollout to the six-week production block and treated the sponsor WAU figure as an assumption to test. Interview to confirm they can run that verification with a real customer."
        : "The candidate hit the security constraint, but the adoption assumption is still untested. Hold until that gap is probed.",
      strengths: testedAssumption
        ? ["Revised production timing after the security constraint", "Kept enablement moving in sandbox"]
        : ["Recorded a rollout recommendation"],
      concerns: ["Sponsor 200-user WAU estimate was never measured"],
      probes: [fixture.defenseQuestion.prompt],
    },
  };
}
