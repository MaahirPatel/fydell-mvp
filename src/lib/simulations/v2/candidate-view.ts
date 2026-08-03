/**
 * Candidate-safe projection of SimulationDefinitionV2.
 * Strips answer keys, rubric anchors, scoring weights, and opportunity weights.
 */
import type {
  CompetencyV2,
  SimulationDefinitionV2,
  SimulationModuleV2,
  StructuredDecisionModule,
  WrittenDeliverableModule,
} from "./types";

export interface CandidateStakeholderV2 {
  id: string;
  name: string;
  role: string;
  blurb: string;
}

export type CandidateModuleV2 =
  | Exclude<
      SimulationModuleV2,
      StructuredDecisionModule | WrittenDeliverableModule
    >
  | {
      id: string;
      kind: "structured_decision";
      prompt: string;
      helpText?: string;
      decisionKind: StructuredDecisionModule["decisionKind"];
      options?: string[];
      competencyKey: string;
    }
  | {
      id: string;
      kind: "written_deliverable";
      prompt: string;
      helpText?: string;
      maxChars?: number;
      competencyKey: string;
    };

export interface CandidateOpportunityV2 {
  id: string;
  competencyKey: string;
  label: string;
  requiredSignals: string[];
}

export interface CandidateSimulationViewV2 {
  format: "v2";
  schemaVersion: 2;
  id: string;
  slug: string;
  roleKey: string;
  title: string;
  tagline: string;
  mission: string;
  companyName: string;
  durationMinutes: number;
  version: number;
  modules: CandidateModuleV2[];
  competencies: CompetencyV2[];
  stakeholders: CandidateStakeholderV2[];
  /** Opportunity shells without weights. */
  opportunities: CandidateOpportunityV2[];
}

function stripModule(m: SimulationModuleV2): CandidateModuleV2 {
  if (m.kind === "structured_decision") {
    return {
      id: m.id,
      kind: "structured_decision",
      prompt: m.prompt,
      helpText: m.helpText,
      decisionKind: m.decisionKind,
      options: m.options,
      competencyKey: m.competencyKey,
    };
  }
  if (m.kind === "written_deliverable") {
    return {
      id: m.id,
      kind: "written_deliverable",
      prompt: m.prompt,
      helpText: m.helpText,
      maxChars: m.maxChars,
      competencyKey: m.competencyKey,
    };
  }
  if (m.kind === "stakeholder") {
    return {
      id: m.id,
      kind: "stakeholder",
      stakeholderId: m.stakeholderId,
      title: m.title,
    };
  }
  return { ...m };
}

/** Strips answer keys, rubric anchors, scoring weights, and opportunity weights. */
export function toV2CandidateView(def: SimulationDefinitionV2): CandidateSimulationViewV2 {
  return {
    format: "v2",
    schemaVersion: 2,
    id: def.id,
    slug: def.slug,
    roleKey: def.roleKey,
    title: def.title,
    tagline: def.tagline,
    mission: def.mission,
    companyName: def.companyName,
    durationMinutes: def.durationMinutes,
    version: def.version,
    modules: def.modules.map(stripModule),
    competencies: def.competencies.map((c) => ({ key: c.key, label: c.label })),
    stakeholders: def.stakeholders.map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      blurb: s.blurb,
    })),
    opportunities: def.scoring.opportunities.map((o) => ({
      id: o.id,
      competencyKey: o.competencyKey,
      label: o.label,
      requiredSignals: [...o.requiredSignals],
    })),
  };
}
