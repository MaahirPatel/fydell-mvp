/**
 * Role-family scenario catalog: blueprints, validation status and the view
 * employers and the frontend read. See docs/scenario-catalog.md.
 */
import { CATALOG } from "./families";
import { isPublished, statusIsHonest, supportedStatus } from "./lifecycle";
import { catalogEntrySchema, type CatalogEntry, type RoleFamilyKey, type ValidationStatus } from "./schema";
import { EMPLOYER_INVITABLE_SLUGS } from "@/lib/contracts/roles";

export { CATALOG };
export * from "./schema";
export { transition, supportedStatus, statusIsHonest, isPublished } from "./lifecycle";

export function catalogEntry(family: RoleFamilyKey): CatalogEntry | undefined {
  return CATALOG.find((e) => e.family === family);
}

/**
 * How an employer may use a family's scenario today.
 * - `published`: passed expert review and was deliberately published.
 * - `pilot_unreviewed`: runnable and invitable in the product, but expert
 *   review is still pending. Shown with that disclosure, never as published.
 * - `unavailable`: blueprint only; requests are recorded instead.
 */
export type Availability = "published" | "pilot_unreviewed" | "unavailable";

export function availabilityOf(entry: CatalogEntry): Availability {
  if (isPublished(entry)) return "published";
  const slug = entry.initialScenario.templateSlug;
  if (entry.validation.runnable && slug && EMPLOYER_INVITABLE_SLUGS.includes(slug)) return "pilot_unreviewed";
  return "unavailable";
}

/** Candidate- and employer-safe summary: no answer keys, fixtures or hidden details. */
export interface CatalogSummary {
  family: RoleFamilyKey;
  label: string;
  scopeDisclosure: string;
  scenarioId: string;
  scenarioTitle: string;
  scenarioVersion: string;
  templateSlug: string | null;
  effortMinutes: number;
  responsibilityTags: string[];
  stackTags: string[];
  capabilitiesAssessed: string[];
  capabilitiesNotAssessed: string[];
  runtimeConstraints: string;
  rubric: { key: string; label: string; kind: "hard_skill" | "collaboration" }[];
  validationStatus: ValidationStatus;
  availability: Availability;
  disclosure: string | null;
  blockers: string[];
}

export function summarize(entry: CatalogEntry): CatalogSummary {
  const s = entry.initialScenario;
  const availability = availabilityOf(entry);
  return {
    family: entry.family,
    label: entry.label,
    scopeDisclosure: entry.scopeDisclosure,
    scenarioId: s.id,
    scenarioTitle: s.title,
    scenarioVersion: s.version,
    templateSlug: s.templateSlug,
    effortMinutes: s.effortMinutes,
    responsibilityTags: s.responsibilityTags,
    stackTags: s.stackTags,
    capabilitiesAssessed: s.capabilitiesAssessed,
    capabilitiesNotAssessed: s.capabilitiesNotAssessed,
    runtimeConstraints: s.blueprint.runtime.notes,
    rubric: s.blueprint.dimensions.map((d) => ({ key: d.key, label: d.label, kind: d.kind })),
    validationStatus: entry.validation.status,
    availability,
    disclosure:
      availability === "pilot_unreviewed"
        ? "Runs end to end and passed automated validation. Review by a qualified engineer other than the author is still pending, and reports are checked by a person before release."
        : null,
    blockers: entry.validation.blockers,
  };
}

/** Structural and honesty problems in the catalog; empty when sound. */
export function catalogProblems(entries: CatalogEntry[] = CATALOG): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const e of entries) {
    const parsed = catalogEntrySchema.safeParse(e);
    if (!parsed.success) {
      problems.push(`${e.family}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
      continue;
    }
    if (seen.has(e.family)) problems.push(`${e.family}: duplicate family`);
    seen.add(e.family);
    if (!statusIsHonest(e)) {
      problems.push(`${e.family}: claims ${e.validation.status} but its records support only ${supportedStatus(e)}`);
    }
    if (e.validation.status !== "published" && e.validation.blockers.length === 0) {
      problems.push(`${e.family}: unpublished entries must name their blockers`);
    }
    if (!e.validation.runnable && e.initialScenario.templateSlug) {
      problems.push(`${e.family}: has a template slug but no runnable package`);
    }
    const dims = e.initialScenario.blueprint.dimensions;
    if (!dims.some((d) => d.kind === "hard_skill")) problems.push(`${e.family}: no hard-skill dimension`);
    if (new Set(dims.map((d) => d.key)).size !== dims.length) problems.push(`${e.family}: duplicate dimension keys`);
  }
  return problems;
}
