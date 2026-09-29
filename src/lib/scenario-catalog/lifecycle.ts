/**
 * Scenario validation lifecycle.
 *
 *   draft → automated_validation → expert_review → approved → published → retired
 *
 * Rules the catalog and the database both enforce (migration 039 mirrors
 * them in `sim_scenario_reviews` and its trigger):
 * - Automated checks can move a version into expert review, never past it.
 * - Approval needs a human expert review record that is not by the author.
 * - Publication is its own deliberate human action after approval.
 * - A version with an unmet runtime prerequisite (GPU, physical device) can
 *   be approved but not published.
 * - Failed checks or requested changes send the version back to draft.
 */
import type { CatalogEntry, ReviewRecord, ValidationStatus } from "./schema";

const FORWARD: Record<ValidationStatus, ValidationStatus[]> = {
  draft: ["automated_validation", "retired"],
  automated_validation: ["expert_review", "draft", "retired"],
  expert_review: ["approved", "draft", "retired"],
  approved: ["published", "draft", "retired"],
  published: ["retired"],
  retired: [],
};

export type TransitionResult =
  | { ok: true; to: ValidationStatus }
  | { ok: false; reason: string };

export interface TransitionInput {
  from: ValidationStatus;
  to: ValidationStatus;
  scenarioVersion: string;
  /** Who authored this version; they cannot approve it. */
  author: string;
  reviews: ReviewRecord[];
  runtime: { requiresGpu: boolean; requiresPhysicalDevice: boolean };
  /** Runtime prerequisites confirmed available in the execution environment. */
  runtimePrerequisitesMet?: boolean;
}

function forVersion(reviews: ReviewRecord[], version: string) {
  return reviews.filter((r) => r.scenarioVersion === version);
}

function latest(reviews: ReviewRecord[], stage: ReviewRecord["stage"]): ReviewRecord | undefined {
  const matching = reviews.filter((r) => r.stage === stage);
  return matching.sort((a, b) => a.date.localeCompare(b.date)).at(-1);
}

export function transition(input: TransitionInput): TransitionResult {
  const { from, to } = input;
  if (!FORWARD[from].includes(to)) {
    return { ok: false, reason: `${from} cannot move to ${to}` };
  }
  const reviews = forVersion(input.reviews, input.scenarioVersion);

  if (to === "expert_review") {
    const auto = latest(reviews, "automated_validation");
    if (!auto || auto.outcome !== "passed" || auto.actorKind !== "automation") {
      return { ok: false, reason: "expert review needs a passing automated validation record for this version" };
    }
  }

  if (to === "approved") {
    const expert = latest(reviews, "expert_review");
    if (!expert || expert.outcome !== "approved") {
      return { ok: false, reason: "approval needs an expert review record with outcome approved" };
    }
    if (expert.actorKind !== "human") {
      return { ok: false, reason: "automated checks or model review cannot stand in for expert approval" };
    }
    if (!expert.actorQualification?.trim()) {
      return { ok: false, reason: "the expert reviewer's qualification must be recorded" };
    }
    if (expert.actor.trim().toLowerCase() === input.author.trim().toLowerCase()) {
      return { ok: false, reason: "the author cannot approve their own scenario version" };
    }
  }

  if (to === "published") {
    const pub = latest(reviews, "publication");
    if (!pub || pub.outcome !== "published" || pub.actorKind !== "human") {
      return { ok: false, reason: "publication is a deliberate human action and needs its own record" };
    }
    const needsSpecialRuntime = input.runtime.requiresGpu || input.runtime.requiresPhysicalDevice;
    if (needsSpecialRuntime && !input.runtimePrerequisitesMet) {
      return { ok: false, reason: "GPU or device runtime prerequisites are not met; the version cannot be sold" };
    }
  }

  return { ok: true, to };
}

/**
 * The furthest status a version's review records justify. Used to check that
 * a catalog entry never claims more than its evidence supports.
 */
export function supportedStatus(entry: CatalogEntry): ValidationStatus {
  const version = entry.initialScenario.version;
  const reviews = forVersion(entry.validation.reviews, version);
  const retire = latest(reviews, "retirement");
  if (retire?.outcome === "retired") return "retired";

  const auto = latest(reviews, "automated_validation");
  if (!auto || auto.outcome !== "passed" || auto.actorKind !== "automation") return "draft";
  if (!entry.validation.runnable) return "draft";

  const expert = latest(reviews, "expert_review");
  if (!expert || expert.outcome !== "approved" || expert.actorKind !== "human" || !expert.actorQualification) {
    return "expert_review";
  }
  const pub = latest(reviews, "publication");
  if (!pub || pub.outcome !== "published" || pub.actorKind !== "human") return "approved";
  const rt = entry.initialScenario.blueprint.runtime;
  if (rt.requiresGpu || rt.requiresPhysicalDevice) return "approved";
  return "published";
}

const ORDER: ValidationStatus[] = [
  "draft",
  "automated_validation",
  "expert_review",
  "approved",
  "published",
];

/** True when the entry's stated status is no further along than its evidence. */
export function statusIsHonest(entry: CatalogEntry): boolean {
  const claimed = entry.validation.status;
  const supported = supportedStatus(entry);
  if (claimed === "retired") return supported === "retired";
  if (supported === "retired") return false;
  return ORDER.indexOf(claimed) <= ORDER.indexOf(supported);
}

/** Only published versions are offered for purchase. */
export function isPublished(entry: CatalogEntry): boolean {
  return entry.validation.status === "published" && statusIsHonest(entry);
}
