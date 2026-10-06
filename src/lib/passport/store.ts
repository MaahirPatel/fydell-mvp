import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { assemblePassport } from "./assemble";
import { validateCorrectionReason, type Correction, type CorrectionStatus } from "./corrections";
import { ANALYSIS_VERSION, type ExtractionResult } from "./github/types";
import { githubDisconnectExplanation } from "./removal";
import { shareState, validateExpiryInput } from "./sharing";
import { markSuperseded } from "./snapshots";
import {
  SHAREABLE_FIELDS,
  projectForShare,
  type CapabilitySummary,
  type ManualProject,
  type PassportData,
  type PassportEvidence,
  type PassportProject,
  type ShareField,
} from "./view";
import type { RoleSuggestion } from "./github/types";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

function skipReasonCounts(skipped: Array<{ reason: string }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of skipped) counts[s.reason] = (counts[s.reason] ?? 0) + 1;
  return counts;
}

type PassportRow = {
  id: string;
  display_name: string;
  headline: string;
  github_login: string | null;
  capability_summary: CapabilitySummary | Record<string, never>;
  role_suggestions: RoleSuggestion[];
  updated_at: string;
};

type ProjectRow = {  id: string;
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

type ManualProjectRow = {
  id: string;
  title: string;
  description: string;
  contribution_statement: string;
  tech_stack: string[] | null;
  links: Array<{ label?: string; url?: string }> | null;
  checked_at: string | null;
  limitations: string | null;
  review_state: string | null;
  freshness_status: string | null;
  version: number | null;
  created_at: string;
  updated_at: string;
};

async function loadPassport(passportId: string): Promise<PassportData | null> {
  const admin = createAdminSupabaseClient();
  const { data: passport } = await admin.from("passports").select("*").eq("id", passportId).maybeSingle();
  if (!passport) return null;
  const row = passport as PassportRow;
  const { data: projects } = await admin
    .from("passport_projects")
    .select("*, passport_evidence(*)")
    .eq("passport_id", passportId)
    .order("analyzed_at", { ascending: false });
  const projectRows = (projects ?? []) as ProjectRow[];
  const summary = row.capability_summary as CapabilitySummary;
  const { data: manualRows } = await admin
    .from("passport_manual_projects")
    .select("*")
    .eq("passport_id", passportId)
    .eq("status", "published")
    .order("created_at", { ascending: false });
  const manualProjects: ManualProject[] = ((manualRows ?? []) as ManualProjectRow[]).map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    contributionStatement: m.contribution_statement,
    techStack: m.tech_stack ?? [],
    links: (Array.isArray(m.links) ? m.links : [])
      .filter((l): l is { label: string; url: string } => typeof l?.url === "string" && !!l.url)
      .map((l) => ({ label: typeof l.label === "string" && l.label ? l.label : l.url, url: l.url })),
    evidenceBasis: "self_reported" as const,
    claimCategory: "candidate_stated" as const,
    method: "self_report" as const,
    checkedAt: m.checked_at ?? m.updated_at,
    limitations: m.limitations ?? "Self-reported. Not verified against source code, employer records, or independent observation.",
    reviewState: (m.review_state as ManualProject["reviewState"]) ?? "published",
    freshnessStatus: (m.freshness_status as ManualProject["freshnessStatus"]) ?? "current",
    version: m.version ?? 1,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  }));
  const projectList: PassportProject[] = projectRows.map((p) => ({
    repoFullName: p.repo_full_name,
    htmlUrl: p.html_url,
    commitSha: p.commit_sha,
    primaryLanguage: p.primary_language,
    isFork: p.is_fork,
    contributionStatement: p.contribution_statement,
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
    displayName: row.display_name,
    headline: row.headline,
    githubLogin: row.github_login,
    updatedAt: row.updated_at,
    roleSuggestions: row.role_suggestions ?? [],
    capabilities: summary && "source" in summary ? summary : { source: "rules", capabilities: [], notShown: [] },
    // Older snapshots of a reimported repository are marked stale so they
    // keep provenance without feeding new summaries or shares (GH-10).
    projects: markSuperseded(projectList),
    manualProjects,
  };
}

async function passportIdFor(ownerId: string): Promise<string | null> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("passports").select("id").eq("owner_id", ownerId).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export async function getOwnerPassport(ownerId: string): Promise<PassportData | null> {
  const id = await passportIdFor(ownerId);
  return id ? loadPassport(id) : null;
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

export async function saveProject(
  owner: { id: string; displayName: string },
  githubLogin: string | null,
  result: ExtractionResult,
  contributionStatement: string,
): Promise<PassportData> {
  if (!result.repository || !result.commitSha || result.status === "failed") throw new Error("Cannot save a failed analysis.");
  const admin = createAdminSupabaseClient();

  let passportId = await passportIdFor(owner.id);
  if (!passportId) {
    const { data, error } = await admin
      .from("passports")
      .insert({ owner_id: owner.id, display_name: owner.displayName, github_login: githubLogin })
      .select("id")
      .single();
    if (error || !data) throw new Error("Could not create the passport.");
    passportId = (data as { id: string }).id;
  } else if (githubLogin) {
    await admin.from("passports").update({ github_login: githubLogin }).eq("id", passportId);
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
  await admin.from("passport_projects").delete().eq("passport_id", passportId).eq("repo_full_name", repoFullName);
  return refreshSummary(passportId);
}

export type ManualProjectInput = {
  title: string;
  description: string;
  contributionStatement: string;
  techStack?: string[];
  links?: { label: string; url: string }[];
};

function validateManualProject(input: ManualProjectInput): string | null {
  if (!input.title.trim() || input.title.length > 120) return "Give the project a title (1-120 characters).";
  if (!input.description.trim() || input.description.length > 2000) return "Describe the project (1-2000 characters).";
  if (!input.contributionStatement.trim() || input.contributionStatement.length > 1000)
    return "Say what you personally built (1-1000 characters).";
  if (input.techStack && input.techStack.length > 20) return "List at most 20 technologies.";
  if (input.links) {
    if (input.links.length > 10) return "Add at most 10 links.";
    for (const l of input.links) {
      if (!/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(l.url)) return `Link "${l.label || l.url}" is not a valid http(s) URL.`;
      if ((l.label || "").length > 60) return "Link labels must be under 60 characters.";
    }
  }
  return null;
}

async function ensurePassportFor(owner: { id: string; displayName: string }): Promise<string> {
  const admin = createAdminSupabaseClient();
  let passportId = await passportIdFor(owner.id);
  if (!passportId) {
    const { data, error } = await admin
      .from("passports")
      .insert({ owner_id: owner.id, display_name: owner.displayName })
      .select("id")
      .single();
    if (error || !data) throw new Error("Could not create the passport.");
    passportId = (data as { id: string }).id;
  }
  return passportId;
}

/**
 * Save a self-reported project. No code analysis runs — the project is
 * labeled "self-reported" everywhere it appears. Returns the refreshed
 * passport.
 */
export async function saveManualProject(
  owner: { id: string; displayName: string },
  input: ManualProjectInput,
): Promise<PassportData> {
  const problem = validateManualProject(input);
  if (problem) throw new Error(problem);
  const passportId = await ensurePassportFor(owner);
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("passport_manual_projects").insert({
    passport_id: passportId,
    title: input.title.trim(),
    description: input.description.trim(),
    contribution_statement: input.contributionStatement.trim(),
    tech_stack: (input.techStack ?? []).map((t) => t.trim()).filter(Boolean).slice(0, 20),
    links: (input.links ?? []).map((l) => ({ label: l.label.trim() || l.url, url: l.url.trim() })).slice(0, 10),
  });
  if (error) throw new Error("Could not save the project.");
  const refreshed = await loadPassport(passportId);
  if (!refreshed) throw new Error("Could not load the saved passport.");
  return refreshed;
}

export async function updateManualProject(
  ownerId: string,
  projectId: string,
  input: ManualProjectInput,
): Promise<PassportData> {
  const problem = validateManualProject(input);
  if (problem) throw new Error(problem);
  const passportId = await passportIdFor(ownerId);
  if (!passportId) throw new Error("No passport yet.");
  const admin = createAdminSupabaseClient();
  const { error, count } = await admin
    .from("passport_manual_projects")
    .update(
      {
        title: input.title.trim(),
        description: input.description.trim(),
        contribution_statement: input.contributionStatement.trim(),
        tech_stack: (input.techStack ?? []).map((t) => t.trim()).filter(Boolean).slice(0, 20),
        links: (input.links ?? []).map((l) => ({ label: l.label.trim() || l.url, url: l.url.trim() })).slice(0, 10),
        updated_at: new Date().toISOString(),
        checked_at: new Date().toISOString(),
        freshness_status: "current",
      },
      { count: "exact" },
    )
    .eq("id", projectId)
    .eq("passport_id", passportId);
  if (error || !count) throw new Error("Project not found.");
  // Corrections create a new version, not a silent rewrite (§10 claim metadata).
  await admin.rpc("bump_manual_project_version", { project_id: projectId });
  const refreshed = await loadPassport(passportId);
  if (!refreshed) throw new Error("Could not load the saved passport.");
  return refreshed;
}

export async function removeManualProject(ownerId: string, projectId: string): Promise<PassportData | null> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return null;
  const admin = createAdminSupabaseClient();
  await admin.from("passport_manual_projects").delete().eq("id", projectId).eq("passport_id", passportId);
  return loadPassport(passportId);
}

export type ShareSummary = { id: string; label: string; fields: ShareField[]; createdAt: string; expiresAt: string | null; revokedAt: string | null; lastAccessedAt: string | null };

export async function listShares(ownerId: string): Promise<ShareSummary[]> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return [];
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_shares")
    .select("id,label,allowed_fields,created_at,expires_at,revoked_at,last_accessed_at")
    .eq("passport_id", passportId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as Array<{ id: string; label: string; allowed_fields: ShareField[]; created_at: string; expires_at: string | null; revoked_at: string | null; last_accessed_at: string | null }>).map((s) => ({
    id: s.id,
    label: s.label,
    fields: s.allowed_fields,
    createdAt: s.created_at,
    expiresAt: s.expires_at,
    revokedAt: s.revoked_at,
    lastAccessedAt: s.last_accessed_at,
  }));
}

/**
 * Creates a scoped share link (PASS-06): the candidate names the audience
 * (label), the included fields, and an optional expiry. Employer-private
 * notes and hidden tests are excluded by construction — they live in other
 * tables and projectForShare never copies them.
 */
export async function createShare(
  ownerId: string,
  label: string,
  fields: string[],
  opts: { expiresAt?: unknown } = {},
): Promise<{ token: string } | { error: string }> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return { error: "Add a project to your passport before sharing it." };
  const expiry = validateExpiryInput(opts.expiresAt);
  if (!expiry.ok) return { error: expiry.error };
  const allowed = SHAREABLE_FIELDS.filter((f) => fields.includes(f));
  const token = randomBytes(24).toString("base64url");
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("passport_shares")
    .insert({
      passport_id: passportId,
      token_hash: hashToken(token),
      label: label.slice(0, 80),
      allowed_fields: allowed,
      expires_at: expiry.expiresAt || null,
    });
  return error ? { error: "Could not create the share link." } : { token };
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

type ShareRow = { id: string; passport_id: string; allowed_fields: ShareField[]; revoked_at: string | null; expires_at: string | null };

async function shareByToken(token: string): Promise<ShareRow | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_shares")
    .select("id,passport_id,allowed_fields,revoked_at,expires_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  return (data as ShareRow | null) ?? null;
}

async function projectedShare(share: ShareRow): Promise<PassportData | null> {
  if (shareState({ revokedAt: share.revoked_at, expiresAt: share.expires_at }) !== "active") return null;
  const passport = await loadPassport(share.passport_id);
  return passport ? projectForShare(passport, share.allowed_fields) : null;
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
  if (!share || share.revoked_at) return { error: "This passport link is not valid or has been revoked." } as const;
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
  passport_shares: ShareRow | null;
};

export async function listReviews(organizationId: string): Promise<ReviewSummary[]> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("employer_passport_reviews")
    .select("id,share_id,role_title,decision,decided_at,private_note,created_at,passport_shares(id,passport_id,allowed_fields,revoked_at,expires_at)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as ReviewRow[];
  return Promise.all(
    rows.map(async (r) => {
      const passport = r.passport_shares ? await projectedShare(r.passport_shares) : null;
      return {
        id: r.id,
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
    .select("id,share_id,role_title,decision,decided_at,private_note,created_at,passport_shares(id,passport_id,allowed_fields,revoked_at,expires_at)")
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
    passport,
  };
}

export async function recordDecision(organizationId: string, reviewId: string, userId: string, decision: ReviewDecision, note: string) {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("employer_passport_reviews")
    .update({
      decision,
      private_note: note.slice(0, 4000),
      decided_by: decision === "none" ? null : userId,
      decided_at: decision === "none" ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("id", reviewId)
    .select("id");
  return (data ?? []).length > 0;
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
};

const toCorrection = (r: CorrectionRow): Correction => ({
  id: r.id,
  findingId: r.finding_id,
  projectId: r.project_id,
  reason: r.reason,
  status: r.status,
  createdAt: r.created_at,
  resolvedAt: r.resolved_at,
  resolutionNote: r.resolution_note,
});

/**
 * Flags a finding as inaccurate. The finding row is never mutated — the
 * correction is a separate record — so employer audit history is preserved
 * (PASS-08).
 */
export async function flagFinding(
  ownerId: string,
  repoFullName: string,
  findingId: string,
  reason: string,
): Promise<{ correction: Correction } | { error: string }> {
  const checked = validateCorrectionReason(reason);
  if (!checked.ok) return { error: checked.error };
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return { error: "No passport to correct yet." };
  const admin = createAdminSupabaseClient();
  const { data: project } = await admin
    .from("passport_projects")
    .select("id")
    .eq("passport_id", passportId)
    .eq("repo_full_name", repoFullName)
    .order("analyzed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!project) return { error: "Unknown project." };
  const projectId = (project as { id: string }).id;
  const { data: evidence } = await admin
    .from("passport_evidence")
    .select("id")
    .eq("project_id", projectId)
    .eq("id", findingId)
    .maybeSingle();
  if (!evidence) return { error: "Unknown finding." };
  const { data, error } = await admin
    .from("passport_corrections")
    .insert({ passport_id: passportId, project_id: projectId, finding_id: findingId, reason: checked.reason })
    .select("id,finding_id,project_id,reason,status,created_at,resolved_at,resolution_note")
    .single();
  if (error || !data) return { error: "Could not file the correction." };
  return { correction: toCorrection(data as CorrectionRow) };
}

export async function listCorrections(ownerId: string): Promise<Correction[]> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return [];
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_corrections")
    .select("id,finding_id,project_id,reason,status,created_at,resolved_at,resolution_note")
    .eq("passport_id", passportId)
    .order("created_at", { ascending: false });
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
  if (!passportId) return { disconnected: false, explanation: githubDisconnectExplanation() };
  const admin = createAdminSupabaseClient();
  await admin.from("passports").update({ github_login: null }).eq("id", passportId);
  return { disconnected: true, explanation: githubDisconnectExplanation() };
}
