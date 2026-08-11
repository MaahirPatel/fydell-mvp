/**
 * Applied Technical Roles taxonomy.
 *
 * Roles and pathways are code-defined constants (they carry long-form
 * marketing copy and change with deploys, not with admin edits). Simulation
 * templates in the database reference roles by `role_key`.
 */
import type { PathwayKey, RoleDefinition, RoleKey } from "./types";

export interface PathwayDefinition {
  key: PathwayKey;
  title: string;
  description: string;
}

export const PATHWAYS: PathwayDefinition[] = [
  {
    key: "data_analytics",
    title: "Data and Analytics",
    description:
      "Roles that turn messy operational data into numbers a business can act on.",
  },
  {
    key: "solutions_delivery",
    title: "Solutions and Delivery",
    description:
      "Roles that sit between a product and a customer's real environment and make the two work together.",
  },
  {
    key: "technical_operations",
    title: "Technical Operations",
    description:
      "Roles that keep business systems running: triaging incidents, untangling process rules and protecting data integrity.",
  },
];

export const ROLES: RoleDefinition[] = [
  {
    key: "data_analyst",
    pathway: "data_analytics",
    title: "Data Analyst",
    shortDescription:
      "Investigates data, finds errors, calculates defensible results and communicates what changed.",
    whatTheyDo:
      "Data analysts answer business questions with data: reconciling sources, finding why metrics disagree, quantifying impact and communicating what should change. The hard part is rarely the query. It's knowing which number to trust and being able to explain why.",
    whyHardToEvaluate:
      "A resume says \"SQL, Excel, Tableau.\" A screening test checks syntax. Neither shows whether someone can notice that a dashboard is quietly wrong, isolate the defect, and give an executive a number with honest caveats. That is the actual job.",
    skillsEvaluated: [
      "Data investigation",
      "Analytical correctness",
      "Validation discipline",
      "Business interpretation",
      "Prioritization under deadline",
      "Communication",
    ],
    simulationSlug: "ops-yield-investigation",
    simulationSlugs: [
      "ops-yield-investigation",
      "missing-delays",
      "duplicate-revenue",
      "broken-funnel",
      "refund-spike",
      "cohort-drift",
    ],
  },
  {
    key: "bi_analyst",
    pathway: "data_analytics",
    title: "Business Intelligence Analyst",
    shortDescription:
      "Defines metrics, reconciles dashboards and turns business questions into reliable reporting.",
    whatTheyDo:
      "BI analysts own the metrics a company runs on. When three dashboards report three different renewal rates, someone has to work out which populations, date windows and exclusions differ, then get sales, finance and customer success to agree on one definition.",
    whyHardToEvaluate:
      "Metric reasoning doesn't show up in a coding puzzle. The skill is holding a data model, three stakeholders' assumptions and a business decision in your head at once, then writing a definition precise enough that the disagreement can't come back.",
    skillsEvaluated: [
      "Metric reasoning",
      "Data-model understanding",
      "Stakeholder alignment",
      "Edge-case awareness",
      "BI judgment",
      "Communication",
    ],
    simulationSlug: "one-renewal-rate",
    simulationSlugs: [
      "one-renewal-rate",
      "filtered-forecast",
      "north-star",
      "currency-confusion",
      "fiscal-cutoff",
    ],
  },
  {
    key: "solutions_engineer",
    pathway: "solutions_delivery",
    title: "Solutions Engineer",
    shortDescription:
      "Understands customer requirements, evaluates product fit and proposes honest technical solutions.",
    whatTheyDo:
      "Solutions engineers bridge sales and engineering: they run technical discovery, separate what a customer needs from what they've assumed, design integrations within real product limits, and tell the truth about gaps before the contract is signed.",
    whyHardToEvaluate:
      "Anyone can demo a happy path. The differentiator is what happens when the customer's environment doesn't fit: whether the SE finds the real requirement behind the request and designs something that works, or promises something that doesn't exist.",
    skillsEvaluated: [
      "Technical discovery",
      "Product understanding",
      "Solution design",
      "Honesty about limitations",
      "Trade-off reasoning",
      "Customer communication",
    ],
    simulationSlug: "promise-or-product-fit",
    simulationSlugs: [
      "promise-or-product-fit",
      "sso-not-provisioning",
      "rate-limit",
      "security-review",
      "data-residency",
    ],
  },
  {
    key: "implementation_consultant",
    pathway: "solutions_delivery",
    title: "Implementation Consultant",
    shortDescription:
      "Maps requirements, configures workflows, protects data integrity and plans successful launches.",
    whatTheyDo:
      "Implementation consultants take a signed deal and make it real: validating customer data, mapping fields into the configured system, reconciling stakeholders who disagree about process, and deciding what a safe launch looks like when the timeline won't move.",
    whyHardToEvaluate:
      "Implementation skill is judgment under constraint: what to push back on, what to work around, and how to keep records from silently disappearing during an import. None of that appears in an interview about \"a time you handled a difficult customer.\"",
    skillsEvaluated: [
      "Requirements interpretation",
      "Configuration judgment",
      "Data integrity",
      "Implementation planning",
      "Risk management",
      "Stakeholder communication",
    ],
    simulationSlug: "launch-day-import",
    simulationSlugs: [
      "launch-day-import",
      "duplicate-accounts",
      "approval-rules",
      "migration-cutover",
      "scope-tradeoff",
    ],
  },
  {
    key: "technical_support_engineer",
    pathway: "technical_operations",
    title: "Technical Support Engineer",
    shortDescription:
      "Diagnoses technical issues, prioritizes incidents and communicates safe resolutions.",
    whatTheyDo:
      "Support engineers work the sharp edge of production: reading logs, correlating tickets against releases, forming hypotheses, communicating honestly with customers while the cause is still unknown, and knowing exactly when to escalate to engineering.",
    whyHardToEvaluate:
      "Support interviews test composure and vocabulary. The job tests whether someone can look at four tickets, an auth log and a release timeline, and correctly decide what's broken, who's affected and what's safe to say, before the queue doubles.",
    skillsEvaluated: [
      "Triage",
      "Technical diagnosis",
      "Evidence use",
      "Safety",
      "Escalation judgment",
      "Customer communication",
    ],
    simulationSlug: "green-status-page",
    simulationSlugs: [
      "green-status-page",
      "api-timeout",
      "permission-failure",
      "duplicate-webhooks",
      "one-customer-or-everyone",
    ],
  },
  {
    key: "business_systems_analyst",
    pathway: "technical_operations",
    title: "Business Systems Analyst",
    shortDescription:
      "Analyzes processes, requirements and system rules to improve how an organization operates.",
    whatTheyDo:
      "Business systems analysts own the space between how a system behaves and what the business meant: diagnosing rule conflicts, quantifying process impact, separating defects from ambiguous policy, and designing changes that survive both audit and reality.",
    whyHardToEvaluate:
      "The core skill is root-cause reasoning over rules and requirements: being able to say \"the system is doing exactly what rule 7 tells it to; the policy is what's ambiguous.\" No resume keyword or generic aptitude test surfaces that.",
    skillsEvaluated: [
      "Process analysis",
      "Requirements reasoning",
      "Systems judgment",
      "Root-cause analysis",
      "Validation",
      "Stakeholder communication",
    ],
    simulationSlug: "executive-queue",
    simulationSlugs: [
      "executive-queue",
      "invoice-routing",
      "access-provisioning",
      "crm-handoff",
      "change-request",
    ],
  },
];

export const ROLE_BY_KEY: Record<RoleKey, RoleDefinition> = Object.fromEntries(
  ROLES.map((r) => [r.key, r])
) as Record<RoleKey, RoleDefinition>;

/** One flagship simulation per Applied Technical Role. */
export const FLAGSHIP_SLUGS: readonly string[] = ROLES.map((r) => r.simulationSlug);

export function isFlagshipSlug(slug: string): boolean {
  return FLAGSHIP_SLUGS.includes(slug);
}

export function rolesForPathway(pathway: PathwayKey): RoleDefinition[] {
  return ROLES.filter((r) => r.pathway === pathway);
}
