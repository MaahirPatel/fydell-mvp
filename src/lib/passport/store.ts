import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { assemblePassport } from "./assemble";
import { listContributions, listDecisionsForPassport } from "./context-store";
import { validateCorrectionReason, type Correction, type CorrectionStatus } from "./corrections";
import { ANALYSIS_VERSION, IMPORTER_VERSION, type ExtractionResult, type ManifestEntry } from "./github/types";
import { githubDisconnectExplanation } from "./removal";
import { accountDisplayName } from "@/lib/auth/account-name";
import { UPLOAD_IMPORTER_VERSION } from "./upload";
import { shareState, validateExpiryInput } from "./sharing";
import { currentSnapshots, markSuperseded } from "./snapshots";
import { recordSnapshotVersion } from "./snapshot-versions";
import { mergePresentations } from "./presentation";
import { listPresentationRows } from "./presentation-store";
import {
  SHAREABLE_FIELDS,
  projectForShare,
  type CapabilitySummary,
  type EngineerNote,
  type PassportData,
  type PassportEvidence,
  type PassportProject,
  type ShareField,
  type VersionPolicy,
} from "./view";

type NoteKind = EngineerNote["kind"];
import type { RoleSuggestion } from "./github/types";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

function skipReasonCounts(skipped: Array<{ reason: string }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of skipped) counts[s.reason] = (counts[s.reason] ?? 0) + 1;
  return counts;
}

type PassportRow = {
  id: string;
  owner_id: string;
  display_name: string;
  headline: string;
  github_login: string | null;
  capability_summary: CapabilitySummary | Record<string, never>;
  role_suggestions: RoleSuggestion[];
  updated_at: string;
};

type ProjectRow = {
  id: string;
  repo_full_name: string;
  html_url: string;
  commit_sha: string;
  primary_language: string | null;
  is_fork: boolean;
  contribution_statement: string;
  status: PassportProject["status"];
  coverage: Partial<PassportProject["coverage"]>;
  notices: string[];
  analyzed_at: string;
  analysis_version: string | null;
  revision_ref: string | null;
  importer_version: string | null;
  source_kind: "github" | "upload" | null;
  passport_evidence: Array<{
    id: string;
    detector: string;
    category: string;
    finding: string;
    basis: PassportEvidence["basis"];
    path: string;
    start_line: number;
    end_line: number;
    excerpt: string[];
    source_url: string;
    limitations: string[];
  }>;
};

async function loadPassport(passportId: string, opts: { withNotes?: boolean } = {}): Promise<PassportData | null> {
  const data = await loadPassportCore(passportId);
  if (!data || !opts.withNotes) return data;
  return { ...data, engineerNotes: await loadNotes(passportId) };
}

async function loadPassportCore(passportId: string): Promise<PassportData | null> {
  const admin = createAdminSupabaseClient();
  const { data: passport } = await admin.from("passports").select("*").eq("id", passportId).maybeSingle();
  if (!passport) return null;
  const row = passport as PassportRow;
  const { data: projects } = await admin
    .from("passport_projects")
    .select(
      "id,repo_full_name,html_url,commit_sha,primary_language,is_fork,contribution_statement,status,coverage,notices,analyzed_at,analysis_version,revision_ref,importer_version,source_kind, passport_evidence(*)",
    )
    .eq("passport_id", passportId)
    .order("analyzed_at", { ascending: false });
  const projectRows = (projects ?? []) as ProjectRow[];
  const [profileName, contributions] = await Promise.all([profileDisplayName(row.owner_id), listContributions(passportId)]);
  const summary = row.capability_summary as CapabilitySummary;
  const projectList: PassportProject[] = projectRows.map((p) => ({
    id: p.id,
    revisionRef: p.revision_ref,
    analysisVersion: p.analysis_version,
    importerVersion: p.importer_version,
    analysisStatus: p.status === "partial" ? "partial" : "complete",
    repoFullName: p.repo_full_name,
    sourceKind: p.source_kind === "upload" ? "upload" : "github",
    htmlUrl: p.html_url,
    commitSha: p.commit_sha,
    primaryLanguage: p.primary_language,
    isFork: p.is_fork,
    // The project context is the one place a contribution is stated; the snapshot copy only covers records saved before it.
    contributionStatement: contributions.get(p.repo_full_name)?.workedOn || p.contribution_statement,
    status: p.status,
    coverage: {
      totalFiles: p.coverage.totalFiles ?? 0,
      analyzedFiles: p.coverage.analyzedFiles ?? 0,
      skippedFiles: p.coverage.skippedFiles ?? 0,
      languages: p.coverage.languages ?? [],
      skipReasons: p.coverage.skipReasons ?? {},
      treeTruncated: p.coverage.treeTruncated ?? false,
    },
    analyzedAt: p.analyzed_at,
    notices: p.notices ?? [],
    evidence: (p.passport_evidence ?? [])
      .sort((a, b) => a.path.localeCompare(b.path) || a.start_line - b.start_line)
      .map((e) => ({
        id: e.id,
        repo: p.repo_full_name,
        detector: e.detector,
        category: e.category,
        finding: e.finding,
        basis: e.basis,
        path: e.path,
        startLine: e.start_line,
        endLine: e.end_line,
        excerpt: e.excerpt,
        sourceUrl: e.source_url,
        limitations: e.limitations ?? [],
      })),
  }));
  return {
    displayName: profileName || row.display_name,
    headline: row.headline,
    githubLogin: row.github_login,
    updatedAt: row.updated_at,
    roleSuggestions: row.role_suggestions ?? [],
    capabilities: summary && "source" in summary ? summary : { source: "rules", capabilities: [], notShown: [] },
    // Older snapshots of a reimported repository are marked stale so they
    // keep provenance without feeding new summaries or shares (GH-10).
    projects: markSuperseded(projectList),
  };
}

