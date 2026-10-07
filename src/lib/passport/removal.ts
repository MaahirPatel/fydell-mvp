/**
 * Removal, disconnect, and portability-boundary copy (GH-11, PASS-07).
 *
 * Kept in one place so the API routes, and later the UI, explain deletion
 * the same way everywhere: what is deleted, what is retained, and what
 * revocation cannot undo.
 */

export function projectRemovalExplanation(repoFullName: string): string {
  return [
    `Removed ${repoFullName} and its extracted findings from your passport.`,
    "This deletes the imported snapshot from Fydell's servers. It does not delete the public repository on GitHub.",
    "Share links you already created stop showing this project. Employers who previously opened or downloaded your passport keep the copies they already have. Revocation and removal cannot retract downloaded copies.",
    "Decisions an employer already recorded stay in their own records with their original timestamps.",
  ].join(" ");
}

export function githubDisconnectExplanation(): string {
  return [
    "Disconnected GitHub from your passport.",
    "Fydell stores no GitHub credentials for passport imports. Imports read public repositories through the public API. So there is no token to revoke.",
    "Disconnecting removes the linked GitHub username from your passport, so future imports will not be associated with it automatically.",
    "Projects you already imported stay in your passport until you remove them individually.",
  ].join(" ");
}

export function shareRevocationExplanation(): string {
  return [
    "Revoked. This link no longer grants access to your passport.",
    "Revocation stops future access through this link. It cannot retract copies an employer already downloaded or decisions they already recorded.",
  ].join(" ");
}

export function portabilityBoundaryNote(): string {
  return [
    "Your hosted passport is revocable: you can revoke any share link at any time.",
    "Application records are separate: when an employer records a decision or downloads your shared passport, that copy becomes their retained application record and is not affected by later revocation.",
  ].join(" ");
}
