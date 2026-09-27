/**
 * Content versioning and protection (SCEN-09).
 *
 * Policy, enforced in pure logic here and at the database layer by migration
 * (published versions are immutable rows; publishing inserts a new version):
 *  - Only reviewed, immutable versions are published.
 *  - Publishing NEVER mutates a published version: it creates a new version.
 *  - Known issues, intended failures and expected outcomes are recorded on
 *    the version, so evaluators and employers see the same ground truth.
 *  - Reference answers (answer keys, deterministic expected values) are
 *    access-controlled: they live on the version row, which candidate-visible
 *    code paths never read (see candidate-view.ts projections).
 */

import { createHash } from "node:crypto";

export type VersionStatus = "draft" | "published" | "archived";

export interface ContentVersionRecord {
  id: string;
  templateId: string;
  version: number;
  /** SHA-256 of the canonical JSON of the version content. */
  contentHash: string;
  status: VersionStatus;
  changeNotes: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface KnownIssue {
  id: string;
  /** e.g. "intended_failure", "known_limitation", "expected_outcome". */
  kind: string;
  description: string;
  recordedAt: string;
  recordedBy: string;
}

export function hashContent(content: unknown): string {
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

/**
 * Publish a new version. Pure: given the current version list and the new
 * content, returns the version row to insert. NEVER reuses or mutates an
 * existing published version number.
 */
export function nextVersion(args: {
  templateId: string;
  existingVersions: Pick<ContentVersionRecord, "version" | "status">[];
  content: unknown;
  changeNotes: string;
  publishedBy: string;
  nowIso?: string;
}): ContentVersionRecord {
  if (!args.changeNotes || !args.changeNotes.trim())
    throw new Error("Publishing requires change notes (reviewed release)");
  const maxVersion = args.existingVersions.reduce((m, v) => Math.max(m, v.version), 0);
  const now = args.nowIso || new Date().toISOString();
  return {
    id: `pending:${args.templateId}:v${maxVersion + 1}`,
    templateId: args.templateId,
    version: maxVersion + 1,
    contentHash: hashContent(args.content),
    status: "published",
    changeNotes: args.changeNotes.trim(),
    publishedAt: now,
    createdAt: now,
  };
}

/**
 * Immutability guard: a published version's content hash must never change.
 * Throws when a stored published version no longer matches its recorded hash
 * (tamper or accidental mutation), or when code attempts to "update" a
 * published version instead of publishing a new one.
 */
export function assertPublishedImmutable(
  stored: ContentVersionRecord,
  currentContent: unknown
): void {
  if (stored.status !== "published") return;
  const now = hashContent(currentContent);
  if (now !== stored.contentHash) {
    throw new Error(
      `Published version ${stored.version} of template ${stored.templateId} was mutated ` +
        `(hash mismatch). Published versions are immutable: publish a new version instead.`
    );
  }
}

/**
 * Attempting to edit a published version in place is always wrong — force
 * the caller through nextVersion(). This helper makes the intent explicit
 * at call sites.
 */
export function forbidPublishedEdit(version: Pick<ContentVersionRecord, "version" | "status">): void {
  if (version.status === "published") {
    throw new Error(
      `Version ${version.version} is published and immutable. Publish a new version instead of editing it.`
    );
  }
}

/**
 * Reference-answer access control list: version-row fields that must never
 * be selected by candidate-visible queries. Used by tests to audit query
 * allowlists.
 */
export const REFERENCE_ANSWER_FIELDS = [
  "answerKey",
  "deterministicChecks",
  "rubricIndicators",
  "concepts",
  "strengthTemplates",
  "improvementTemplates",
  "knowledge",
  "withholds",
  "responseRules",
  "aiPersona",
] as const;
