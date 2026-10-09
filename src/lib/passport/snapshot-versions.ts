import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sha256 } from "@/lib/builder-analysis/hash";
import type { Entailment } from "./github/types";
import type { PassportEvidence } from "./view";

/**
 * Immutable versions of one analyzed snapshot. The live passport_projects
 * row always shows the newest analysis of a revision; every analysis of it,
 * including the newest, is also appended here and never changed, so receipts
 * and earlier reports keep resolving to exactly what they cited.
 */

type EvidenceDb = {
  id: string;
  detector: string;
  category: string;
  finding: string;
  basis: string;
  path: string;
  start_line: number;
  end_line: number;
  excerpt: string[];
  source_url: string;
  limitations: string[] | null;
  entailment: Entailment | null;
};

export type SnapshotDb = {
  id: string;
  passport_id: string;
  repo_full_name: string;
  commit_sha: string;
  analysis_version: string | null;
  importer_version: string | null;
  source_kind: "github" | "upload" | null;
  status: string;
  contribution_statement: string;
  coverage: Record<string, unknown> | null;
  notices: unknown[] | null;
  manifest: Array<{ path: string; blobSha: string | null; included: boolean }> | null;
  passport_evidence: EvidenceDb[];
};

export type SnapshotVersion = {
  id: string;
  snapshotId: string;
  version: number;
  repoFullName: string;
  commitSha: string;
  analysisVersion: string;
  importerVersion: string | null;
  status: "complete" | "partial";
  coverage: Record<string, unknown>;
  manifestHash: string;
  findings: PassportEvidence[];
  contentHash: string;
  createdAt: string;
};

type VersionDb = {
  id: string;
  snapshot_id: string;
  version: number;
  repo_full_name: string;
  commit_sha: string;
  analysis_version: string;
  importer_version: string | null;
  status: "complete" | "partial";
  coverage: Record<string, unknown>;
  manifest_hash: string;
  findings: PassportEvidence[];
  content_hash: string;
  created_at: string;
};

const VERSION_COLUMNS = "id,snapshot_id,version,repo_full_name,commit_sha,analysis_version,importer_version,status,coverage,manifest_hash,findings,content_hash,created_at";

function toVersion(r: VersionDb): SnapshotVersion {
  return {
    id: r.id,
    snapshotId: r.snapshot_id,
    version: r.version,
    repoFullName: r.repo_full_name,
    commitSha: r.commit_sha,
    analysisVersion: r.analysis_version,
    importerVersion: r.importer_version,
    status: r.status,
    coverage: r.coverage,
    manifestHash: r.manifest_hash,
    findings: r.findings,
    contentHash: r.content_hash,
    createdAt: r.created_at,
  };
}

export async function loadSnapshot(snapshotId: string): Promise<SnapshotDb | null> {
  if (!/^[0-9a-f-]{36}$/.test(snapshotId)) return null;
  const { data } = await createAdminSupabaseClient()
    .from("passport_projects")
    .select(
      "id,passport_id,repo_full_name,commit_sha,analysis_version,importer_version,source_kind,status,contribution_statement,coverage,notices,manifest,passport_evidence(id,detector,category,finding,basis,path,start_line,end_line,excerpt,source_url,limitations,entailment)",
    )
    .eq("id", snapshotId)
    .maybeSingle();
  return (data as SnapshotDb | null) ?? null;
}

export function manifestHash(s: Pick<SnapshotDb, "manifest">): string {
  return sha256((s.manifest ?? []).map((m) => ({ path: m.path, blobSha: m.blobSha, included: m.included })).sort((a, b) => a.path.localeCompare(b.path)));
}

