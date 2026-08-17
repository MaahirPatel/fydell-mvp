import type { ArtifactKind, SimulationArtifact, SimulationArtifactDefinition } from "../types";

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function upsertArtifact(
  artifacts: Record<string, SimulationArtifact>,
  args: {
    id?: string;
    kind: ArtifactKind;
    title: string;
    content: string;
    elapsedMs: number;
    metadata?: SimulationArtifact["metadata"];
  }
): { artifacts: Record<string, SimulationArtifact>; artifact: SimulationArtifact; created: boolean } {
  const existing = args.id
    ? artifacts[args.id]
    : Object.values(artifacts).find((a) => a.kind === args.kind && a.title === args.title);

  if (existing) {
    const artifact: SimulationArtifact = {
      ...existing,
      content: args.content,
      updatedAtMs: args.elapsedMs,
      metadata: args.metadata ?? existing.metadata,
    };
    return {
      created: false,
      artifact,
      artifacts: { ...artifacts, [existing.id]: artifact },
    };
  }

  const id = args.id ?? newId("art");
  const artifact: SimulationArtifact = {
    id,
    kind: args.kind,
    title: args.title,
    content: args.content,
    createdAtMs: args.elapsedMs,
    updatedAtMs: args.elapsedMs,
    metadata: args.metadata,
  };
  return {
    created: true,
    artifact,
    artifacts: { ...artifacts, [id]: artifact },
  };
}

export function requiredArtifactsComplete(
  definitions: SimulationArtifactDefinition[],
  artifacts: Record<string, SimulationArtifact>
): boolean {
  return definitions
    .filter((d) => d.required)
    .every((d) =>
      Object.values(artifacts).some((a) => a.kind === d.kind && a.content.trim().length > 20)
    );
}
