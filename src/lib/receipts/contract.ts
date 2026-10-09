/**
 * Engineer work receipts. Pure: shared by the server store, the owner's
 * pages and tests.
 *
 * A receipt records that Fydell's server accepted one artifact: which
 * artifact, at which revision, with which content hash, and what Fydell did
 * and did not check about it. It is owner-only. The hash is for checking
 * integrity, never for finding someone else's receipt.
 */

import type { Facet, FacetState } from "@/lib/builder-analysis/ledger";

export const RECEIPT_SCHEMA = "engineer-receipt-v1";

export type ArtifactType = "repository_snapshot" | "upload_snapshot" | "evidence_version" | "builder_analysis_report";

export const ARTIFACT_LABEL: Record<ArtifactType, string> = {
  repository_snapshot: "Analyzed repository snapshot",
  upload_snapshot: "Analyzed uploaded project",
  evidence_version: "Published project evidence version",
  builder_analysis_report: "Builder Analysis report",
};

export type ScopeItem = { facet: Facet; state: FacetState; detail: string };

export type ManifestRef = {
  filesIncluded?: number;
  filesExcluded?: number;
  findings?: number;
  manifestHash?: string;
  inputHash?: string;
};

export type ReceiptRow = {
  id: string;
  ownerId: string;
  artifactType: ArtifactType;
  projectKey: string | null;
  sourceRevision: string | null;
  snapshotId: string | null;
  evidenceVersionId: string | null;
  analysisId: string | null;
  importJobId: string | null;
  subjectVersion: string | null;
  analysisVersion: string | null;
  manifestRef: ManifestRef;
  contentHash: string;
  verificationScope: ScopeItem[];
  acceptedAt: string;
};

/**
 * processing: what has happened to the artifact since acceptance.
 *   current      the artifact is the one in use for this project or report
 *   superseded   a newer artifact replaced it; this one is kept unchanged
 *   removed      the engineer removed the artifact; the receipt remains
 */
export type ProcessingState = "current" | "superseded" | "removed";

/** Integrity: does the stored artifact still hash to what was accepted? */
export type Integrity = "matches" | "differs" | "artifact_removed";

export type ReceiptView = ReceiptRow & {
  processing: { state: ProcessingState; detail: string };
  integrity: { state: Integrity; detail: string };
  linkedReport: { label: string; href: string } | null;
  corrections: Array<{ findingId: string; kind: string; createdAt: string }>;
};

/** Always shown with a receipt, in the view and in every export. */
export const TIME_STATEMENT =
  "Accepted at is when Fydell's server received and stored this artifact. It does not show when the work itself was done.";

export const SCOPE_STATEMENT =
  "This receipt records what Fydell received and what it checked. It does not establish overall ability, and items marked not assessed were not looked at.";

/** The idempotency key for one artifact. The same artifact always resolves to the same receipt. */
export function receiptKey(type: ArtifactType, artifactId: string, contentHash: string): string {
  return `${type}:${artifactId}:${contentHash.slice(0, 16)}`;
}

export function snapshotScope(input: { sourceKind: "github" | "upload"; revision: string; hasTests: boolean; contributionStated: boolean }): ScopeItem[] {
  return [
    { facet: "code_exists", state: "observed", detail: `Source files were read at revision ${input.revision.slice(0, 12)}.` },
    { facet: "code_inspected", state: "observed", detail: "Files were matched against Fydell's pattern rules and each citation was checked against its file. Not a human review." },
    input.hasTests
      ? { facet: "tests_exist", state: "observed", detail: "The analyzed files include automated tests." }
      : { facet: "tests_exist", state: "not_observed", detail: "No test suite was found in the analyzed files." },
    { facet: "tests_executed", state: "not_assessed", detail: "Imported code is never run." },
    { facet: "tests_passed", state: "not_assessed", detail: "Imported code is never run." },
    { facet: "production_observed", state: "not_assessed", detail: "No production system was observed." },
    input.contributionStated
      ? { facet: "contribution_claimed", state: "claimed", detail: "The engineer wrote a contribution statement. Fydell has not checked it." }
      : { facet: "contribution_claimed", state: "not_observed", detail: "No contribution statement was written." },
    {
      facet: "attribution_supported",
      state: "not_assessed",
      detail: input.sourceKind === "upload" ? "Uploaded code has no history, so authorship was not assessed." : "Reading code at a commit does not establish who wrote it.",
    },
  ];
}

