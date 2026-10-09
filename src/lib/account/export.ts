import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export const ACCOUNT_EXPORT_VERSION = "account-export-v1";
const ROW_CAP = 5000;

/**
 * Everything Fydell holds about the signed-in account, as one JSON document.
 *
 * Columns are listed explicitly per table so nothing secret or about other
 * people is exported by accident: no token or key hashes, no share tokens, no
 * employer-internal pipeline fields (stage, assigned reviewer, review notes,
 * decisions, employer report drafts), no protected tests.
 */
type Source = { key: string; table: string; columns: string; by: string };

const BY_USER: Source[] = [
  { key: "engineerProfile", table: "engineer_profiles", by: "owner_id", columns: "id, display_name, handle, headline, role, bio, location, website, links, open_to, linkedin_url, x_url, instagram_url, how_i_build, how_i_build_shared, how_i_build_updated_at, created_at, updated_at" },
  { key: "connectedAccounts", table: "profile_connected_accounts", by: "owner_id", columns: "id, provider, label, status, connected_at, last_synced_at" },
  { key: "workReceipts", table: "engineer_work_receipts", by: "owner_id", columns: "id, artifact_type, project_key, source_revision, content_hash, verification_scope, accepted_at" },
  { key: "workSamples", table: "passport_work_samples", by: "owner_id", columns: "id, attempt_id, report_id, summary, included_at, removed_at" },
  { key: "organizationMemberships", table: "organization_members", by: "user_id", columns: "organization_id, role, status, invited_at, joined_at, last_accessed_at" },
  { key: "applications", table: "role_applications", by: "applicant_user_id", columns: "id, organization_id, role_id, contact_name, contact_email, links, note, role_snapshot, status, submitted_at, withdrawn_at, updated_at" },
  { key: "assessmentAttempts", table: "eng_attempts", by: "candidate_user_id", columns: "id, organization_id, role_id, status, allowed_minutes, extension_minutes, consented_at, preflight_passed_at, started_at, due_at, submitted_at, created_at" },
  { key: "reportResponses", table: "eng_report_responses", by: "candidate_user_id", columns: "id, attempt_id, report_version, target_kind, kind, body, status, resolution, created_at, resolved_at" },
  { key: "simulationSessions", table: "sim_sessions", by: "candidate_user_id", columns: "id, organization_id, status, duration_minutes, started_at, ends_at, submitted_at, external_ai_disclosed, created_at" },
  { key: "consents", table: "candidate_consents", by: "candidate_user_id", columns: "id, organization_id, policy_version, capture_policy_version, ai_policy_version, accepted_at" },
  { key: "notifications", table: "user_notifications", by: "user_id", columns: "id, kind, title, body, href, read_at, created_at" },
  { key: "verifiedInboxes", table: "email_inbox_verifications", by: "user_id", columns: "email, method, verified_at" },
  { key: "platformRoles", table: "platform_user_roles", by: "user_id", columns: "role, is_active, granted_at, revoked_at" },
];

const BY_PASSPORT: Source[] = [
  { key: "projects", table: "passport_projects", by: "passport_id", columns: "id, repo_full_name, html_url, commit_sha, primary_language, is_fork, contribution_statement, attribution, status, coverage, notices, analyzed_at, imported_at, source_kind" },
  { key: "manualProjects", table: "passport_manual_projects", by: "passport_id", columns: "id, title, description, contribution_statement, tech_stack, links, status, claim_category, method, checked_at, limitations, review_state, created_at, updated_at" },
  { key: "projectPresentations", table: "passport_project_presentations", by: "passport_id", columns: "id, project_key, title, summary, purpose, intended_users, contribution, team_context, project_state, outcomes, technologies, links, started_on, ended_on, featured, visibility, created_at, updated_at" },
  { key: "contributions", table: "passport_contributions", by: "passport_id", columns: "id, repo_full_name, problem, worked_on, inherited, collaboration, collaboration_note, constraints_faced, checked_how, results, improvements, evidence_refs, created_at, updated_at" },
  { key: "decisions", table: "passport_decisions", by: "passport_id", columns: "id, repo_full_name, title, problem, constraints_faced, alternatives, choice, tradeoffs, outcome, evidence_refs, withdrawn_at, created_at, updated_at" },
  { key: "corrections", table: "passport_corrections", by: "passport_id", columns: "id, project_id, finding_id, kind, reason, proposed_interpretation, status, resolution_note, created_at, resolved_at, withdrawn_at" },
  { key: "shareLinks", table: "passport_shares", by: "passport_id", columns: "id, label, allowed_fields, project_repos, created_at, expires_at, revoked_at, last_accessed_at" },
];

