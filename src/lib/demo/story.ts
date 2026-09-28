/**
 * Demo product story (DEMO-01).
 *
 * The public demo must show the complete product story in one coherent flow:
 * example GitHub finding -> passport -> desktop workspace preview ->
 * code/test change -> teammate update -> submission -> employer evidence
 * report -> sharing controls.
 *
 * This module defines the canonical beat order. Rendering lives in
 * components; the story contract here is pure so tests can pin the order
 * and completeness (no beat may be skipped or reordered without updating
 * the story deliberately).
 */

export type DemoBeatId =
  | "github_finding"
  | "passport"
  | "desktop_preview"
  | "code_change"
  | "teammate_update"
  | "submission"
  | "employer_report"
  | "sharing";

export interface DemoBeat {
  id: DemoBeatId;
  /** Short title shown in the story navigator. */
  title: string;
  /** One-line lede explaining what this beat demonstrates. */
  lede: string;
  /** Route (or in-page anchor) the beat links to inside the demo. */
  route: string;
}

/** Canonical product-story order. Do not reorder without intent. */
export const DEMO_STORY_BEATS: readonly DemoBeat[] = [
  {
    id: "github_finding",
    title: "Example GitHub finding",
    lede: "A fictional repository scan surfaces one concrete, citable finding.",
    route: "/demo#finding",
  },
  {
    id: "passport",
    title: "Engineering passport",
    lede: "The finding becomes portable, evidence-backed profile material.",
    route: "/demo#passport",
  },
  {
    id: "desktop_preview",
    title: "Desktop workspace preview",
    lede: "See the assessment workspace before installing anything.",
    route: "/demo#workspace",
  },
  {
    id: "code_change",
    title: "Code and test change",
    lede: "A fictional candidate edits code and runs the tests in the workspace.",
    route: "/demo#code-change",
  },
  {
    id: "teammate_update",
    title: "Teammate update",
    lede: "Work communication happens alongside the code, not after it.",
    route: "/demo#teammate-update",
  },
  {
    id: "submission",
    title: "Submission",
    lede: "The work is finalized atomically and a receipt is issued.",
    route: "/demo#submission",
  },
  {
    id: "employer_report",
    title: "Employer evidence report",
    lede: "Reviewers see claims with sources, limits and test evidence.",
    route: "/demo#report",
  },
  {
    id: "sharing",
    title: "Sharing controls",
    lede: "The candidate previews exactly what a share link reveals.",
    route: "/demo#sharing",
  },
];

/** Index of a beat in the canonical story, or -1 when unknown. */
export function beatIndex(id: string): number {
  return DEMO_STORY_BEATS.findIndex((b) => b.id === id);
}

/**
 * Validate a beat list against the canonical story. Returns human-readable
 * errors; an empty array means the list tells the complete story in order.
 */
export function validateStoryBeats(beats: readonly DemoBeat[]): string[] {
  const errors: string[] = [];
  if (beats.length !== DEMO_STORY_BEATS.length) {
    errors.push(
      `Story must contain all ${DEMO_STORY_BEATS.length} beats, got ${beats.length}`
    );
  }
  const seen = new Set<string>();
  beats.forEach((beat, i) => {
    if (seen.has(beat.id)) errors.push(`Duplicate beat "${beat.id}" at position ${i}`);
    seen.add(beat.id);
    const expected = DEMO_STORY_BEATS[i];
    if (expected && beat.id !== expected.id) {
      errors.push(
        `Beat ${i} should be "${expected.id}" (${expected.title}), got "${beat.id}"`
      );
    }
    if (!beat.route) errors.push(`Beat "${beat.id}" has no route`);
  });
  for (const expected of DEMO_STORY_BEATS) {
    if (!seen.has(expected.id)) errors.push(`Missing beat "${expected.id}" (${expected.title})`);
  }
  return errors;
}
