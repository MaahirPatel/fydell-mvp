import "server-only";
/**
 * Candidate-safe projection of simulation content.
 *
 * The full SimulationContent document contains evaluator-only material:
 * answer keys, deterministic checks, rubric anchors, stakeholder knowledge /
 * withholds / response rules. None of that may reach the browser.
 */
import type {
  DeliverableField,
  SimulationContent,
  SimulationCurveball,
  SimulationResource,
  TaskStep,
  WorkspaceTool,
} from "./types";
import type { MicroSimContent } from "./micro-types";

export interface CandidateStakeholder {
  id: string;
  name: string;
  role: string;
  blurb: string;
}

export interface CandidateSimulationView {
  slug: string;
  roleKey: string;
  title: string;
  scenarioSummary: string;
  mission: string;
  companyName: string;
  durationMinutes: number;
  toolsAvailable: string[];
  workspaceTools: WorkspaceTool[];
  tasks: TaskStep[];
  resources: SimulationResource[];
  stakeholders: CandidateStakeholder[];
  deliverableFields: DeliverableField[];
  /** Announcement only; trigger conditions stay server-side. */
  curveball: Pick<SimulationCurveball, "id" | "stakeholderId" | "announcement" | "requiredAdaptation"> | null;
}

export function toCandidateView(
  content: SimulationContent,
  opts: { curveballPresented: boolean }
): CandidateSimulationView {
  return {
    slug: content.slug,
    roleKey: content.roleKey,
    title: content.title,
    scenarioSummary: content.scenarioSummary,
    mission: content.mission,
    companyName: content.companyName,
    durationMinutes: content.durationMinutes,
    toolsAvailable: content.toolsAvailable,
    workspaceTools: content.workspaceTools,
    tasks: content.tasks,
    resources: content.resources,
    stakeholders: content.stakeholders.map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      blurb: s.blurb,
    })),
    deliverableFields: content.deliverableFields,
    curveball: opts.curveballPresented
      ? {
          id: content.curveball.id,
          stakeholderId: content.curveball.stakeholderId,
          announcement: content.curveball.announcement,
          requiredAdaptation: content.curveball.requiredAdaptation,
        }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Micro (five-minute) simulations
// ---------------------------------------------------------------------------
export interface MicroCandidateQuestion {
  id: string;
  kind: string;
  prompt: string;
  helpText?: string;
  options?: string[];
  maxChars?: number;
  points: number;
}

export interface MicroCandidateView {
  format: "micro";
  slug: string;
  roleKey: string;
  title: string;
  tagline: string;
  mission: string;
  companyName: string;
  durationMinutes: number;
  resources: { id: string; title: string; kind: string; content: string }[];
  stakeholder: { id: string; name: string; role: string; blurb: string };
  questions: MicroCandidateQuestion[];
}

/** Strips answer keys, concept checklists and stakeholder internals. */
export function toMicroCandidateView(sim: MicroSimContent): MicroCandidateView {
  const s = sim.stakeholders[0];
  return {
    format: "micro",
    slug: sim.slug,
    roleKey: sim.roleKey,
    title: sim.title,
    tagline: sim.tagline,
    mission: sim.mission,
    companyName: sim.companyName,
    durationMinutes: sim.durationMinutes,
    resources: sim.resources.map((r) => ({
      id: r.id,
      title: r.title,
      kind: r.kind,
      content: r.content,
    })),
    stakeholder: { id: s.id, name: s.name, role: s.role, blurb: s.blurb },
    questions: sim.questions.map((q) => ({
      id: q.id,
      kind: q.kind,
      prompt: q.prompt,
      helpText: q.helpText,
      options: q.options,
      maxChars: q.maxChars,
      points: q.points,
    })),
  };
}

/** Public catalog card (marketing + employer catalog). */
export interface CatalogCard {
  slug: string;
  roleKey: string;
  title: string;
  scenarioSummary: string;
  durationMinutes: number;
  difficulty: string;
  toolsAvailable: string[];
  competencies: { key: string; label: string }[];
  resourceCount: number;
}

export function toCatalogCard(content: SimulationContent | MicroSimContent): CatalogCard {
  if ((content as MicroSimContent).format === "micro") {
    const m = content as MicroSimContent;
    return {
      slug: m.slug,
      roleKey: m.roleKey,
      title: m.title,
      scenarioSummary: m.tagline,
      durationMinutes: m.durationMinutes,
      difficulty: "standard",
      toolsAvailable: [],
      competencies: m.competencies.map((c) => ({ key: c.key, label: c.label })),
      resourceCount: m.resources.length,
    };
  }
  const c = content as SimulationContent;
  return {
    slug: c.slug,
    roleKey: c.roleKey,
    title: c.title,
    scenarioSummary: c.scenarioSummary,
    durationMinutes: c.durationMinutes,
    difficulty: c.difficulty,
    toolsAvailable: c.toolsAvailable,
    competencies: c.competencies.map((cc) => ({ key: cc.key, label: cc.label })),
    resourceCount: c.resources.length,
  };
}
