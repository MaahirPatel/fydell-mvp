/**
 * Adapter: MicroSimContent → SimulationDefinitionV2.
 * Preserves legacyMicro for scoring fallback during migration.
 * Emits role-specific workbench modules for flagship runtimes.
 */
import type { MicroQuestion, MicroSimContent } from "../micro-types";
import type {
  CutoverStepV2,
  EvidenceOpportunity,
  RubricIndicator,
  SimulationDefinitionV2,
  SimulationModuleV2,
  StructuredDecisionModule,
  WrittenDeliverableModule,
} from "./types";

type MicroResource = MicroSimContent["resources"][number];

const DATA_ROLES = new Set(["data_analyst", "bi_analyst"]);

function questionSignal(q: MicroQuestion): string {
  if (q.kind === "multi_select") return `evidence_selected:${q.id}`;
  if (q.kind === "text") return `deliverable_revised:${q.id}`;
  return `decision_selected:${q.id}`;
}

function questionLabel(q: MicroQuestion): string {
  if (q.kind === "multi_select") return `Evidence: ${q.prompt}`;
  if (q.kind === "text") return `Deliverable: ${q.prompt}`;
  return `Decision: ${q.prompt}`;
}

function toDecisionModule(q: MicroQuestion): StructuredDecisionModule {
  return {
    id: q.id,
    kind: "structured_decision",
    prompt: q.prompt,
    helpText: q.helpText,
    decisionKind: q.kind as StructuredDecisionModule["decisionKind"],
    options: q.options,
    competencyKey: q.competencyKey,
    expectedEvidence: q.expectedEvidence,
    points: q.points,
    answer: q.answer ? [...q.answer] : undefined,
  };
}

function toWrittenModule(q: MicroQuestion): WrittenDeliverableModule {
  return {
    id: q.id,
    kind: "written_deliverable",
    prompt: q.prompt,
    helpText: q.helpText,
    maxChars: q.maxChars,
    competencyKey: q.competencyKey,
    expectedEvidence: q.expectedEvidence,
    points: q.points,
    concepts: q.concepts ? q.concepts.map((c) => ({ ...c })) : undefined,
  };
}

function buildIndicators(
  sim: MicroSimContent,
  opportunityCompetencies: Set<string>
): RubricIndicator[] {
  // Only emit indicators for competencies that have evidence opportunities.
  // Marketing competency lists may include skills not directly scored.
  const keys = sim.competencies
    .map((c) => c.key)
    .filter((k) => opportunityCompetencies.has(k));
  const source = keys.length
    ? sim.competencies.filter((c) => opportunityCompetencies.has(c.key))
    : sim.competencies;

  return source.map((c) => {
    const related = sim.questions.filter((q) => q.competencyKey === c.key);
    const strong =
      related.map((q) => q.expectedEvidence).filter(Boolean).join(" ") ||
      `Strong demonstration of ${c.label.toLowerCase()}.`;
    return {
      id: `ind_${c.key}`,
      competencyKey: c.key,
      weight: 1,
      anchors: {
        strong,
        partial: `Partial or incomplete demonstration of ${c.label.toLowerCase()}.`,
        weak: `Little or no usable evidence for ${c.label.toLowerCase()}.`,
      },
    };
  });
}

function matchesResource(r: MicroResource, ...needles: string[]): boolean {
  const hay = `${r.id} ${r.title}`.toLowerCase();
  return needles.some((n) => hay.includes(n));
}

const SKIP_CUTOVER_HEADINGS = /^(import requirements|behavior|notes|overview|summary|context)$/i;

