/** Effective dates of the published terms and privacy notice. Change these whenever /terms or /privacy change. */
export const TERMS_VERSION = "2026-10-09";
export const PRIVACY_VERSION = "2026-10-09";

/** Stored on the account at sign-up so acceptance of a specific version can be shown later. */
export function acceptanceRecord(now = new Date()): { terms_version: string; privacy_version: string; terms_accepted_at: string } {
  return { terms_version: TERMS_VERSION, privacy_version: PRIVACY_VERSION, terms_accepted_at: now.toISOString() };
}
