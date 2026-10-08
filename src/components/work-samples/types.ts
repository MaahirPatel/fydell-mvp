import type { getDraft } from "@/lib/eng/authoring/drafts";
import type { publicJob } from "@/lib/eng/authoring/jobs";
import type { AuthoringInput, ConfigValidation, OtherField, RegistryPayload } from "@/lib/eng/authoring/registry";

export type { AuthoringInput, OtherField, RegistryPayload };
export type { ExemplarSummary, TrackAvailability } from "@/lib/eng/exemplars/registry";
export type { JobStage, StageStatus } from "@/lib/eng/authoring/jobs";
export type { CheckResult, RunEvidence } from "@/lib/eng/authoring/checks";
export type {
  AcceptanceCriterion,
  Coworker,
  PackageFile,
  ProtectedMaterials,
  RubricCriterion,
  ScenarioPackage,
  SectionKey,
  TestRef,
} from "@/lib/eng/authoring/package";

/** What GET /api/eng/authoring/drafts/[id] returns. */
export type DraftState = Awaited<ReturnType<typeof getDraft>>;
export type PublicJob = NonNullable<ReturnType<typeof publicJob>>;
export type FormValidation = Omit<ConfigValidation, "resolved">;

export type Capabilities = {
  execution: { available: boolean; label: string; isolated: boolean };
  generation: { available: boolean };
};

export function jobIsLive(job: { status: string } | null | undefined): boolean {
  return Boolean(job && (job.status === "queued" || job.status === "running"));
}