/** Pull markdown list items and milestone headings into cutover steps. */
function buildCutoverSteps(resources: MicroResource[]): CutoverStepV2[] {
  const steps: CutoverStepV2[] = [];
  const seen = new Set<string>();

  const push = (label: string, detail?: string) => {
    let cleaned = label.replace(/\*\*/g, "").replace(/`/g, "").trim();
    if (!cleaned || cleaned.length < 3) return;
    if (cleaned.length > 120) cleaned = `${cleaned.slice(0, 117).trimEnd()}…`;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    steps.push({
      id: `step_${steps.length + 1}`,
      label: cleaned,
      detail,
    });
  };

  for (const r of resources) {
    if (r.kind === "table") continue;
    const lines = r.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const bullet = line.match(/^\s*[-*]\s+(.+)$/);
      if (bullet) {
        push(bullet[1], r.title);
        continue;
      }
      const heading = line.match(/^##\s+(.+)$/);
      if (!heading) continue;
      const title = heading[1].trim();
      if (SKIP_CUTOVER_HEADINGS.test(title)) {
        // Prefer the first prose line under generic section headings.
        let j = i + 1;
        while (j < lines.length && !lines[j].trim()) j++;
        if (j < lines.length && !lines[j].startsWith("#") && !/^\s*[-*]/.test(lines[j])) {
          push(lines[j].replace(/\*\*/g, "").trim(), r.title);
        }
        continue;
      }
      push(title, r.title);
    }
  }

  if (steps.length === 0) {
    for (const r of resources) {
      push(`Review: ${r.title}`);
    }
    push("Validate final counts before go-live");
  }

  return steps;
}

function orderResourcesForRole(roleKey: string, resources: MicroResource[]): MicroResource[] {
  // BI: surface metric / definition docs before raw tables.
  if (roleKey === "bi_analyst") {
    const docs = resources.filter((r) => r.kind !== "table");
    const tables = resources.filter((r) => r.kind === "table");
    return [...docs, ...tables];
  }
  return resources;
}

function appendRoleWorkbench(
  sim: MicroSimContent,
  modules: SimulationModuleV2[],
  tableResourceIds: string[]
): void {
  const role = sim.roleKey;

  if (DATA_ROLES.has(role) && tableResourceIds.length > 0) {
    modules.push({
      id: "workbench",
      kind: "data_workbench",
      title: role === "bi_analyst" ? "Metric workbench" : "Data workbench",
      instructions:
        role === "bi_analyst"
          ? "Start with the metric definition docs, then inspect the linked tables and flag rows that support your decision."
          : "Inspect the linked tables, sort or filter as needed, and flag rows that support your decision.",
      tableResourceIds: [...tableResourceIds],
    });
    return;
  }

  if (role === "solutions_engineer") {
    const req =
      sim.resources.find((r) => matchesResource(r, "requirement")) ||
      sim.resources.find((r) => r.kind !== "table");
    const caps =
      sim.resources.find((r) => matchesResource(r, "capacit", "product")) ||
      sim.resources.find((r) => r.kind === "table");
    if (req && caps) {
      modules.push({
        id: "requirements_board",
        kind: "requirements_board",
        title: "Requirements vs capabilities",
        instructions:
          "Map each customer requirement to product support. Flag gaps before you commit an architecture.",
        requirementsResourceId: req.id,
        capabilitiesResourceId: caps.id,
      });
    }
    return;
  }

  if (role === "technical_support_engineer") {
    const tickets =
      sim.resources.find((r) => matchesResource(r, "ticket")) ||
      sim.resources.find((r) => r.kind === "table");
    if (tickets) {
      modules.push({
        id: "ticket_queue",
        kind: "ticket_queue",
        title: "Ticket queue",
        instructions: "Triage by severity. Select a ticket to inspect the report detail.",
        ticketResourceId: tickets.id,
      });
    }
    return;
  }

  if (role === "implementation_consultant") {
    const planSources = sim.resources.filter(
      (r) =>
        r.kind !== "table" ||
        matchesResource(r, "timeline", "rule", "launch", "import")
    );
    const markdownSources = planSources.filter((r) => r.kind !== "table");
    const sourceIds = (markdownSources.length ? markdownSources : sim.resources).map((r) => r.id);
    modules.push({
      id: "cutover_plan",
      kind: "cutover_plan",
      title: "Cutover checklist",
      instructions:
        "Work the dependency steps in order. Toggle each step as you confirm it before go-live.",
      steps: buildCutoverSteps(markdownSources.length ? markdownSources : sim.resources),
      sourceResourceIds: sourceIds,
    });
    return;
  }

  if (role === "business_systems_analyst") {
    const rules =
      sim.resources.find((r) => matchesResource(r, "rule", "approval")) ||
      sim.resources.find((r) => r.kind === "table");
    if (rules) {
      const contextIds = sim.resources
        .filter((r) => r.id !== rules.id && matchesResource(r, "system", "note", "policy", "vendor"))
        .map((r) => r.id);
      modules.push({
        id: "rules_panel",
        kind: "rules_panel",
        title: "Workflow rules",
        instructions:
          "Review each rule in evaluation order. Expand a rule to see its condition and routing.",
        rulesResourceId: rules.id,
        contextResourceIds: contextIds.length ? contextIds : undefined,
      });
    }
  }
}

/**
 * Convert a micro simulation into a v2 definition.
 * Does not mutate the input; nests a shallow copy under legacyMicro.
 */
export function microToV2(sim: MicroSimContent): SimulationDefinitionV2 {
  const modules: SimulationModuleV2[] = [];

  modules.push({
    id: "briefing",
    kind: "briefing",
    title: "Mission",
    body: sim.mission,
  });

  const orderedResources = orderResourcesForRole(sim.roleKey, sim.resources);
  const tableResourceIds: string[] = [];
  for (const r of orderedResources) {
    if (r.kind === "table") {
      tableResourceIds.push(r.id);
      modules.push({
        id: `resource_${r.id}`,
        kind: "resource_table",
        resourceId: r.id,
        title: r.title,
        content: r.content,
      });
    } else {
      modules.push({
        id: `resource_${r.id}`,
        kind: "resource_doc",
        resourceId: r.id,
        title: r.title,
        content: r.content,
      });
    }
  }

  // Preserve original table discovery order for DA workbench when BI reordered docs first.
  const allTableIds = sim.resources.filter((r) => r.kind === "table").map((r) => r.id);
  appendRoleWorkbench(sim, modules, allTableIds);

  for (const q of sim.questions) {
    if (q.kind === "text") modules.push(toWrittenModule(q));
    else modules.push(toDecisionModule(q));
  }

  const stakeholder = sim.stakeholders[0];
  if (stakeholder) {
    modules.push({
      id: "stakeholder",
      kind: "stakeholder",
      stakeholderId: stakeholder.id,
      title: `Ask ${stakeholder.name}`,
      competencyKey: sim.stakeholderCompetencyKey,
      points: sim.stakeholderPoints,
    });
  }

  if (sim.curveball) {
    modules.push({
      id: sim.curveball.id,
      kind: "curveball",
      announcement: sim.curveball.announcement,
      requiredAdaptation: sim.curveball.requiredAdaptation,
      stakeholderId: sim.curveball.stakeholderId,
    });
  }

  // Opportunity weights: questions + stakeholder keep their point shares;
  // a small shared resources opportunity is carved from 10% of total mass.
  const questionStakeTotal =
    sim.questions.reduce((s, q) => s + q.points, 0) + sim.stakeholderPoints;
  const resourceShare = 0.1;
  const primaryScale = questionStakeTotal > 0 ? (1 - resourceShare) / questionStakeTotal : 0;

  const opportunities: EvidenceOpportunity[] = [];

  for (const q of sim.questions) {
    opportunities.push({
      id: `opp_${q.id}`,
      competencyKey: q.competencyKey,
      weight: Math.round(q.points * primaryScale * 10000) / 10000,
      label: questionLabel(q),
      requiredSignals: [questionSignal(q)],
    });
  }

  if (stakeholder) {
    opportunities.push({
      id: "opp_stakeholder",
      competencyKey: sim.stakeholderCompetencyKey,
      weight: Math.round(sim.stakeholderPoints * primaryScale * 10000) / 10000,
      label: "Stakeholder clarification",
      requiredSignals: ["stakeholder_message_sent", "stakeholder_reply_received"],
    });
  }

  if (sim.resources.length > 0) {
    // Attach resource opportunity to the first competency (problem / primary work).
    const resourceComp =
      sim.questions[0]?.competencyKey || sim.competencies[0]?.key || "problem_diagnosis";
    opportunities.push({
      id: "opp_resources",
      competencyKey: resourceComp,
      weight: Math.round(resourceShare * 10000) / 10000,
      label: "Consult scenario resources",
      requiredSignals: sim.resources.map((r) => `resource_opened:${r.id}`),
    });
  }

  if (sim.curveball) {
    const adaptComp = sim.competencies.find((c) => c.key === "adaptation")?.key || "adaptation";
    // Carve a small adaptation share from the last opportunity if needed.
    const adaptWeight = 0.1;
    if (opportunities.length > 0) {
      const donor = opportunities[opportunities.length - 1];
      donor.weight = Math.max(0.01, Math.round((donor.weight - adaptWeight) * 10000) / 10000);
    }
    opportunities.push({
      id: "opp_curveball",
      competencyKey: adaptComp,
      weight: adaptWeight,
      label: "Adapt after mid-session change",
      requiredSignals: ["curveball_presented", "curveball_acknowledged", "deliverable_revised:recommendation"],
    });
  }

  // Fix floating-point drift so weights sum to 1.
  const weightSum = opportunities.reduce((s, o) => s + o.weight, 0);
  if (opportunities.length > 0 && Math.abs(weightSum - 1) > 0.0001) {
    const last = opportunities[opportunities.length - 1];
    last.weight = Math.round((last.weight + (1 - weightSum)) * 10000) / 10000;
  }

  const competencyWeights: Record<string, number> = {};
  const oppByComp = new Map<string, number>();
  for (const o of opportunities) {
    oppByComp.set(o.competencyKey, (oppByComp.get(o.competencyKey) || 0) + o.weight);
  }
  for (const c of sim.competencies) {
    competencyWeights[c.key] = Math.round((oppByComp.get(c.key) || 0) * 10000) / 10000;
  }
  // Ensure every competency has a non-zero weight when possible.
  const cwSum = Object.values(competencyWeights).reduce((s, w) => s + w, 0);
  if (cwSum > 0 && Math.abs(cwSum - 1) > 0.0001) {
    const keys = Object.keys(competencyWeights);
    const lastKey = keys[keys.length - 1];
    competencyWeights[lastKey] =
      Math.round((competencyWeights[lastKey] + (1 - cwSum)) * 10000) / 10000;
  }

  const opportunityCompetencies = new Set(opportunities.map((o) => o.competencyKey));

  return {
    format: "v2",
    schemaVersion: 2,
    id: `v2:${sim.slug}`,
    slug: sim.slug,
    roleKey: sim.roleKey,
    title: sim.title,
    tagline: sim.tagline,
    mission: sim.mission,
    companyName: sim.companyName,
    durationMinutes: sim.durationMinutes,
    version: 1,
    modules,
    competencies: sim.competencies.map((c) => ({ key: c.key, label: c.label })),
    stakeholders: sim.stakeholders.map((s) => ({
      ...s,
      responseRules: s.responseRules.map((r) => ({ ...r })),
      knowledge: [...s.knowledge],
      withholds: [...s.withholds],
    })),
    scoring: {
      opportunities,
      indicators: buildIndicators(sim, opportunityCompetencies),
      competencyWeights,
    },
    legacyMicro: sim,
  };
}
