/**
 * Role identity for the simulation engine.
 *
 * RoleKey is canonical and imported from the live product taxonomy.
 * Do not invent a parallel RoleType.
 */
import type { RoleKey } from "@/lib/simulations/types";

export type { RoleKey };

export interface RoleDisplayMetadata {
  roleKey: RoleKey;
  label: string;
  shortLabel: string;
  pathwayLabel: string;
}

export interface RoleSimulationCapabilities {
  roleKey: RoleKey;
  /** Tools this role's default workbench typically needs. */
  defaultCapabilities: SimulationCapability[];
}

/** Capability union — prefer a set over a boolean swamp. */
export type SimulationCapability =
  | "tasks"
  | "resources"
  | "internal_chat"
  | "customer_communication"
  | "ai_assistant"
  | "code_execution"
  | "api_execution"
  | "sql_execution"
  | "artifact_composer"
  | "timed_events"
  | "documentation"
  | "logs"
  | "schema_mapping"
  | "project_timeline"
  | "workflow_rules";

export const ROLE_DISPLAY: Record<RoleKey, RoleDisplayMetadata> = {
  data_analyst: {
    roleKey: "data_analyst",
    label: "Data Analyst",
    shortLabel: "DA",
    pathwayLabel: "Data and Analytics",
  },
  bi_analyst: {
    roleKey: "bi_analyst",
    label: "Business Intelligence Analyst",
    shortLabel: "BI",
    pathwayLabel: "Data and Analytics",
  },
  solutions_engineer: {
    roleKey: "solutions_engineer",
    label: "Solutions Engineer",
    shortLabel: "SE",
    pathwayLabel: "Solutions and Delivery",
  },
  implementation_consultant: {
    roleKey: "implementation_consultant",
    label: "Implementation Consultant",
    shortLabel: "IC",
    pathwayLabel: "Solutions and Delivery",
  },
  technical_support_engineer: {
    roleKey: "technical_support_engineer",
    label: "Technical Support Engineer",
    shortLabel: "TSE",
    pathwayLabel: "Technical Operations",
  },
  business_systems_analyst: {
    roleKey: "business_systems_analyst",
    label: "Business Systems Analyst",
    shortLabel: "BSA",
    pathwayLabel: "Technical Operations",
  },
};
