/**
 * Public lifecycle vocabulary for acceptance (checklist §1).
 * DB values remain backward-compatible; this module is the canonical mapping.
 *
 * Mission: draft → validated → published → archived
 *   DB:     draft | under_review | active | archived (+ paused/closed legacy)
 *
 * Attempt kinds: scored | preview | demonstration
 *   Public alias: attempt_type (same values)
 */

export type PublicMissionStatus = "draft" | "validated" | "published" | "archived" | "paused" | "closed";

export type AttemptType = "scored" | "preview" | "demonstration";

export function toPublicMissionStatus(dbStatus: string): PublicMissionStatus {
  switch (dbStatus) {
    case "draft":
      return "draft";
    case "under_review":
      return "validated";
    case "active":
      return "published";
    case "archived":
      return "archived";
    case "paused":
      return "paused";
    case "closed":
      return "closed";
    default:
      return "draft";
  }
}

export function fromPublicMissionStatus(publicStatus: PublicMissionStatus): string {
  switch (publicStatus) {
    case "validated":
      return "under_review";
    case "published":
      return "active";
    default:
      return publicStatus;
  }
}

/** Production analytics include only scored attempts. */
export function isProductionAttempt(attemptType: string | null | undefined): boolean {
  return !attemptType || attemptType === "scored";
}

export function attemptTypeOf(kind: string | null | undefined): AttemptType {
  if (kind === "preview" || kind === "demonstration") return kind;
  return "scored";
}
