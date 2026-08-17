import type { RoleKey } from "../types";
import type { ComponentType } from "react";
import type { SimulationRuntime } from "../runtime/simulationRuntime";

export type RendererStatus = "EXPERIMENTAL" | "ACTIVE";

export interface SimulationRendererProps {
  runtime: SimulationRuntime;
  debug?: boolean;
}

export interface RendererDefinition {
  roleKey: RoleKey;
  label: string;
  status: RendererStatus;
  /** Lazy component reference — never a fake stub for unimplemented roles. */
  component: ComponentType<SimulationRendererProps>;
}

/**
 * Availability-aware registry. Partial by design.
 * getRenderer returns unsupported for roles without an implementation.
 */
export type SimulationRendererRegistry = Partial<Record<RoleKey, RendererDefinition>>;

export type GetRendererResult =
  | { ok: true; definition: RendererDefinition }
  | { ok: false; reason: "NOT_REGISTERED" | "EXPERIMENTAL_DISABLED"; roleKey: RoleKey };

const registry: SimulationRendererRegistry = {};

export function registerRenderer(definition: RendererDefinition): void {
  registry[definition.roleKey] = definition;
}

export function getRenderer(
  roleKey: RoleKey,
  opts?: { allowExperimental?: boolean }
): GetRendererResult {
  const definition = registry[roleKey];
  if (!definition) {
    return { ok: false, reason: "NOT_REGISTERED", roleKey };
  }
  if (definition.status === "EXPERIMENTAL" && !opts?.allowExperimental) {
    return { ok: false, reason: "EXPERIMENTAL_DISABLED", roleKey };
  }
  return { ok: true, definition };
}

export function listRegisteredRenderers(): RendererDefinition[] {
  return Object.values(registry).filter(Boolean) as RendererDefinition[];
}
