import type { SimulationResourceDefinition, SimulationResourceRuntime } from "../types";

export function initResources(
  definitions: SimulationResourceDefinition[]
): Record<string, SimulationResourceRuntime> {
  const out: Record<string, SimulationResourceRuntime> = {};
  for (const d of definitions) {
    out[d.id] = {
      id: d.id,
      visible: d.initiallyVisible,
      opened: false,
    };
  }
  return out;
}

export function revealResource(
  resources: Record<string, SimulationResourceRuntime>,
  resourceId: string
): Record<string, SimulationResourceRuntime> {
  const r = resources[resourceId];
  if (!r || r.visible) return resources;
  return { ...resources, [resourceId]: { ...r, visible: true } };
}

export function openResource(
  resources: Record<string, SimulationResourceRuntime>,
  resourceId: string,
  elapsedMs: number
): Record<string, SimulationResourceRuntime> {
  const r = resources[resourceId];
  if (!r || !r.visible) return resources;
  return {
    ...resources,
    [resourceId]: {
      ...r,
      opened: true,
      openedAtMs: r.openedAtMs ?? elapsedMs,
    },
  };
}

export function searchResources(
  definitions: SimulationResourceDefinition[],
  resources: Record<string, SimulationResourceRuntime>,
  query: string
): { hits: string[]; resources: Record<string, SimulationResourceRuntime> } {
  const q = query.trim().toLowerCase();
  if (!q) return { hits: [], resources };
  const hits: string[] = [];
  const next = { ...resources };
  for (const def of definitions) {
    const runtime = next[def.id];
    if (!runtime?.visible) continue;
    const hay = `${def.title} ${def.summary ?? ""} ${def.searchableText ?? ""} ${def.content}`.toLowerCase();
    if (hay.includes(q)) {
      hits.push(def.id);
      next[def.id] = {
        ...runtime,
        searchHits: (runtime.searchHits ?? 0) + 1,
      };
    }
  }
  return { hits, resources: next };
}
