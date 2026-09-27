import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { assemblePassport } from "./assemble";
import { ANALYSIS_VERSION, type ExtractionResult } from "./github/types";
import {
  SHAREABLE_FIELDS,
  projectForShare,
  type CapabilitySummary,
  type PassportData,
  type PassportEvidence,
  type PassportProject,
  type ShareField,
} from "./view";
import type { RoleSuggestion } from "./github/types";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

type PassportRow = {
  id: string;
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
  coverage: PassportProject["coverage"];
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
  return {
    displayName: row.display_name,
    headline: row.headline,
    githubLogin: row.github_login,
    updatedAt: row.updated_at,
    roleSuggestions: row.role_suggestions ?? [],
    capabilities: summary && "source" in summary ? summary : { source: "rules", capabilities: [], notShown: [] },
    projects: projectRows.map((p) => ({
      repoFullName: p.repo_full_name,
      htmlUrl: p.html_url,
      commitSha: p.commit_sha,
      primaryLanguage: p.primary_language,
      isFork: p.is_fork,
      contributionStatement: p.contribution_statement,
      status: p.status,
      coverage: p.coverage,
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
    })),
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

  await admin.from("passport_projects").delete().eq("passport_id", passportId).eq("repo_id", result.repository.id).neq("id", projectId);
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

export type ShareSummary = { id: string; label: string; fields: ShareField[]; createdAt: string; revokedAt: string | null; lastAccessedAt: string | null };

export async function listShares(ownerId: string): Promise<ShareSummary[]> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return [];
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_shares")
    .select("id,label,allowed_fields,created_at,revoked_at,last_accessed_at")
    .eq("passport_id", passportId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as Array<{ id: string; label: string; allowed_fields: ShareField[]; created_at: string; revoked_at: string | null; last_accessed_at: string | null }>).map((s) => ({
    id: s.id,
    label: s.label,
    fields: s.allowed_fields,
    createdAt: s.created_at,
    revokedAt: s.revoked_at,
    lastAccessedAt: s.last_accessed_at,
  }));
}

export async function createShare(ownerId: string, label: string, fields: string[]): Promise<{ token: string } | null> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return null;
  const allowed = SHAREABLE_FIELDS.filter((f) => fields.includes(f));
  const token = randomBytes(24).toString("base64url");
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("passport_shares")
    .insert({ passport_id: passportId, token_hash: hashToken(token), label: label.slice(0, 80), allowed_fields: allowed });
  return error ? null : { token };
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

type ShareRow = { id: string; passport_id: string; allowed_fields: ShareField[]; revoked_at: string | null };

async function shareByToken(token: string): Promise<ShareRow | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_shares")
    .select("id,passport_id,allowed_fields,revoked_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  return (data as ShareRow | null) ?? null;
}

async function projectedShare(share: ShareRow): Promise<PassportData | null> {
  if (share.revoked_at) return null;
  const passport = await loadPassport(share.passport_id);
  return passport ? projectForShare(passport, share.allowed_fields) : null;
}

export async function resolveShare(token: string): Promise<{ status: "ok"; passport: PassportData } | { status: "revoked" | "missing" }> {
  const share = await shareByToken(token);
  if (!share) return { status: "missing" };
  if (share.revoked_at) return { status: "revoked" };
  const passport = await projectedShare(share);
  if (!passport) return { status: "missing" };
  const admin = createAdminSupabaseClient();
  await admin.from("passport_shares").update({ last_accessed_at: new Date().toISOString() }).eq("id", share.id);
  return { status: "ok", passport };
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
    .select("id,share_id,role_title,decision,decided_at,private_note,created_at,passport_shares(id,passport_id,allowed_fields,revoked_at)")
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
    .select("id,share_id,role_title,decision,decided_at,private_note,created_at,passport_shares(id,passport_id,allowed_fields,revoked_at)")
    .eq("organization_id", organizationId)
    .eq("id", reviewId)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as ReviewRow;
  const passport = row.passport_shares ? await projectedShare(row.passport_shares) : null;
  return {
    id: row.id,
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