async function passportIdFor(ownerId: string): Promise<string | null> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("passports").select("id").eq("owner_id", ownerId).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export async function getOwnerPassport(ownerId: string, opts: { withNotes?: boolean } = {}): Promise<PassportData | null> {
  const id = await passportIdFor(ownerId);
  return id ? loadPassport(id, opts) : null;
}

/** File manifest of one owned snapshot, loaded on demand (it can hold hundreds of entries). */
export async function getProjectManifest(ownerId: string, projectId: string): Promise<{ manifest: ManifestEntry[]; importerVersion: string | null } | null> {
  if (!/^[0-9a-f-]{36}$/.test(projectId)) return null;
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return null;
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_projects")
    .select("manifest,importer_version")
    .eq("id", projectId)
    .eq("passport_id", passportId)
    .maybeSingle();
  if (!data) return null;
  const row = data as { manifest: ManifestEntry[] | null; importer_version: string | null };
  return { manifest: row.manifest ?? [], importerVersion: row.importer_version };
}

async function refreshSummary(passportId: string): Promise<PassportData | null> {
  const current = await loadPassport(passportId);
  if (!current) return null;
  const assembled = await assemblePassport(current.projects, current);
  const admin = createAdminSupabaseClient();
  await admin
    .from("passports")
    .update({ role_suggestions: assembled.roleSuggestions, capability_summary: assembled.capabilities, updated_at: new Date().toISOString() })
    .eq("id", passportId);
  return loadPassport(passportId);
}

/** True when any active share pins this exact snapshot, so its evidence must stay byte-identical. */
async function snapshotIsPinned(passportId: string, projectId: string): Promise<boolean> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_shares")
    .select("id")
    .eq("passport_id", passportId)
    .contains("pinned_project_ids", [projectId])
    .limit(1);
  return (data ?? []).length > 0;
}

async function snapshotHasNotes(passportId: string, projectId: string): Promise<boolean> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_corrections")
    .select("id")
    .eq("passport_id", passportId)
    .eq("project_id", projectId)
    .is("withdrawn_at", null)
    .limit(1);
  return (data ?? []).length > 0;
}

export type SaveOutcome = { passport: PassportData; projectId: string; reusedExistingVersion: boolean };

/**
 * Saves one analyzed snapshot (repository + commit + analysis version) as a
 * report version. A snapshot that already exists is kept as-is when it is
 * complete or pinned by a share; only an unpinned partial snapshot of the
 * same commit may be replaced by a fuller analysis. Failed analyses are never
 * saved, so a failed re-analysis can't remove an existing report.
 */
export async function saveProjectVersion(
  owner: { id: string; displayName: string },
  githubLogin: string | null,
  result: ExtractionResult,
  contributionStatement: string,
  jobId: string | null = null,
): Promise<SaveOutcome> {
  if (!result.repository || !result.commitSha || result.status === "failed") throw new Error("Cannot save a failed analysis.");
  const admin = createAdminSupabaseClient();
  let passportId = await passportIdFor(owner.id);
  if (passportId) {
    const { data: existing } = await admin
      .from("passport_projects")
      .select("id,status,analysis_version")
      .eq("passport_id", passportId)
      .eq("repo_id", result.repository.id)
      .eq("commit_sha", result.commitSha)
      .maybeSingle();
    const row = existing as { id: string; status: string; analysis_version: string } | null;
    if (row) {
      const fuller = row.status === "partial" && result.status === "complete";
      const newerAnalysis = row.analysis_version !== ANALYSIS_VERSION;
      // Never replace evidence someone relies on: a pinned share or an engineer's note.
      const replaceable =
        (fuller || newerAnalysis) && !(await snapshotIsPinned(passportId, row.id)) && !(await snapshotHasNotes(passportId, row.id));
      // The analysis being replaced is kept as an immutable version first, so
      // receipts and reports that cite it keep resolving to it.
      await recordSnapshotVersion(row.id);
      if (!replaceable) {
        const passport = await loadPassport(passportId);
        if (!passport) throw new Error("Could not load the saved passport.");
        return { passport, projectId: row.id, reusedExistingVersion: true };
      }
    }
  }
  const passport = await saveProject(owner, githubLogin, result, contributionStatement, jobId);
  passportId = passportId ?? (await passportIdFor(owner.id));
  const { data: saved } = await admin
    .from("passport_projects")
    .select("id")
    .eq("passport_id", passportId as string)
    .eq("repo_id", result.repository.id)
    .eq("commit_sha", result.commitSha)
    .single();
  const projectId = (saved as { id: string }).id;
  await recordSnapshotVersion(projectId);
  return { passport, projectId, reusedExistingVersion: false };
}

