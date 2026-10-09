import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sha256 } from "@/lib/builder-analysis/hash";
import { currentSnapshots } from "@/lib/passport/snapshots";
import type { PassportProject } from "@/lib/passport/view";
import {
  analysisScope,
  evidenceVersionScope,
  receiptKey,
  snapshotScope,
  type ArtifactType,
  type Integrity,
  type ManifestRef,
  type ProcessingState,
  type ReceiptRow,
  type ReceiptView,
  type ScopeItem,
} from "./contract";

const TABLE = "engineer_work_receipts";
const COLUMNS =
  "id,owner_id,artifact_type,project_key,source_revision,snapshot_id,evidence_version_id,analysis_id,import_job_id,subject_version,analysis_version,manifest_ref,content_hash,verification_scope,accepted_at";

type DbRow = {
  id: string;
  owner_id: string;
  artifact_type: ArtifactType;
  project_key: string | null;
  source_revision: string | null;
  snapshot_id: string | null;
  evidence_version_id: string | null;
  analysis_id: string | null;
  import_job_id: string | null;
  subject_version: string | null;
  analysis_version: string | null;
  manifest_ref: ManifestRef | null;
  content_hash: string;
  verification_scope: ScopeItem[] | null;
  accepted_at: string;
};

function toRow(r: DbRow): ReceiptRow {
  return {
    id: r.id,
    ownerId: r.owner_id,
    artifactType: r.artifact_type,
    projectKey: r.project_key,
    sourceRevision: r.source_revision,
    snapshotId: r.snapshot_id,
    evidenceVersionId: r.evidence_version_id,
    analysisId: r.analysis_id,
    importJobId: r.import_job_id,
    subjectVersion: r.subject_version,
    analysisVersion: r.analysis_version,
    manifestRef: r.manifest_ref ?? {},
    contentHash: r.content_hash,
    verificationScope: r.verification_scope ?? [],
    acceptedAt: r.accepted_at,
  };
}

type Insert = {
  ownerId: string;
  key: string;
  artifactType: ArtifactType;
  projectKey: string | null;
  sourceRevision: string | null;
  snapshotId?: string | null;
  evidenceVersionId?: string | null;
  analysisId?: string | null;
  importJobId?: string | null;
  subjectVersion: string | null;
  analysisVersion: string | null;
  manifestRef: ManifestRef;
  contentHash: string;
  verificationScope: ScopeItem[];
};

/**
 * Inserts once per idempotency key. A retried request, a re-run import job or
 * a lost response all resolve to the same receipt, accepted at the first time.
 */
async function issue(input: Insert): Promise<ReceiptRow> {
  const admin = createAdminSupabaseClient();
  const find = async () => {
    const { data } = await admin.from(TABLE).select(COLUMNS).eq("owner_id", input.ownerId).eq("idempotency_key", input.key).maybeSingle();
    return data ? toRow(data as DbRow) : null;
  };
  const existing = await find();
  if (existing) return existing;
  const { data, error } = await admin
    .from(TABLE)
    .insert({
      owner_id: input.ownerId,
      idempotency_key: input.key,
      artifact_type: input.artifactType,
      project_key: input.projectKey,
      source_revision: input.sourceRevision,
      snapshot_id: input.snapshotId ?? null,
      evidence_version_id: input.evidenceVersionId ?? null,
      analysis_id: input.analysisId ?? null,
      import_job_id: input.importJobId ?? null,
      subject_version: input.subjectVersion,
      analysis_version: input.analysisVersion,
      manifest_ref: input.manifestRef,
      content_hash: input.contentHash,
      verification_scope: input.verificationScope,
    })
    .select(COLUMNS)
    .single();
  if (data) return toRow(data as DbRow);
  if (error?.code === "23505") {
    const raced = await find();
    if (raced) return raced;
  }
  throw new Error("Could not record the receipt.");
}

/* ------------------------------------------------------------------ */
/* Snapshot hashing: computed from what is stored, so it can be rechecked */
/* ------------------------------------------------------------------ */

type SnapshotDb = {
  id: string;
  passport_id: string;
  repo_full_name: string;
  commit_sha: string;
  analysis_version: string | null;
  importer_version: string | null;
  source_kind: "github" | "upload" | null;
  contribution_statement: string;
  manifest: Array<{ path: string; blobSha: string | null; included: boolean }> | null;
  passport_evidence: Array<{ id: string; detector: string; path: string; start_line: number; end_line: number; excerpt: string[] }>;
};

