/**
 * File-backed store for ops review state, under `.data/` (gitignored).
 *
 * The `VARIANT_CATALOG` constants in `catalog.ts` remain the source of truth
 * for what a variant *is* (its spec). This store only ever layers an
 * operator-driven *status override* + a validation cache + a signed-release
 * log on top — it never invents or edits spec content. If the file is
 * missing or unreadable, every catalog spec's original status simply
 * applies (fails safe to the catalog, not open).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import type { VariantSpec, VariantStatus } from "./types";
import type { ValidationResult } from "./validate";

const STORE_PATH = resolve(process.cwd(), ".data/relay-variants-state.json");

export type SignedRelease = {
  releaseId: string;
  contentHash: string;
  signedBy: string;
  signedAt: string;
};

export type VariantStateEntry = {
  statusOverride?: VariantStatus;
  lastValidatedAt?: string;
  lastValidation?: ValidationResult;
  signedReleases?: SignedRelease[];
  updatedBy?: string;
  updatedAt?: string;
};

export type VariantStateStore = Record<string, VariantStateEntry>;

export function readVariantState(): VariantStateStore {
  try {
    if (!existsSync(STORE_PATH)) return {};
    const raw = readFileSync(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as VariantStateStore) : {};
  } catch {
    return {};
  }
}

function writeVariantState(store: VariantStateStore): void {
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

/** The status ops UI / resolve.ts should treat a spec as having right now. */
export function getEffectiveStatus(spec: VariantSpec): VariantStatus {
  const store = readVariantState();
  return store[spec.id]?.statusOverride ?? spec.status;
}

export function recordValidation(id: string, validation: ValidationResult): VariantStateEntry {
  const store = readVariantState();
  const entry: VariantStateEntry = { ...(store[id] || {}) };
  entry.lastValidatedAt = new Date().toISOString();
  entry.lastValidation = validation;
  store[id] = entry;
  writeVariantState(store);
  return entry;
}

export function setStatusOverride(id: string, status: VariantStatus, actorEmail: string): VariantStateEntry {
  const store = readVariantState();
  const entry: VariantStateEntry = { ...(store[id] || {}) };
  entry.statusOverride = status;
  entry.updatedBy = actorEmail;
  entry.updatedAt = new Date().toISOString();
  store[id] = entry;
  writeVariantState(store);
  return entry;
}

export function signRelease(
  id: string,
  releaseId: string,
  contentHash: string,
  actorEmail: string
): SignedRelease {
  const store = readVariantState();
  const entry: VariantStateEntry = { ...(store[id] || {}) };
  const signed: SignedRelease = {
    releaseId,
    contentHash,
    signedBy: actorEmail,
    signedAt: new Date().toISOString(),
  };
  entry.signedReleases = [...(entry.signedReleases || []), signed];
  store[id] = entry;
  writeVariantState(store);
  return signed;
}