export async function saveProject(
  owner: { id: string; displayName: string },
  githubLogin: string | null,
  result: ExtractionResult,
  contributionStatement: string,
  jobId: string | null = null,
): Promise<PassportData> {
  if (!result.repository || !result.commitSha || result.status === "failed") throw new Error("Cannot save a failed analysis.");
  const admin = createAdminSupabaseClient();
  const isUpload = result.repository.id < 0;

  let passportId = await passportIdFor(owner.id);
  if (!passportId) {
    const { data, error } = await admin
      .from("passports")
      .insert({ owner_id: owner.id, display_name: owner.displayName, github_login: githubLogin })
      .select("id")
      .single();
    if (error || !data) throw new Error("Could not create the passport.");
    passportId = (data as { id: string }).id;
    if (githubLogin) await syncGithubAccount(owner.id, githubLogin);
  } else if (githubLogin) {
    const { data: linked } = await admin.from("passports").update({ github_login: githubLogin }).eq("id", passportId).is("github_login", null).select("id");
    if ((linked ?? []).length) await syncGithubAccount(owner.id, githubLogin);
  }

  if (!contributionStatement.trim()) {
    const { data: existing } = await admin
      .from("passport_projects")
      .select("contribution_statement")
      .eq("passport_id", passportId)
      .eq("repo_id", result.repository.id)
      .order("analyzed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    contributionStatement = (existing as { contribution_statement: string } | null)?.contribution_statement ?? "";
  }

  const { data: project, error: projectError } = await admin
    .from("passport_projects")
    .upsert(
      {
        passport_id: passportId,
        repo_id: result.repository.id,
        repo_full_name: result.repository.fullName,
        html_url: result.repository.htmlUrl,
        commit_sha: result.commitSha,
        primary_language: result.repository.primaryLanguage,
        is_fork: result.repository.fork,
        contribution_statement: contributionStatement.slice(0, 1000),
        status: result.status,
        coverage: {
          totalFiles: result.coverage.totalFiles,
          analyzedFiles: result.coverage.analyzedFiles,
          skippedFiles: result.coverage.skipped.length,
          languages: result.coverage.languages,
          skipReasons: skipReasonCounts(result.coverage.skipped),
          treeTruncated: result.coverage.treeTruncated,
        },
        notices: result.notices,
        analysis_version: ANALYSIS_VERSION,
        analyzed_at: new Date().toISOString(),
        revision_ref: result.revisionRef ?? null,
        manifest: result.manifest ?? [],
        importer_version: isUpload ? UPLOAD_IMPORTER_VERSION : IMPORTER_VERSION,
        source_kind: isUpload ? "upload" : "github",
        imported_at: new Date().toISOString(),
        job_id: jobId,
      },
      { onConflict: "passport_id,repo_id,commit_sha" },
    )
    .select("id")
    .single();
  if (projectError || !project) throw new Error("Could not save the project.");
  const projectId = (project as { id: string }).id;

  // GH-10: older snapshots of the same repository are kept, not deleted.
  // loadPassport marks them stale so provenance survives and previously
  // shared records keep resolving to the evidence they cited. Evidence is
  // replaced only for this exact snapshot; the upsert above means a retry of
  // the same commit reuses the same project row and deterministic finding
  // ids, so retries cannot duplicate findings.
  await admin.from("passport_evidence").delete().eq("project_id", projectId);
  if (result.findings.length) {
    const { error } = await admin.from("passport_evidence").insert(
      result.findings.map((f) => ({
        id: f.id,
        project_id: projectId,
        detector: f.detector,
        category: f.category,
        finding: f.finding,
        basis: f.basis,
        path: f.path,
        start_line: f.startLine,
        end_line: f.endLine,
        excerpt: f.excerpt,
        source_url: f.sourceUrl,
        limitations: f.limitations,
      })),
    );
    if (error) throw new Error("Could not save the evidence.");
  }

  const refreshed = await refreshSummary(passportId);
  if (!refreshed) throw new Error("Could not load the saved passport.");
  return refreshed;
}

export async function removeProject(ownerId: string, repoFullName: string): Promise<PassportData | null> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return null;
  const admin = createAdminSupabaseClient();
  const { data: rows } = await admin.from("passport_projects").select("id").eq("passport_id", passportId).eq("repo_full_name", repoFullName);
  const ids = ((rows ?? []) as { id: string }[]).map((r) => r.id);
  if (ids.length) {
    // Employer review records must outlive the candidate's snapshot; the FK would otherwise cascade them away.
    await admin.from("requirement_evidence_mappings").update({ evidence_project_id: null }).in("evidence_project_id", ids);
  }
  await admin.from("passport_projects").delete().eq("passport_id", passportId).eq("repo_full_name", repoFullName);
  return refreshSummary(passportId);
}

