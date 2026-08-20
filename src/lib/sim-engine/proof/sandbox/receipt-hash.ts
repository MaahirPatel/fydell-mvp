export function canonicalize(value: Record<string, unknown>): { object: Record<string, unknown>; canonical: string } {
  const object = sortValue(value) as Record<string, unknown>;
  return { object, canonical: JSON.stringify(object) };
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return Object.fromEntries(entries.map(([k, v]) => [k, sortValue(v)]));
  }
  return value;
}

export function publicReceiptProjection(content: Record<string, unknown>): Record<string, unknown> {
  return {
    kind: content.kind,
    publicId: content.publicId,
    fixtureVersion: content.fixtureVersion,
    label: content.label,
    integrityNotice: content.integrityNotice,
    integrityHash: content.integrityHash,
    completedWork: content.completedWork,
    conditions: content.conditions,
    issuedAt: content.issuedAt,
  };
}
