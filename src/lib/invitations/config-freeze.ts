/**
 * Employer chunk — EMP-03: freeze assessment configuration.
 *
 * An invitation pins the exact scenario and rubric *version ids* that are
 * current when the invite is created. Every later read of attempt content —
 * workspace provisioning, candidate instructions, scoring, grading — must
 * resolve the pinned version, never the template's current version.
 *
 * The enforcement rule is simple and absolute: if the pinned version is no
 * longer retrievable, resolution FAILS. It never falls back to the current
 * version, because that fallback would silently alter an in-progress attempt
 * or a previous grade.
 */

import type { PinnedConfig } from "./types";

export interface VersionedContent {
  versionId: string;
  versionLabel: string;
  content: unknown;
  rubricVersionId: string;
}

/** Minimal version registry the lib reads from; backed by sim_template_versions in production. */
export interface VersionRegistry {
  getVersion(versionId: string): VersionedContent | null;
  currentScenarioVersionId(templateId: string): string | null;
  currentRubricVersionId(templateId: string): string | null;
}

export type FreezeError = "pinned_version_missing" | "no_current_version";

export type FreezeResult<T> = { ok: true; value: T } | { ok: false; code: FreezeError; message: string };

/**
 * Pin the assessment configuration at invite time. The pinned ids are
 * written onto the invitation row and never change afterwards.
 */
export function pinAssessmentConfig(
  registry: VersionRegistry,
  templateId: string
): FreezeResult<PinnedConfig> {
  const scenarioVersionId = registry.currentScenarioVersionId(templateId);
  const rubricVersionId = registry.currentRubricVersionId(templateId);
  if (!scenarioVersionId || !rubricVersionId) {
    return {
      ok: false,
      code: "no_current_version",
      message: `template ${templateId} has no published scenario/rubric version to pin`,
    };
  }
  return {
    ok: true,
    value: {
      templateId,
      scenarioVersionId,
      rubricVersionId,
      pinnedAt: new Date().toISOString(),
    },
  };
}

/**
 * Resolve the scenario content for an attempt. Always the PINNED version.
 * Refuses to fall back to the current version when the pinned one is gone:
 * a silent upgrade would change what the candidate is graded against.
 */
export function resolvePinnedScenario(
  registry: VersionRegistry,
  pinned: PinnedConfig
): FreezeResult<VersionedContent> {
  const version = registry.getVersion(pinned.scenarioVersionId);
  if (!version) {
    return {
      ok: false,
      code: "pinned_version_missing",
      message: `pinned scenario version ${pinned.scenarioVersionId} is unavailable; attempt content is withheld rather than silently upgraded`,
    };
  }
  return { ok: true, value: version };
}

/**
 * Resolve the rubric for grading an attempt. Same rule: the pinned rubric
 * version grades the attempt, even if the rubric was edited afterwards.
 */
export function resolvePinnedRubric(
  registry: VersionRegistry,
  pinned: PinnedConfig
): FreezeResult<VersionedContent> {
  const version = registry.getVersion(pinned.rubricVersionId);
  if (!version) {
    return {
      ok: false,
      code: "pinned_version_missing",
      message: `pinned rubric version ${pinned.rubricVersionId} is unavailable; grading is withheld rather than silently re-graded`,
    };
  }
  return { ok: true, value: version };
}

/**
 * Prove that a later template edit does not touch an in-progress attempt:
 * the attempt's pinned ids are unchanged, and resolution still returns the
 * pinned content even when the template's current version has moved on.
 */
export function attemptStillUsesPinnedVersion(
  registry: VersionRegistry,
  pinned: PinnedConfig,
  currentScenarioVersionId: string | null
): boolean {
  if (currentScenarioVersionId === pinned.scenarioVersionId) return true; // no edit happened
  const resolved = resolvePinnedScenario(registry, pinned);
  return resolved.ok && resolved.value.versionId === pinned.scenarioVersionId;
}