export type RemovalImpact = {
  shares: { id: string; label: string }[];
  applications: { id: string; roleTitle: string; organizationName: string }[];
};

/** Active share links and open applications that currently show this repository. */
export async function projectRemovalImpact(ownerId: string, repoFullName: string): Promise<RemovalImpact> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return { shares: [], applications: [] };
  const admin = createAdminSupabaseClient();
  const [{ data: projectRows }, shares] = await Promise.all([
    admin.from("passport_projects").select("id").eq("passport_id", passportId).eq("repo_full_name", repoFullName),
    listShares(ownerId),
  ]);
  const versionIds = new Set(((projectRows ?? []) as { id: string }[]).map((r) => r.id));
  const now = Date.now();
  const affected = shares.filter((s) => {
    if (s.revokedAt || (s.expiresAt && Date.parse(s.expiresAt) <= now)) return false;
    if (s.versionPolicy === "pinned" && s.pinnedProjectIds) return s.pinnedProjectIds.some((id) => versionIds.has(id));
    return s.repos === null || s.repos.includes(repoFullName);
  });
  if (!affected.length) return { shares: [], applications: [] };

  const { data: appRows } = await admin
    .from("role_applications")
    .select("id,share_id,role_snapshot")
    .in("share_id", affected.map((s) => s.id))
    .eq("status", "submitted")
    .neq("stage", "closed");
  type AppRow = { id: string; share_id: string; role_snapshot: { title?: unknown; organizationName?: unknown } | null };
  const applications = ((appRows ?? []) as AppRow[]).map((a) => ({
    id: a.id,
    roleTitle: typeof a.role_snapshot?.title === "string" ? a.role_snapshot.title : "A role",
    organizationName: typeof a.role_snapshot?.organizationName === "string" ? a.role_snapshot.organizationName : "An employer",
  }));
  const applicationShareIds = new Set(((appRows ?? []) as AppRow[]).map((a) => a.share_id));
  return {
    shares: affected.filter((s) => !applicationShareIds.has(s.id)).map((s) => ({ id: s.id, label: s.label })),
    applications,
  };
}

export type ShareSummary = {
  id: string;
  label: string;
  fields: ShareField[];
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastAccessedAt: string | null;
  versionPolicy: VersionPolicy;
  repos: string[] | null;
  pinnedProjectIds: string[] | null;
};

type ShareListRow = {
  id: string;
  label: string;
  allowed_fields: ShareField[];
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  last_accessed_at: string | null;
  version_policy: VersionPolicy | null;
  project_repos: string[] | null;
  pinned_project_ids: string[] | null;
};

export async function listShares(ownerId: string): Promise<ShareSummary[]> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return [];
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_shares")
    .select("id,label,allowed_fields,created_at,expires_at,revoked_at,last_accessed_at,version_policy,project_repos,pinned_project_ids")
    .eq("passport_id", passportId)
    .order("created_at", { ascending: false })
    .limit(100);
  return ((data ?? []) as ShareListRow[]).map((s) => ({
    id: s.id,
    label: s.label,
    fields: s.allowed_fields,
    createdAt: s.created_at,
    expiresAt: s.expires_at,
    revokedAt: s.revoked_at,
    lastAccessedAt: s.last_accessed_at,
    versionPolicy: s.version_policy ?? "follow",
    repos: s.project_repos,
    pinnedProjectIds: s.pinned_project_ids,
  }));
}

/**
 * Creates a scoped share link (PASS-06): the candidate names the audience
 * (label), the included fields, and an optional expiry. Employer-private
 * notes and hidden tests are excluded by construction - they live in other
 * tables and projectForShare never copies them.
 */
