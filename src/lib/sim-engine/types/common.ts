/** Shared JSON-safe value type. No `any`. */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type EngineVersion = string;
export type ScenarioVersion = string;

export interface VersionedIdentity {
  scenarioId: string;
  scenarioVersion: ScenarioVersion;
  engineVersion: EngineVersion;
  competencyModelVersion: string;
  evidenceDerivationVersion: string;
  analysisVersion: string;
}