async function loadSnapshot(snapshotId: string): Promise<SnapshotDb | null> {
  const { data } = await createAdminSupabaseClient()
    .from("passport_projects")
    .select("id,passport_id,repo_full_name,commit_sha,analysis_version,importer_version,source_kind,contribution_statement,manifest,passport_evidence(id,detector,path,start_line,end_line,excerpt)")
    .eq("id", snapshotId)
    .maybeSingle();
  return (data as SnapshotDb | null) ?? null;
}

function manifestHash(s: SnapshotDb): string {
  return sha256((s.manifest ?? []).map((m) => ({ path: m.path, blobSha: m.blobSha, included: m.included })).sort((a, b) => a.path.localeCompare(b.path)));
}

/** Hash of an analyzed snapshot: repository, revision, analysis version, file manifest and every cited finding. */
function snapshotHash(s: SnapshotDb): string {
  return sha256({
    repo: s.repo_full_name.toLowerCase(),
    revision: s.commit_sha,
    analysisVersion: s.analysis_version,
    manifest: manifestHash(s),
    findings: [...s.passport_evidence]
      .map((e) => ({ id: e.id, detector: e.detector, path: e.path, startLine: e.start_line, endLine: e.end_line, excerpt: e.excerpt }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  });
}

async function ownsPassport(ownerId: string, passportId: string): Promise<boolean> {
  const { data } = await createAdminSupabaseClient().from("passports").select("id").eq("id", passportId).eq("owner_id", ownerId).maybeSingle();
  return !!data;
}

/** Receipt for one analyzed project snapshot, as stored. Safe to call again after any retry. */
export async function issueSnapshotReceipt(ownerId: string, snapshotId: string, importJobId: string | null): Promise<ReceiptRow> {
  const s = await loadSnapshot(snapshotId);
  if (!s || !(await ownsPassport(ownerId, s.passport_id))) throw new Error("Snapshot not found for this owner.");
  const hash = snapshotHash(s);
  const sourceKind = s.source_kind === "upload" ? "upload" : "github";
  const included = (s.manifest ?? []).filter((m) => m.included).length;
  return issue({
    ownerId,
    key: receiptKey(sourceKind === "upload" ? "upload_snapshot" : "repository_snapshot", snapshotId, hash),
    artifactType: sourceKind === "upload" ? "upload_snapshot" : "repository_snapshot",
    projectKey: s.repo_full_name,
    sourceRevision: s.commit_sha,
    snapshotId,
    importJobId,
    subjectVersion: s.importer_version,
    analysisVersion: s.analysis_version,
    manifestRef: { filesIncluded: included, filesExcluded: (s.manifest ?? []).length - included, findings: s.passport_evidence.length, manifestHash: manifestHash(s) },
    contentHash: hash,
    verificationScope: snapshotScope({
      sourceKind,
      revision: s.commit_sha,
      hasTests: s.passport_evidence.some((e) => e.detector === "test_suite"),
      contributionStated: s.contribution_statement.trim().length > 0,
    }),
  });
}

/** Receipt for one published evidence version. The version's own content hash is reused. */
export async function issueEvidenceReceipt(ownerId: string, versionId: string): Promise<ReceiptRow> {
  const { data } = await createAdminSupabaseClient()
    .from("evidence_versions")
    .select("id,owner_id,project_key,version,schema_version,content_hash,content")
    .eq("id", versionId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  const v = data as { id: string; project_key: string; version: number; schema_version: string; content_hash: string; content: { confirmation?: { confirmed?: boolean }; findings?: unknown[]; provenance?: { commitSha?: string | null; snapshotId?: string | null; analysisVersion?: string | null } } } | null;
  if (!v) throw new Error("Evidence version not found for this owner.");
  return issue({
    ownerId,
    key: receiptKey("evidence_version", v.id, v.content_hash),
    artifactType: "evidence_version",
    projectKey: v.project_key,
    sourceRevision: v.content.provenance?.commitSha ?? null,
    snapshotId: v.content.provenance?.snapshotId ?? null,
    evidenceVersionId: v.id,
    subjectVersion: `v${v.version}`,
    analysisVersion: v.content.provenance?.analysisVersion ?? v.schema_version,
    manifestRef: { findings: Array.isArray(v.content.findings) ? v.content.findings.length : 0 },
    contentHash: v.content_hash,
    verificationScope: evidenceVersionScope({ confirmed: v.content.confirmation?.confirmed === true, findings: Array.isArray(v.content.findings) ? v.content.findings.length : 0 }),
  });
}

/** Receipt for one completed Builder Analysis run. */
export async function issueAnalysisReceipt(
  ownerId: string,
  input: { analysisId: string; reportHash: string; inputHash: string; analysisVersion: string; projects: number; scannedRepos: number; findings: number; modelNarrative: boolean },
): Promise<ReceiptRow> {
  return issue({
    ownerId,
    key: receiptKey("builder_analysis_report", input.analysisId, input.reportHash),
    artifactType: "builder_analysis_report",
    projectKey: null,
    sourceRevision: null,
    analysisId: input.analysisId,
    subjectVersion: null,
    analysisVersion: input.analysisVersion,
    manifestRef: { findings: input.findings, inputHash: input.inputHash },
    contentHash: input.reportHash,
    verificationScope: analysisScope({ projects: input.projects, scannedRepos: input.scannedRepos, modelNarrative: input.modelNarrative }),
  });
}

/* ------------------------------------------------------------------ */
/* Reading                                                              */
/* ------------------------------------------------------------------ */

export async function listReceipts(ownerId: string, limit = 100): Promise<ReceiptRow[]> {
  const { data } = await createAdminSupabaseClient()
    .from(TABLE)
    .select(COLUMNS)
    .eq("owner_id", ownerId)
    .order("accepted_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 200));
  return ((data ?? []) as DbRow[]).map(toRow);
}

/** The newest receipt for each snapshot id, for linking from project pages and import rows. */
export async function receiptIdsForSnapshots(ownerId: string, snapshotIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!snapshotIds.length) return out;
  const { data } = await createAdminSupabaseClient()
    .from(TABLE)
    .select("id,snapshot_id,accepted_at")
    .eq("owner_id", ownerId)
    .in("artifact_type", ["repository_snapshot", "upload_snapshot"])
    .in("snapshot_id", snapshotIds)
    .order("accepted_at", { ascending: false });
  for (const r of (data ?? []) as Array<{ id: string; snapshot_id: string }>) if (!out.has(r.snapshot_id)) out.set(r.snapshot_id, r.id);
  return out;
}

async function snapshotStatus(ownerId: string, r: ReceiptRow): Promise<Pick<ReceiptView, "processing" | "integrity" | "linkedReport" | "corrections">> {
  const s = r.snapshotId ? await loadSnapshot(r.snapshotId) : null;
  if (!s || !(await ownsPassport(ownerId, s.passport_id))) {
    return {
      processing: { state: "removed", detail: "This project snapshot was removed from your work record. The receipt is kept." },
      integrity: { state: "artifact_removed", detail: "The artifact is no longer stored, so its hash cannot be rechecked." },
      linkedReport: null,
      corrections: [],
    };
  }
  const { data: siblings } = await createAdminSupabaseClient()
    .from("passport_projects")
    .select("id,repo_full_name,commit_sha,analyzed_at")
    .eq("passport_id", s.passport_id)
    .eq("repo_full_name", s.repo_full_name);
  const asProjects = ((siblings ?? []) as Array<{ id: string; repo_full_name: string; commit_sha: string; analyzed_at: string }>).map(
    (p): PassportProject => ({
      id: p.id, repoFullName: p.repo_full_name, commitSha: p.commit_sha, analyzedAt: p.analyzed_at, htmlUrl: "", primaryLanguage: null, isFork: false,
      contributionStatement: "", status: "complete", coverage: { totalFiles: 0, analyzedFiles: 0, skippedFiles: 0, languages: [], skipReasons: {}, treeTruncated: false }, notices: [], evidence: [],
    }),
  );
  const current = currentSnapshots(asProjects)[0];
  const state: ProcessingState = current?.id === s.id ? "current" : "superseded";
  const hash = snapshotHash(s);
  const integrity: Integrity = hash === r.contentHash ? "matches" : "differs";
  const { data: notes } = await createAdminSupabaseClient()
    .from("passport_corrections")
    .select("finding_id,kind,created_at,withdrawn_at")
    .eq("project_id", s.id)
    .is("withdrawn_at", null)
    .order("created_at", { ascending: true });
  return {
    processing: {
      state,
      detail: state === "current" ? "This is the snapshot your project report uses now." : `A newer import of ${s.repo_full_name} is now current. This snapshot is kept as it was.`,
    },
    integrity: {
      state: integrity,
      detail:
        integrity === "matches"
          ? "Recomputed from the stored files list and findings just now."
          : "The stored snapshot was re-analyzed in place after this receipt (for example a partial import completed). The receipt still records what was accepted then.",
    },
    linkedReport: { label: `Project report at revision ${s.commit_sha.slice(0, 7)}`, href: `/app/candidate/projects/${s.id}` },
    corrections: ((notes ?? []) as Array<{ finding_id: string; kind: string; created_at: string }>).map((n) => ({ findingId: n.finding_id, kind: n.kind, createdAt: n.created_at })),
  };
}

async function evidenceStatus(ownerId: string, r: ReceiptRow): Promise<Pick<ReceiptView, "processing" | "integrity" | "linkedReport" | "corrections">> {
  const admin = createAdminSupabaseClient();
  const { data } = r.evidenceVersionId
    ? await admin.from("evidence_versions").select("id,project_key,version,content_hash").eq("id", r.evidenceVersionId).eq("owner_id", ownerId).maybeSingle()
    : { data: null };
  const v = data as { id: string; project_key: string; version: number; content_hash: string } | null;
  if (!v) {
    return {
      processing: { state: "removed", detail: "This evidence version was removed with its project. The receipt is kept." },
      integrity: { state: "artifact_removed", detail: "The artifact is no longer stored, so its hash cannot be rechecked." },
      linkedReport: null,
      corrections: [],
    };
  }
  const { data: top } = await admin
    .from("evidence_versions")
    .select("version")
    .eq("owner_id", ownerId)
    .eq("project_key", v.project_key)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const latest = (top as { version: number } | null)?.version ?? v.version;
  return {
    processing:
      latest === v.version
        ? { state: "current", detail: `Version ${v.version} is the newest published version of this project.` }
        : { state: "superseded", detail: `Version ${latest} was published later. Version ${v.version} is kept unchanged and still resolves for anyone it was shared with.` },
    integrity: v.content_hash === r.contentHash
      ? { state: "matches", detail: "Evidence versions cannot be edited; the stored hash matches." }
      : { state: "differs", detail: "The stored hash differs from the accepted hash." },
    linkedReport: r.snapshotId ? { label: `Project evidence version ${v.version}`, href: `/app/candidate/projects/${r.snapshotId}` } : null,
    corrections: [],
  };
}

async function analysisStatus(ownerId: string, r: ReceiptRow): Promise<Pick<ReceiptView, "processing" | "integrity" | "linkedReport" | "corrections">> {
  const admin = createAdminSupabaseClient();
  const { data } = r.analysisId
    ? await admin.from("builder_analyses").select("id,report_hash,created_at").eq("id", r.analysisId).eq("owner_id", ownerId).maybeSingle()
    : { data: null };
  const row = data as { id: string; report_hash: string | null; created_at: string } | null;
  if (!row) {
    return {
      processing: { state: "removed", detail: "This report is no longer stored. The receipt is kept." },
      integrity: { state: "artifact_removed", detail: "The artifact is no longer stored, so its hash cannot be rechecked." },
      linkedReport: null,
      corrections: [],
    };
  }
  const { data: newest } = await admin
    .from("builder_analyses")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("status", "complete")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const current = (newest as { id: string } | null)?.id === row.id;
  return {
    processing: current
      ? { state: "current", detail: "This is your current Builder Analysis report." }
      : { state: "superseded", detail: "A newer run is current. This report is kept unchanged and can still be opened." },
    integrity: row.report_hash === r.contentHash
      ? { state: "matches", detail: "Finished reports cannot be edited; the stored report hash matches." }
      : { state: "differs", detail: "The stored report hash differs from the accepted hash." },
    linkedReport: { label: "Builder Analysis report", href: `/app/candidate/reports?run=${row.id}` },
    corrections: [],
  };
}

/** One receipt with its live status. Only the owner can read it; anyone else gets null, never a hint it exists. */
export async function getReceiptView(ownerId: string, id: string): Promise<ReceiptView | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await createAdminSupabaseClient().from(TABLE).select(COLUMNS).eq("owner_id", ownerId).eq("id", id).maybeSingle();
  if (!data) return null;
  const row = toRow(data as DbRow);
  const status =
    row.artifactType === "evidence_version"
      ? await evidenceStatus(ownerId, row)
      : row.artifactType === "builder_analysis_report"
        ? await analysisStatus(ownerId, row)
        : await snapshotStatus(ownerId, row);
  return { ...row, ...status };
}
