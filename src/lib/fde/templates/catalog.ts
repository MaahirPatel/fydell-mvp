/**
 * Platform-owned Fydell templates. Visible to every org in the Simulation Library.
 * Not copied into organization data until the employer chooses "Use template".
 */
import type { EmployerIntake } from "@/lib/fde/generator";
import type { TraitId } from "@/lib/fde/evidence/traits";

export type FydellTemplateCard = {
  id: string;
  title: string;
  summary: string;
  roleFamily: "fde";
  roleTitle: string;
  seniority: string;
  durationMinutes: number;
  durationLabel: string;
  aiPolicyLabel: string;
  scenarioFamily: string;
  competencies: string[];
  badge: string;
  /** Stable seed so "Use template" is deterministic across orgs. */
  seed: string;
  intake: EmployerIntake;
};

const FLAGSHIP_WEIGHTS: Partial<Record<TraitId, number>> = {
  elicitation: 70,
  contradiction_handling: 65,
  data_integrity_vigilance: 90,
  scope_renegotiation: 70,
  technical_execution: 75,
  ai_tool_judgment: 55,
  verification_discipline: 85,
  limitation_honesty: 60,
  prioritization_under_pressure: 70,
  communication_translation: 65,
};

export const ENTERPRISE_ANALYTICS_DEPLOYMENT_RECOVERY: FydellTemplateCard = {
  id: "fydell-enterprise-analytics-deployment-recovery",
  title: "Enterprise Analytics Deployment Recovery",
  summary:
    "Recover a failing enterprise analytics deployment, identify the true root cause across configuration and identity boundaries, restore service safely, and communicate a credible rollout plan.",
  roleFamily: "fde",
  roleTitle: "Forward Deployed Engineer",
  seniority: "mid-to-senior",
  durationMinutes: 75,
  durationLabel: "75–90 min",
  aiPolicyLabel: "AI allowed and observed",
  scenarioFamily: "deployment_recovery",
  competencies: [
    "Diagnostic reasoning",
    "Systems judgment",
    "Verification",
    "Prioritization",
    "Customer communication",
    "Adaptability",
    "AI-use quality",
  ],
  badge: "FDE • 75–90 min • AI allowed and observed",
  seed: "fydell-template-eadr-v1",
  intake: {
    title: "Enterprise Analytics Deployment Recovery",
    objective:
      "Recover a failing enterprise analytics deployment for Northbeam Retail Analytics. Discriminate configuration, identity, data, and code causes; restore production safely; verify; communicate a scoped rollout plan.",
    customerContext:
      "Fictional customer Northbeam Retail Analytics. Staging succeeds; production fails intermittently after identity/region migration. Stakeholders disagree on root cause. Distractors exist. Mid-session constraint change from security.",
    industry: "saas",
    durationMinutes: 75,
    aiPolicy: "allowed_observed",
    criticalTraits: [
      "data_integrity_vigilance",
      "verification_discipline",
      "elicitation",
      "technical_execution",
    ],
    skillWeights: FLAGSHIP_WEIGHTS,
  },
};

/** All platform templates shown in Recommended by Fydell. */
export const FYDELL_TEMPLATES: FydellTemplateCard[] = [
  ENTERPRISE_ANALYTICS_DEPLOYMENT_RECOVERY,
];

export function getFydellTemplate(id: string): FydellTemplateCard | null {
  return FYDELL_TEMPLATES.find((t) => t.id === id) || null;
}