export function evidenceVersionScope(input: { confirmed: boolean; findings: number }): ScopeItem[] {
  return [
    input.findings
      ? { facet: "code_inspected", state: "observed", detail: `${input.findings} cited finding${input.findings === 1 ? "" : "s"} from the analyzed snapshot are included unchanged.` }
      : { facet: "code_inspected", state: "not_observed", detail: "This version cites no analyzed code." },
    { facet: "tests_executed", state: "not_assessed", detail: "Imported code is never run." },
    { facet: "production_observed", state: "not_assessed", detail: "No production system was observed." },
    input.confirmed
      ? { facet: "contribution_claimed", state: "claimed", detail: "The engineer confirmed the contribution statement as written in this version. Fydell has not checked it." }
      : { facet: "contribution_claimed", state: "not_observed", detail: "The contribution was not confirmed for this version." },
    { facet: "attribution_supported", state: "not_assessed", detail: "Who wrote the cited code was not assessed." },
  ];
}

export function analysisScope(input: { projects: number; scannedRepos: number; modelNarrative: boolean }): ScopeItem[] {
  return [
    { facet: "code_inspected", state: input.projects ? "observed" : "not_observed", detail: `${input.projects} analyzed project snapshot${input.projects === 1 ? "" : "s"} and ${input.scannedRepos} public repositor${input.scannedRepos === 1 ? "y" : "ies"} were read.` },
    { facet: "tests_executed", state: "not_assessed", detail: "No code was run for this report." },
    { facet: "production_observed", state: "not_assessed", detail: "No production system was observed." },
    { facet: "attribution_supported", state: "not_assessed", detail: "Who wrote the cited code was not assessed. Commit counts are GitHub's attribution to the linked username." },
    {
      facet: "code_exists",
      state: "observed",
      detail: input.modelNarrative
        ? "Every finding cites stored evidence. A language model wrote the summary prose from those findings only; paragraphs citing anything else were removed."
        : "Every finding cites stored evidence. The summary prose was generated from a template.",
    },
  ];
}

export const PROCESSING_LABEL: Record<ProcessingState, string> = {
  current: "Current",
  superseded: "Superseded, kept unchanged",
  removed: "Artifact removed",
};

export const INTEGRITY_LABEL: Record<Integrity, string> = {
  matches: "Stored artifact matches the accepted hash",
  differs: "Stored artifact no longer matches the accepted hash",
  artifact_removed: "Artifact no longer stored",
};

/** The export body: everything on the receipt plus when the export was made. */
export function receiptExport(view: ReceiptView, exportedAt: string) {
  return {
    schema: RECEIPT_SCHEMA,
    exportedAt,
    snapshotDate: view.acceptedAt,
    timeStatement: TIME_STATEMENT,
    scopeStatement: SCOPE_STATEMENT,
    receipt: {
      id: view.id,
      artifactType: view.artifactType,
      artifactLabel: ARTIFACT_LABEL[view.artifactType],
      project: view.projectKey,
      sourceRevision: view.sourceRevision,
      subjectVersion: view.subjectVersion,
      analysisVersion: view.analysisVersion,
      manifest: view.manifestRef,
      contentHash: view.contentHash,
      acceptedAt: view.acceptedAt,
      links: { snapshotId: view.snapshotId, evidenceVersionId: view.evidenceVersionId, analysisId: view.analysisId, importJobId: view.importJobId },
      verificationScope: view.verificationScope,
    },
    status: { processing: view.processing, integrity: view.integrity },
    corrections: view.corrections,
  };
}