export async function createShare(
  ownerId: string,
  label: string,
  fields: string[],
  opts: { expiresAt?: unknown; repos?: unknown; versionPolicy?: unknown } = {},
): Promise<{ token: string; id: string } | { error: string }> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return { error: "Add a project to your passport before sharing it." };
  const expiry = validateExpiryInput(opts.expiresAt);
  if (!expiry.ok) return { error: expiry.error };
  const allowed = SHAREABLE_FIELDS.filter((f) => fields.includes(f));
  const versionPolicy: VersionPolicy = opts.versionPolicy === "follow" ? "follow" : "pinned";

  const passport = await loadPassport(passportId);
  const current = currentSnapshots(passport?.projects ?? []);
  const manualKeys = await manualShareKeys(passportId);
  if (current.length === 0 && manualKeys.length === 0) return { error: "Add a project to your passport before sharing it." };
  let repos: string[] | null = null;
  if (Array.isArray(opts.repos)) {
    const known = new Map([...current.map((p) => [p.repoFullName.toLowerCase(), p.repoFullName] as const), ...manualKeys.map((k) => [k.toLowerCase(), k] as const)]);
    repos = [...new Set(opts.repos.filter((r): r is string => typeof r === "string").map((r) => known.get(r.toLowerCase())).filter((r): r is string => !!r))];
    if (repos.length === 0) return { error: "Choose at least one project to include." };
  }
  const included = repos ? current.filter((p) => repos.includes(p.repoFullName)) : current;
  const pinnedProjectIds = versionPolicy === "pinned" ? included.map((p) => p.id).filter((id): id is string => !!id) : null;

  const token = randomBytes(24).toString("base64url");
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("passport_shares")
    .insert({
      passport_id: passportId,
      token_hash: hashToken(token),
      label: label.slice(0, 80),
      allowed_fields: allowed,
      expires_at: expiry.expiresAt || null,
      project_repos: repos,
      pinned_project_ids: pinnedProjectIds,
      version_policy: versionPolicy,
    })
    .select("id")
    .single();
  return error || !data ? { error: "Could not create the share link." } : { token, id: (data as { id: string }).id };
}

/** Passport plus engineer notes, contribution statements and decisions, before share projection. */
async function loadSharablePassport(passportId: string): Promise<PassportData | null> {
  const [passport, contributions, decisions, presentations] = await Promise.all([
    loadPassport(passportId, { withNotes: true }),
    listContributions(passportId),
    listDecisionsForPassport(passportId),
    listPresentationRows(passportId),
  ]);
  if (!passport) return null;
  return {
    ...passport,
    contributions: [...contributions.values()],
    decisions,
    presentations: mergePresentations(currentSnapshots(passport.projects), presentations),
  };
}

async function manualShareKeys(passportId: string): Promise<string[]> {
  return (await listPresentationRows(passportId)).filter((p) => p.sourceKind === "manual" && p.visibility === "shareable").map((p) => p.projectKey);
}

/**
 * Recipient preview: exactly what a link with these settings would show,
 * produced by the same projection the public share route uses.
 */
export async function previewShare(
  ownerId: string,
  fields: string[],
  opts: { repos?: unknown; versionPolicy?: unknown; label?: string } = {},
): Promise<PassportData | null> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return null;
  const passport = await loadSharablePassport(passportId);
  if (!passport) return null;
  const versionPolicy: VersionPolicy = opts.versionPolicy === "follow" ? "follow" : "pinned";
  const current = currentSnapshots(passport.projects);
  const repos = Array.isArray(opts.repos) ? opts.repos.filter((r): r is string => typeof r === "string") : null;
  const included = repos ? current.filter((p) => repos.some((r) => r.toLowerCase() === p.repoFullName.toLowerCase())) : current;
  return projectForShare(passport, SHAREABLE_FIELDS.filter((f) => fields.includes(f)), {
    repos,
    versionPolicy,
    pinnedProjectIds: versionPolicy === "pinned" ? included.map((p) => p.id).filter((id): id is string => !!id) : null,
    label: opts.label ?? "",
  });
}

export async function revokeShare(ownerId: string, shareId: string): Promise<boolean> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return false;
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", shareId)
    .eq("passport_id", passportId)
    .is("revoked_at", null)
    .select("id");
  return (data ?? []).length > 0;
}

type ShareRow = {
  id: string;
  passport_id: string;
  label?: string;
  allowed_fields: ShareField[];
  revoked_at: string | null;
  expires_at: string | null;
  project_repos?: string[] | null;
  pinned_project_ids?: string[] | null;
  version_policy?: VersionPolicy | null;
};

const SHARE_COLUMNS = "id,passport_id,label,allowed_fields,revoked_at,expires_at,project_repos,pinned_project_ids,version_policy";

async function shareByToken(token: string): Promise<ShareRow | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_shares")
    .select(SHARE_COLUMNS)
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  return (data as ShareRow | null) ?? null;
}

/**
 * The only path from a share to passport data. Revocation and expiry are
 * checked on every call, so a revoked link stops resolving immediately for
 * the public page and for every employer review built on it.
 */
async function projectedShare(share: ShareRow): Promise<PassportData | null> {
  if (shareState({ revokedAt: share.revoked_at, expiresAt: share.expires_at }) !== "active") return null;
  const passport = await loadSharablePassport(share.passport_id);
  if (!passport) return null;
  return projectForShare(passport, share.allowed_fields, {
    repos: share.project_repos ?? null,
    pinnedProjectIds: share.pinned_project_ids ?? null,
    versionPolicy: share.version_policy ?? "follow",
    label: share.label ?? "",
  });
}

