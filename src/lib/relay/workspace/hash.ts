/** Deterministic content hashing for workspace version chains (browser + node). */

export function fnv1aHex(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function contentHash(content: string): string {
  return fnv1aHex(`v1|${content.length}|${content}`);
}

export function chainHash(
  prev: string,
  artifactId: string,
  version: number,
  content: string,
  actorId: string,
  timestamp: string
): string {
  return fnv1aHex([prev, artifactId, String(version), contentHash(content), actorId, timestamp].join("|"));
}

export function headHashFromArtifacts(
  headVersion: number,
  artifacts: Record<string, { path: string; version: number; contentHash: string }>
): string {
  const keys = Object.keys(artifacts).sort();
  const body = keys.map((k) => `${k}@${artifacts[k].version}:${artifacts[k].contentHash}`).join(";");
  return fnv1aHex(`head|${headVersion}|${body}`);
}