/** Hash of an analyzed snapshot: repository, revision, analysis version, file manifest and every cited finding. */
export function snapshotHash(s: SnapshotDb): string {
  return sha256({
    repo: s.repo_full_name.toLowerCase(),
    revision: s.commit_sha,
    analysisVersion: s.analysis_version,
    manifest: manifestHash(s),
    findings: [...s.passport_evidence]
      // Entailment joins the hash only where it was recorded, so snapshots stored before it keep their hashes.
      .map((e) => ({ id: e.id, detector: e.detector, path: e.path, startLine: e.start_line, endLine: e.end_line, excerpt: e.excerpt, ...(e.entailment ? { entailment: e.entailment } : {}) }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  });
}

function findingsOf(s: SnapshotDb): PassportEvidence[] {
  return [...s.passport_evidence]
    .sort((a, b) => a.path.localeCompare(b.path) || a.start_line - b.start_line)
    .map((e) => ({
      id: e.id,
      repo: s.repo_full_name,
      detector: e.detector,
      category: e.category,
      finding: e.finding,
      basis: e.basis === "dependency_declaration" ? "dependency_declaration" : "repository_observation",
      path: e.path,
      startLine: e.start_line,
      endLine: e.end_line,
      excerpt: e.excerpt,
      sourceUrl: e.source_url,
      limitations: e.limitations ?? [],
      entailment: e.entailment ?? null,
    }));
}

/**
 * Appends the snapshot's current content as a new version, or returns the
 * version that already holds exactly this content. Safe to call repeatedly
 * and concurrently: the same content always resolves to the same version.
 */
export async function recordSnapshotVersion(snapshotId: string): Promise<SnapshotVersion | null> {
  const s = await loadSnapshot(snapshotId);
  if (!s) return null;
  const admin = createAdminSupabaseClient();
  const hash = snapshotHash(s);
  const existing = async () => {
    const { data } = await admin.from("passport_snapshot_versions").select(VERSION_COLUMNS).eq("snapshot_id", s.id).eq("content_hash", hash).maybeSingle();
    return data ? toVersion(data as VersionDb) : null;
  };
  const found = await existing();
  if (found) return found;
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: top } = await admin.from("passport_snapshot_versions").select("version").eq("snapshot_id", s.id).order("version", { ascending: false }).limit(1).maybeSingle();
    const next = ((top as { version: number } | null)?.version ?? 0) + 1;
    const { data, error } = await admin
      .from("passport_snapshot_versions")
      .insert({
        snapshot_id: s.id,
        passport_id: s.passport_id,
        version: next,
        repo_full_name: s.repo_full_name,
        commit_sha: s.commit_sha,
        analysis_version: s.analysis_version ?? "unknown",
        importer_version: s.importer_version,
        status: s.status === "partial" ? "partial" : "complete",
        coverage: s.coverage ?? {},
        notices: s.notices ?? [],
        manifest_hash: manifestHash(s),
        findings: findingsOf(s),
        content_hash: hash,
      })
      .select(VERSION_COLUMNS)
      .single();
    if (data) return toVersion(data as VersionDb);
    if (error?.code !== "23505") throw new Error("Could not record the snapshot version.");
    const raced = await existing();
    if (raced) return raced;
  }
  throw new Error("Could not record the snapshot version.");
}

async function ownsSnapshot(ownerId: string, snapshotId: string): Promise<boolean> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("passport_projects").select("passport_id,passports!inner(owner_id)").eq("id", snapshotId).eq("passports.owner_id", ownerId).maybeSingle();
  return !!data;
}

/** Every version of one snapshot, newest first. Owner only. */
export async function listSnapshotVersions(ownerId: string, snapshotId: string): Promise<SnapshotVersion[]> {
  if (!/^[0-9a-f-]{36}$/.test(snapshotId) || !(await ownsSnapshot(ownerId, snapshotId))) return [];
  const { data } = await createAdminSupabaseClient().from("passport_snapshot_versions").select(VERSION_COLUMNS).eq("snapshot_id", snapshotId).order("version", { ascending: false });
  return ((data ?? []) as VersionDb[]).map(toVersion);
}

export async function getSnapshotVersionById(versionId: string): Promise<SnapshotVersion | null> {
  if (!/^[0-9a-f-]{36}$/.test(versionId)) return null;
  const { data } = await createAdminSupabaseClient().from("passport_snapshot_versions").select(VERSION_COLUMNS).eq("id", versionId).maybeSingle();
  return data ? toVersion(data as VersionDb) : null;
}

export async function findSnapshotVersionByHash(snapshotId: string, contentHash: string): Promise<SnapshotVersion | null> {
  const { data } = await createAdminSupabaseClient().from("passport_snapshot_versions").select(VERSION_COLUMNS).eq("snapshot_id", snapshotId).eq("content_hash", contentHash).maybeSingle();
  return data ? toVersion(data as VersionDb) : null;
}

/**
 * The version number each snapshot is at now. Snapshots saved before
 * versions existed get their first version recorded here, so every report
 * built afterwards cites a version that will not change.
 */
export async function currentVersionNumbers(snapshotIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (const id of snapshotIds) {
    const v = await recordSnapshotVersion(id);
    if (v) out.set(id, v.version);
  }
  return out;
}