export async function resolveShare(token: string): Promise<{ status: "ok"; passport: PassportData } | { status: "revoked" | "missing" | "expired" }> {
  const share = await shareByToken(token);
  if (!share) return { status: "missing" };
  const state = shareState({ revokedAt: share.revoked_at, expiresAt: share.expires_at });
  if (state !== "active") return { status: state };
  const passport = await projectedShare(share);
  if (!passport) return { status: "missing" };
  const admin = createAdminSupabaseClient();
  await admin.from("passport_shares").update({ last_accessed_at: new Date().toISOString() }).eq("id", share.id);
  return { status: "ok", passport };
}

/**
 * Owner of a share token, for the public profile view.
 * Returns null when the token is unknown, revoked, or expired.
 */
export async function getShareOwnerId(token: string): Promise<string | null> {
  const share = await shareByToken(token);
  if (!share) return null;
  if (shareState({ revokedAt: share.revoked_at, expiresAt: share.expires_at }) !== "active") return null;
  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("passports").select("owner_id").eq("id", share.passport_id).maybeSingle();
  return (data as { owner_id: string } | null)?.owner_id ?? null;
}

export type ReviewDecision = "none" | "advance" | "hold" | "decline";

export type ReviewSummary = {
  id: string;
  shareId: string;
  candidateName: string;
  roleTitle: string;
  decision: ReviewDecision;
  decidedAt: string | null;
  createdAt: string;
  shareRevoked: boolean;
  projects: number;
  findings: number;
};

