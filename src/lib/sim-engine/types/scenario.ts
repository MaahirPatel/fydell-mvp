import type { RoleKey, SimulationCapability } from "./roles";
import type { VersionedIdentity } from "./common";
import type { SimulationConstraints, SimulationCompetencyDefinition } from "./tasks";
import type { SimulationTaskDefinition } from "./tasks";
import type { SimulationResourceDefinition, SimulationArtifactDefinition } from "./tasks";
import type { SimulationPersonDefinition } from "./people";
import type { SimulationEventDefinition, WorldStateSchema } from "./events";
import type { JsonValue } from "./common";

export interface SimulationMetadata {
  id: string;
  slug: string;
  title: string;
  description: string;
  roleKey: RoleKey;
  estimatedDurationMinutes: number;
  timeLimitSeconds: number;
  difficulty: "foundational" | "intermediate" | "advanced";
  instructions: string;
  companyName: string;
}

export interface SimulationToolDefinition {
  id: string;
  label: string;
  capability: SimulationCapability;
  initiallyUnlocked: boolean;
}

/**
 * Assembled scenario definition, the single authoring contract.
 * Files may be split physically; this is the assembled object.
 */
export interface SimulationScenarioDefinition {
  metadata: SimulationMetadata;
  versions: VersionedIdentity;
  capabilities: readonly SimulationCapability[];
  constraints: SimulationConstraints;
  competencies: SimulationCompetencyDefinition[];
  tasks: SimulationTaskDefinition[];
  people: SimulationPersonDefinition[];
  resources: SimulationResourceDefinition[];
  artifacts: SimulationArtifactDefinition[];
  tools: SimulationToolDefinition[];
  world: WorldStateSchema;
  events: SimulationEventDefinition[];
  /** Deterministic mock API / code runtime configuration. */
  technicalRuntime?: TechnicalRuntimeConfig;
  /** Deterministic mock SQL runtime (Data Analyst / BI). */
  sqlRuntime?: SqlRuntimeConfig;
  /** Implementation Consultant checklist + field mapping. */
  implementationWorkbench?: ImplementationWorkbenchConfig;
  /** Technical Support ticket queue + log linkage. */
  supportWorkbench?: SupportWorkbenchConfig;
  /** Business Systems Analyst workflow rules + fix options. */
  rulesWorkbench?: RulesWorkbenchConfig;
  /** AI assistant mock responses (distinct from personas). */
  aiAssistant?: AiAssistantConfig;
}

export interface ChecklistItemDef {
  id: string;
  label: string;
  description?: string;
  required?: boolean;
}

export interface FieldMappingDef {
  id: string;
  sourceField: string;
  sampleValue?: string;
  options: string[];
  correctTarget: string;
}

export interface ImplementationWorkbenchConfig {
  checklistTitle?: string;
  checklist: ChecklistItemDef[];
  fieldMappings: FieldMappingDef[];
}

export interface SupportTicketDef {
  id: string;
  customer: string;
  reportedAt: string;
  summary: string;
  severity: "low" | "medium" | "high" | "critical";
  /** Ground truth: part of the primary incident. */
  belongsToIncident: boolean;
}

export interface SupportWorkbenchConfig {
  ticketsTitle?: string;
  tickets: SupportTicketDef[];
  /** Resource id that should open when viewing logs. */
  logResourceId?: string;
}

export interface WorkflowRuleDef {
  id: string;
  label: string;
  condition: string;
  routesTo: string;
  /** Evaluation order (lower first). */
  order: number;
}

export interface RulesFixOptionDef {
  id: string;
  label: string;
  /** Matches policy/compliance constraints when true. */
  compliant: boolean;
}

export interface RulesWorkbenchConfig {
  title?: string;
  rules: WorkflowRuleDef[];
  /** Ground-truth rule(s) that explain the defect. */
  rootCauseRuleIds: string[];
  fixOptions: RulesFixOptionDef[];
  recommendedFixId: string;
  impactPrompt?: string;
  /** Correct count of wrongly routed sample cases. */
  correctImpactCount?: number;
  impactOptions?: number[];
}

export interface TechnicalRuntimeConfig {
  apiBasePath: string;
  /** Known endpoints and validation rules. */
  endpoints: Array<{
    method: string;
    path: string;
    /** Required body fields for success. */
    requiredFields?: string[];
    /** Field type expectations. */
    fieldTypes?: Record<string, "string" | "uuid" | "number" | "email" | "object">;
    successStatus: number;
    successBody: JsonValue;
  }>;
  authHeader?: string;
}

export interface AiAssistantConfig {
  modelLabel: string;
  responses: Array<{
    id: string;
    /** Match against prompt keywords (assistant only, personas use disclosure). */
    whenPromptIncludes: string[];
    response: string;
  }>;
  fallbackResponse: string;
}

export interface SqlTableDef {
  name: string;
  columns: string[];
  rows: Array<Record<string, JsonValue>>;
}

/**
 * Pattern-matched SQL results, not a full SQL engine.
 * First matching pattern wins; otherwise structural errors or empty result.
 */
export interface SqlRuntimeConfig {
  dialectLabel: string;
  tables: SqlTableDef[];
  patterns: Array<{
    id: string;
    /** All substrings must appear (case-insensitive) for a match. */
    whenSqlIncludes: string[];
    columns: string[];
    rows: Array<Record<string, JsonValue>>;
    /** World flags to set on match. */
    setFlags?: Record<string, JsonValue>;
    label?: string;
  }>;
  knownTables: string[];
}
