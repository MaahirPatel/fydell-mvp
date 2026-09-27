/**
 * Comparability protection (WORK-09).
 *
 * Candidates in the same role/cohort must face the same validated core task
 * and rubric — or a documented equivalent form. Invitations pin the exact
 * template version, so later edits can never silently alter an in-progress
 * attempt or a previous grade.
 *
 * This module provides the pure comparability primitives:
 *  - form keys (template + version + cohort policy) for grouping attempts
 *  - a guard against silent personalization (no per-candidate difficulty)
 */

export interface AttemptFormInput {
  templateId: string;
  templateVersionId: string;
  /** Cohort the attempt belongs to (null = ungrouped/self-serve). */
  cohortId: string | null;
  /** Candidate id — included to detect, not to vary, the form. */
  candidateUserId: string;
}

/**
 * The comparability form of an attempt. Two attempts are comparable when
 * their form keys are equal. The candidate id is deliberately NOT part of
 * the key: personalization must never silently change the scored task.
 */
export function attemptFormKey(a: AttemptFormInput): string {
  return [a.templateId, a.templateVersionId, a.cohortId || "no-cohort"].join(":");
}

export function groupAttemptsByForm<T extends AttemptFormInput>(
  attempts: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const a of attempts) {
    const key = attemptFormKey(a);
    const list = groups.get(key) || [];
    list.push(a);
    groups.set(key, list);
  }
  return groups;
}

export interface ComparabilityCheck {
  comparable: boolean;
  reason: string;
}

export function checkComparable(a: AttemptFormInput, b: AttemptFormInput): ComparabilityCheck {
  if (a.templateId !== b.templateId)
    return { comparable: false, reason: "Different simulation templates" };
  if (a.templateVersionId !== b.templateVersionId)
    return {
      comparable: false,
      reason: `Different pinned versions (${a.templateVersionId} vs ${b.templateVersionId}); treat as separate forms`,
    };
  if ((a.cohortId || null) !== (b.cohortId || null))
    return { comparable: false, reason: "Different cohorts; confirm the cohort policy is equivalent" };
  return { comparable: true, reason: "Same template, version and cohort" };
}

/**
 * WORK-09 personalization guard: authored content must not vary difficulty
 * by candidate. Response-rule context conditions (`requires`) may only gate
 * on OBSERVED session facts (time, messages, events, opened resources) —
 * never on candidate identity, passport data, or inferred traits.
 *
 * Any content field whose name suggests per-candidate difficulty is rejected.
 */
const PERSONALIZATION_MARKERS = [
  /personalized/i,
  /difficulty_adjust/i,
  /easier_for/i,
  /candidate_tier/i,
  /passport_boost/i,
];

const ALLOWED_REQUIRES_KEYS = new Set([
  "minElapsedMinutes",
  "minCandidateMessages",
  "minCandidateEvents",
  "answeredQuestion",
  "completedTask",
  "openedResource",
  "minFlaggedRows",
]);

export function validateNoSilentPersonalization(content: unknown): string[] {
  const errors: string[] = [];
  const seen = new Set<unknown>();
  const walk = (node: unknown, path: string) => {
    if (!node || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${path}[${i}]`));
      return;
    }
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      for (const marker of PERSONALIZATION_MARKERS) {
        if (marker.test(k)) errors.push(`Personalization marker at ${path}.${k}`);
      }
      if (k === "requires" && v && typeof v === "object" && !Array.isArray(v)) {
        for (const rk of Object.keys(v as Record<string, unknown>)) {
          if (!ALLOWED_REQUIRES_KEYS.has(rk))
            errors.push(`Response-rule condition "${rk}" at ${path} is not an observable session fact`);
        }
      }
      walk(v, `${path}.${k}`);
    }
  };
  walk(content, "content");
  return errors;
}