export async function addReview(organizationId: string, userId: string, shareInput: string, roleTitle: string) {
  const token = shareInput.trim().split("/p/").pop()?.split(/[?#]/)[0] ?? "";
  const share = await shareByToken(token);
  if (!share || shareState({ revokedAt: share.revoked_at, expiresAt: share.expires_at }) !== "active") {
    return { error: "This Passport link is not valid, has expired, or has been revoked." } as const;
  }
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("employer_passport_reviews")
    .upsert(
      { organization_id: organizationId, share_id: share.id, role_title: roleTitle.slice(0, 120), added_by: userId },
      { onConflict: "organization_id,share_id" },
    )
    .select("id")
    .single();
  if (error || !data) return { error: "Could not add this candidate." } as const;
  return { id: (data as { id: string }).id } as const;
}

type ReviewRow = {
  id: string;
  share_id: string;
  role_title: string;
  decision: ReviewDecision;
  decided_at: string | null;
  private_note: string;
  created_at: string;
  updated_at: string;
  passport_shares: ShareRow | null;
};

export async function listReviews(organizationId: string): Promise<ReviewSummary[]> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("employer_passport_reviews")
    .select(`id,share_id,role_title,decision,decided_at,private_note,created_at,passport_shares(${SHARE_COLUMNS})`)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as ReviewRow[];
  return Promise.all(
    rows.map(async (r) => {
      const passport = r.passport_shares ? await projectedShare(r.passport_shares) : null;
      return {
        id: r.id,
        shareId: r.share_id,
        candidateName: passport?.displayName || passport?.githubLogin || "Shared passport",
        roleTitle: r.role_title,
        decision: r.decision,
        decidedAt: r.decided_at,
        createdAt: r.created_at,
        shareRevoked: !passport,
        projects: passport?.projects.length ?? 0,
        findings: passport?.projects.reduce((n, p) => n + p.evidence.length, 0) ?? 0,
      };
    }),
  );
}

export async function getReview(organizationId: string, reviewId: string) {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("employer_passport_reviews")
    .select(`id,share_id,role_title,decision,decided_at,private_note,created_at,updated_at,passport_shares(${SHARE_COLUMNS})`)
    .eq("organization_id", organizationId)
    .eq("id", reviewId)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as ReviewRow;
  const passport = row.passport_shares ? await projectedShare(row.passport_shares) : null;
  return {
    id: row.id,
    shareId: row.share_id,
    roleTitle: row.role_title,
    decision: row.decision,
    decidedAt: row.decided_at,
    privateNote: row.private_note,
    version: row.updated_at,
    passport,
  };
}

export type ReviewDecisionState = { decision: ReviewDecision; privateNote: string; decidedAt: string | null; version: string };

export type RecordReviewDecisionResult =
  | { kind: "saved"; state: ReviewDecisionState }
  | { kind: "conflict"; state: ReviewDecisionState }
  | { kind: "not_found" };

async function reviewDecisionState(organizationId: string, reviewId: string): Promise<ReviewDecisionState | null> {
  const { data } = await createAdminSupabaseClient()
    .from("employer_passport_reviews")
    .select("decision,private_note,decided_at,updated_at")
    .eq("organization_id", organizationId)
    .eq("id", reviewId)
    .maybeSingle();
  if (!data) return null;
  return { decision: data.decision as ReviewDecision, privateNote: (data.private_note as string) ?? "", decidedAt: (data.decided_at as string | null) ?? null, version: data.updated_at as string };
}

/**
 * Compare-and-set on `updated_at`: a teammate's save in between makes this a
 * conflict carrying their saved state, never a silent overwrite. A null
 * `expectedVersion` (older clients) writes unconditionally.
 */
export async function recordDecision(
  organizationId: string,
  reviewId: string,
  userId: string,
  decision: ReviewDecision,
  note: string,
  expectedVersion: string | null = null,
): Promise<RecordReviewDecisionResult> {
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("employer_passport_reviews")
    .update({
      decision,
      private_note: note.slice(0, 4000),
      decided_by: decision === "none" ? null : userId,
      decided_at: decision === "none" ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("id", reviewId);
  if (expectedVersion) query = query.eq("updated_at", expectedVersion);
  const { data } = await query.select("decision,private_note,decided_at,updated_at");
  const row = (data ?? [])[0];
  if (row) {
    return {
      kind: "saved",
      state: { decision: row.decision as ReviewDecision, privateNote: (row.private_note as string) ?? "", decidedAt: (row.decided_at as string | null) ?? null, version: row.updated_at as string },
    };
  }
  const current = await reviewDecisionState(organizationId, reviewId);
  return current ? { kind: "conflict", state: current } : { kind: "not_found" };
}

/* ------------------------------------------------------------------ */
/* Corrections (PASS-08)                                               */
/* ------------------------------------------------------------------ */

type CorrectionRow = {
  id: string;
  finding_id: string;
  project_id: string | null;
  reason: string;
  status: CorrectionStatus;
  created_at: string;
  resolved_at: string | null;
  resolution_note: string;
  kind: NoteKind | null;
  proposed_interpretation: string | null;
  withdrawn_at: string | null;
};

const CORRECTION_COLUMNS = "id,finding_id,project_id,reason,status,created_at,resolved_at,resolution_note,kind,proposed_interpretation,withdrawn_at";

const toCorrection = (r: CorrectionRow): Correction => ({
  id: r.id,
  findingId: r.finding_id,
  projectId: r.project_id,
  reason: r.reason,
  status: r.status,
  createdAt: r.created_at,
  resolvedAt: r.resolved_at,
  resolutionNote: r.resolution_note,
  kind: r.kind ?? "inaccurate",
  proposedInterpretation: r.proposed_interpretation ?? "",
  withdrawnAt: r.withdrawn_at,
});

const toNote = (c: Correction): EngineerNote => ({
  id: c.id,
  findingId: c.findingId,
  kind: c.kind,
  text: c.reason,
  proposedInterpretation: c.proposedInterpretation,
  status: c.status,
  createdAt: c.createdAt,
  resolvedAt: c.resolvedAt,
  resolutionNote: c.resolutionNote,
});

async function loadNotes(passportId: string): Promise<EngineerNote[]> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_corrections")
    .select(CORRECTION_COLUMNS)
    .eq("passport_id", passportId)
    .is("withdrawn_at", null)
    .order("created_at", { ascending: true })
    .limit(500);
  return ((data ?? []) as CorrectionRow[]).map(toCorrection).map(toNote);
}

/**
 * Attaches an engineer statement to a finding: context, a dispute, or a
 * proposed correction. The finding row is never mutated, so the original
 * automated observation and anything an employer already reviewed stay
 * intact; the statement is a separate, attributed, timestamped record.
 */
export async function flagFinding(
  ownerId: string,
  repoFullName: string,
  findingId: string,
  reason: string,
  opts: { kind?: unknown; proposedInterpretation?: unknown; projectId?: unknown } = {},
): Promise<{ correction: Correction } | { error: string }> {
  const kind: NoteKind = opts.kind === "context" || opts.kind === "correction" ? opts.kind : "inaccurate";
  const checked = validateCorrectionReason(reason, kind);
  if (!checked.ok) return { error: checked.error };
  const proposed = typeof opts.proposedInterpretation === "string" ? opts.proposedInterpretation.trim() : "";
  if (kind === "correction" && !proposed) return { error: "Describe how the finding should read instead." };
  if (proposed.length > 1000) return { error: "Keep the proposed wording under 1000 characters." };
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return { error: "Add a project before annotating findings." };
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("passport_projects")
    .select("id, passport_evidence!inner(id)")
    .eq("passport_id", passportId)
    .eq("repo_full_name", repoFullName)
    .eq("passport_evidence.id", findingId)
    .order("analyzed_at", { ascending: false })
    .limit(1);
  if (typeof opts.projectId === "string" && /^[0-9a-f-]{36}$/.test(opts.projectId)) query = query.eq("id", opts.projectId);
  const { data: rows } = await query;
  const project = (rows ?? [])[0] as { id: string } | undefined;
  if (!project) return { error: "That finding is not in your Passport." };
  const { data, error } = await admin
    .from("passport_corrections")
    .insert({
      passport_id: passportId,
      project_id: project.id,
      finding_id: findingId,
      reason: checked.reason,
      kind,
      proposed_interpretation: kind === "correction" ? proposed : "",
      author_id: ownerId,
    })
    .select(CORRECTION_COLUMNS)
    .single();
  if (error || !data) return { error: "Could not save your note. Try again." };
  return { correction: toCorrection(data as CorrectionRow) };
}

export async function listCorrections(ownerId: string): Promise<Correction[]> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return [];
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_corrections")
    .select(CORRECTION_COLUMNS)
    .eq("passport_id", passportId)
    .order("created_at", { ascending: false })
    .limit(500);
  return ((data ?? []) as CorrectionRow[]).map(toCorrection);
}

/** Resolves a correction with a note. History is appended, never rewritten. */
export async function resolveCorrection(ownerId: string, correctionId: string, note: string): Promise<boolean> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return false;
  if (!/^[0-9a-f-]{36}$/.test(correctionId)) return false;
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_corrections")
    .update({ status: "resolved", resolution_note: note.slice(0, 1000), resolved_at: new Date().toISOString() })
    .eq("id", correctionId)
    .eq("passport_id", passportId)
    .eq("status", "open")
    .select("id");
  return (data ?? []).length > 0;
}