const BY_ATTEMPT: Source[] = [
  { key: "submissions", table: "eng_submissions", by: "attempt_id", columns: "id, attempt_id, archive_sha256, archive_bytes, handoff, ai_disclosure, late, submitted_at" },
  { key: "drafts", table: "eng_drafts", by: "attempt_id", columns: "attempt_id, field, body, updated_at" },
  { key: "messages", table: "eng_messages", by: "attempt_id", columns: "id, attempt_id, seq, sender, body, created_at" },
];

type Rows = Record<string, unknown>[];

async function rows(db: SupabaseClient, source: Source, ids: string[]): Promise<{ rows: Rows; truncated: boolean }> {
  if (ids.length === 0) return { rows: [], truncated: false };
  const { data, error } = await db.from(source.table).select(source.columns).in(source.by, ids).limit(ROW_CAP + 1);
  if (error) throw new Error(`Could not read ${source.key}: ${error.message}`);
  const list = (data ?? []) as unknown as Rows;
  return { rows: list.slice(0, ROW_CAP), truncated: list.length > ROW_CAP };
}

export async function buildAccountExport(db: SupabaseClient, user: User): Promise<Record<string, unknown>> {
  const truncated: string[] = [];
  const collect = async (sources: Source[], ids: string[]) => {
    const out: Record<string, Rows> = {};
    for (const source of sources) {
      const result = await rows(db, source, ids);
      out[source.key] = result.rows;
      if (result.truncated) truncated.push(source.key);
    }
    return out;
  };

  const { data: profile } = await db
    .from("profiles")
    .select("email, full_name, display_name, role, account_type, company_name, account_status, created_at, updated_at, onboarding_completed_at, email_verified_at")
    .eq("id", user.id)
    .maybeSingle();
  const byUser = await collect(BY_USER, [user.id]);

  const { data: passports } = await db.from("passports").select("id, display_name, headline, github_login, capability_summary, role_suggestions, created_at, updated_at").eq("owner_id", user.id);
  const passportRows = (passports ?? []) as Rows;
  const passportIds = passportRows.map((p) => String(p.id));
  const byPassport = await collect(BY_PASSPORT, passportIds);

  const attemptIds = byUser.assessmentAttempts.map((a) => String(a.id));
  const byAttempt = await collect(BY_ATTEMPT, attemptIds);

  const memberOrgIds = byUser.organizationMemberships.map((m) => String(m.organization_id));
  const { data: orgs } = memberOrgIds.length ? await db.from("organizations").select("id, name").in("id", memberOrgIds) : { data: [] };

  return {
    format: ACCOUNT_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email ?? null,
      emailConfirmedAt: user.email_confirmed_at ?? null,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
      signInMethods: (user.identities ?? []).map((i) => i.provider),
    },
    profile: profile ?? null,
    organizations: (orgs ?? []) as Rows,
    ...byUser,
    passports: passportRows,
    ...byPassport,
    ...byAttempt,
    notes: [
      "Employer review notes, decisions and employer report drafts belong to the employer and are not included. Released reports are visible in the app.",
      "Submission archives are identified by checksum and size. Ask us if you need a copy of an archive.",
      ...(truncated.length ? [`These sections were cut at ${ROW_CAP} rows: ${truncated.join(", ")}. Ask us for the full set.`] : []),
    ],
  };
}
