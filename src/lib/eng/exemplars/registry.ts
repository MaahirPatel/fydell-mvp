import "server-only";
import { packageSha256 } from "../authoring/package";
import type { CapabilityId, DatabaseId, FrameworkId, LanguageId, TaskTypeId } from "../authoring/registry";
import { EXEMPLAR as webhookDedupe } from "../scenarios/webhook-dedupe/exemplar";
import { EXEMPLAR as jobLeaseRecovery } from "../scenarios/job-lease-recovery/exemplar";
import { EXEMPLAR as inventoryPagination } from "../scenarios/inventory-pagination-contract/exemplar";
import { EXEMPLAR as supportRetrieval } from "../scenarios/support-retrieval-quality/exemplar";
import { EXEMPLAR as extractionOutput } from "../scenarios/extraction-structured-output/exemplar";
import { PRIORITY_LABEL, TRACKS, trackOf, type TrackId } from "../tracks";
import type { Level } from "../taxonomy";
import type { Exemplar, ExemplarDifficulty } from "./types";
import validation from "./validation.generated.json";

/**
 * Role-model simulations, one per track and task family. An exemplar is
 * offered to employers only when its current package hash matches a passing
 * run recorded by `scripts/validate-exemplars.ts`; any edit to a package
 * takes it out of the creator until it is validated again.
 */

export const EXEMPLARS: Exemplar[] = [webhookDedupe, jobLeaseRecovery, inventoryPagination, supportRetrieval, extractionOutput];

type ValidationRecord = { key: string; version: string; sha256: string; status: "passed" | "failed"; checkedAt: string; runner: string; checks: Array<{ id: string; status: string }> };

const RECORDS = (validation as { records: ValidationRecord[] }).records;

export type ExemplarSummary = {
  key: string;
  version: string;
  track: TrackId;
  trackLabel: string;
  taskFamily: string;
  taskFamilyLabel: string;
  title: string;
  summary: string;
  businessContext: string;
  stackLabel: string;
  language: Exemplar["stack"]["language"];
  level: Level;
  difficulty: ExemplarDifficulty;
  minutes: number;
  browserPreview: boolean;
  pattern: Exemplar["pattern"];
  /** The creator fields this role model was validated with, applied when an employer picks it. */
  config: { language: LanguageId; framework: FrameworkId; database: DatabaseId; taskType: TaskTypeId; capabilities: CapabilityId[]; taskMinutes: number; setupMinutes: number };
  validation: { status: "validated"; checkedAt: string; runner: string; checks: number } | { status: "not_validated"; reason: string };
};

const cache = new Map<string, { pkg: ReturnType<Exemplar["build"]>["pkg"]; prot: ReturnType<Exemplar["build"]>["prot"]; sha: string }>();

export function buildExemplar(key: string) {
  const hit = cache.get(key);
  if (hit) return hit;
  const ex = EXEMPLARS.find((e) => e.key === key);
  if (!ex) return null;
  const { pkg, prot } = ex.build();
  const built = { pkg, prot, sha: packageSha256(pkg, prot) };
  cache.set(key, built);
  return built;
}

function validationFor(ex: Exemplar, sha: string): ExemplarSummary["validation"] {
  const rec = RECORDS.find((r) => r.key === ex.key);
  if (!rec) return { status: "not_validated", reason: "No validation run is recorded for this package." };
  if (rec.sha256 !== sha) return { status: "not_validated", reason: "The package changed after its last validation run." };
  if (rec.status !== "passed") return { status: "not_validated", reason: "The last validation run did not pass every check." };
  return { status: "validated", checkedAt: rec.checkedAt, runner: rec.runner, checks: rec.checks.length };
}

export function exemplarSummaries(): ExemplarSummary[] {
  return EXEMPLARS.map((ex) => {
    const built = buildExemplar(ex.key)!;
    const track = trackOf(ex.track);
    return {
      key: ex.key,
      version: ex.version,
      track: ex.track,
      trackLabel: track.label,
      taskFamily: ex.taskFamily,
      taskFamilyLabel: track.taskFamilies.find((f) => f.id === ex.taskFamily)?.label ?? ex.taskFamily,
      title: built.pkg.brief.title,
      summary: ex.summary,
      businessContext: ex.businessContext,
      stackLabel: ex.stack.label,
      language: ex.stack.language,
      level: ex.level,
      difficulty: ex.difficulty,
      minutes: built.pkg.environment.taskMinutes,
      browserPreview: ex.browserPreview,
      pattern: ex.pattern,
      config: {
        language: built.pkg.config.language,
        framework: built.pkg.config.framework,
        database: built.pkg.config.database,
        taskType: built.pkg.config.taskType,
        capabilities: built.pkg.config.capabilities,
        taskMinutes: built.pkg.config.taskMinutes,
        setupMinutes: built.pkg.config.setupMinutes,
      },
      validation: validationFor(ex, built.sha),
    };
  });
}

export function validatedExemplars(): ExemplarSummary[] {
  return exemplarSummaries().filter((s) => s.validation.status === "validated");
}

export function exemplarFor(key: string): { exemplar: Exemplar; summary: ExemplarSummary } | null {
  const exemplar = EXEMPLARS.find((e) => e.key === key);
  const summary = exemplarSummaries().find((s) => s.key === key);
  return exemplar && summary ? { exemplar, summary } : null;
}

/** Track availability for the creator: a track is offered only when at least one validated exemplar exists for it. */
export type TrackAvailability = {
  track: TrackId;
  label: string;
  priorityLabel: string;
  roles: string[];
  available: boolean;
  exemplars: ExemplarSummary[];
  prerequisite: string | null;
  scopeNote: string | null;
};

export function trackAvailability(): TrackAvailability[] {
  const valid = validatedExemplars();
  return TRACKS.map((t) => {
    const exemplars = valid.filter((e) => e.track === t.id);
    return { track: t.id, label: t.label, priorityLabel: PRIORITY_LABEL[t.priority], roles: t.roles, available: exemplars.length > 0, exemplars, prerequisite: t.prerequisite, scopeNote: t.scopeNote };
  });
}