/**
 * Withdraws a note from shared views. The row stays (with its timestamp) so
 * the history of what was said remains auditable.
 */
export async function withdrawCorrection(ownerId: string, correctionId: string): Promise<boolean> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId || !/^[0-9a-f-]{36}$/.test(correctionId)) return false;
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_corrections")
    .update({ withdrawn_at: new Date().toISOString() })
    .eq("id", correctionId)
    .eq("passport_id", passportId)
    .is("withdrawn_at", null)
    .select("id");
  return (data ?? []).length > 0;
}

/* ------------------------------------------------------------------ */
/* GitHub disconnect (GH-11)                                           */
/* ------------------------------------------------------------------ */

/**
 * Disconnects GitHub from the passport. Passport imports use the public API
 * (no stored OAuth credential), so disconnecting removes the linked login
 * and stops future imports from associating with it. Already-imported
 * projects are kept until removed individually.
 */
export async function disconnectGithub(ownerId: string): Promise<{ disconnected: boolean; explanation: string }> {
  const passportId = await passportIdFor(ownerId);
  await syncGithubAccount(ownerId, null);
  if (!passportId) return { disconnected: false, explanation: githubDisconnectExplanation() };
  const admin = createAdminSupabaseClient();
  await admin.from("passports").update({ github_login: null }).eq("id", passportId);
  return { disconnected: true, explanation: githubDisconnectExplanation() };
}

export const GITHUB_LOGIN_PATTERN = /^[A-Za-z0-9-]{1,39}$/;

/**
 * Sets the GitHub username shown on the profile. It only labels the profile
 * and links to github.com/<login>; Fydell does not verify the account is the
 * engineer's. Creates the passport row if the engineer has none yet.
 */
export async function setGithubLogin(ownerId: string, email: string, login: string): Promise<{ ok: true; githubLogin: string } | { ok: false; error: string }> {
  const clean = login.trim().replace(/^@/, "");
  if (!GITHUB_LOGIN_PATTERN.test(clean) || clean.startsWith("-") || clean.endsWith("-")) {
    return { ok: false, error: "Use a GitHub username: up to 39 letters, numbers or single hyphens, not starting or ending with a hyphen." };
  }
  const admin = createAdminSupabaseClient();
  const passportId = await passportIdFor(ownerId);
  if (passportId) {
    const { error } = await admin.from("passports").update({ github_login: clean }).eq("id", passportId);
    if (error) return { ok: false, error: "Could not save the username. Try again." };
  } else {
    const { error } = await admin.from("passports").insert({ owner_id: ownerId, display_name: await accountDisplayName(ownerId, email), github_login: clean });
    if (error && error.code !== "23505") return { ok: false, error: "Could not save the username. Try again." };
    if (error) await admin.from("passports").update({ github_login: clean }).eq("owner_id", ownerId);
  }
  await syncGithubAccount(ownerId, clean);
  return { ok: true, githubLogin: clean };
}

/** Keeps exactly one GitHub connected-account row, matching the passport's login. */
async function syncGithubAccount(ownerId: string, login: string | null): Promise<void> {
  const admin = createAdminSupabaseClient();
  await admin.from("profile_connected_accounts").delete().eq("owner_id", ownerId).eq("provider", "github");
  if (!login) return;
  await admin.from("profile_connected_accounts").insert({
    owner_id: ownerId,
    provider: "github",
    label: login,
    status: "connected",
    last_synced_at: new Date().toISOString(),
    meta: { login, verified: false },
  });
}

async function profileDisplayName(ownerId: string): Promise<string> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("engineer_profiles").select("display_name").eq("owner_id", ownerId).maybeSingle();
  return ((data as { display_name: string | null } | null)?.display_name ?? "").trim();
}
