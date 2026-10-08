import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  emptyContribution,
  type Collaboration,
  type ContributionContext,
  type ContributionInput,
  type DecisionInput,
  type DecisionRecord,
  type EvidenceRef,
} from "./context-contract";

type ContributionRow = {
  repo_full_name: string;
  problem: string | null;
  worked_on: string;
  inherited: string;
  collaboration: Collaboration;
  collaboration_note: string;
  constraints_faced: string;
  checked_how: string | null;
  results: string;
  improvements: string;
  evidence_refs: EvidenceRef[] | null;
  version: number;
  updated_at: string;
};

type DecisionRow = {
  id: string;
  repo_full_name: string;
  title: string;
  problem: string;
  constraints_faced: string;
  alternatives: string;
  choice: string;
  tradeoffs: string;
  outcome: string;
  evidence_refs: EvidenceRef[] | null;
  version: number;
  withdrawn_at: string | null;
  created_at: string;
  updated_at: string;
};

const CONTRIBUTION_COLUMNS =
  "repo_full_name,problem,worked_on,inherited,collaboration,collaboration_note,constraints_faced,checked_how,results,improvements,evidence_refs,version,updated_at";
const DECISION_COLUMNS =
  "id,repo_full_name,title,problem,constraints_faced,alternatives,choice,tradeoffs,outcome,evidence_refs,version,withdrawn_at,created_at,updated_at";

function toContribution(r: ContributionRow): ContributionContext {
  return {
    repoFullName: r.repo_full_name,
    problem: r.problem ?? "",
    workedOn: r.worked_on,
    inherited: r.inherited,
    collaboration: r.collaboration,
    collaborationNote: r.collaboration_note,
    constraintsFaced: r.constraints_faced,
    checkedHow: r.checked_how ?? "",
    results: r.results,
    improvements: r.improvements,
    evidenceRefs: r.evidence_refs ?? [],
    version: r.version,
    updatedAt: r.updated_at,
  };
}

function toDecision(r: DecisionRow): DecisionRecord {
  return {
    id: r.id,
    repoFullName: r.repo_full_name,
    title: r.title,
    problem: r.problem,
    constraintsFaced: r.constraints_faced,
    alternatives: r.alternatives,
    choice: r.choice,
    tradeoffs: r.tradeoffs,
    outcome: r.outcome,
    evidenceRefs: r.evidence_refs ?? [],
    version: r.version,
    withdrawnAt: r.withdrawn_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function passportIdFor(ownerId: string): Promise<string | null> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("passports").select("id").eq("owner_id", ownerId).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

/** Resolves a snapshot id to its repository, only within the caller's own work record. */
export async function repoForProject(ownerId: string, projectId: string): Promise<string | null> {
  if (!/^[0-9a-f-]{36}$/.test(projectId)) return null;
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return null;
  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("passport_projects").select("repo_full_name").eq("id", projectId).eq("passport_id", passportId).maybeSingle();
  return (data as { repo_full_name: string } | null)?.repo_full_name ?? null;
}

/** The repository must already be in this engineer's work record. */
async function repoInRecord(passportId: string, repoFullName: string): Promise<boolean> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("passport_projects").select("id").eq("passport_id", passportId).eq("repo_full_name", repoFullName).limit(1);
  return (data ?? []).length > 0;
}

/**
 * Every reference must point into a snapshot of the same repository in the
 * same work record, and a cited finding must belong to that snapshot. This
 * blocks links to someone else's evidence or to another project.
 */
async function refsBelong(passportId: string, repoFullName: string, refs: EvidenceRef[]): Promise<boolean> {
  if (refs.length === 0) return true;
  const admin = createAdminSupabaseClient();
  const projectIds = [...new Set(refs.map((r) => r.projectId))];
  const { data: projects } = await admin
    .from("passport_projects")
    .select("id")
    .eq("passport_id", passportId)
    .eq("repo_full_name", repoFullName)
    .in("id", projectIds);
  if ((projects ?? []).length !== projectIds.length) return false;
  const withFinding = refs.filter((r) => r.findingId);
  for (const r of withFinding) {
    const { data } = await admin.from("passport_evidence").select("id,path").eq("project_id", r.projectId).eq("id", r.findingId as string).maybeSingle();
    if (!data || (data as { path: string }).path !== r.path) return false;
  }
  return true;
}

export async function getContribution(ownerId: string, repoFullName: string): Promise<ContributionContext> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return emptyContribution(repoFullName);
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_contributions")
    .select(CONTRIBUTION_COLUMNS)
    .eq("passport_id", passportId)
    .eq("repo_full_name", repoFullName)
    .maybeSingle();
  return data ? toContribution(data as ContributionRow) : emptyContribution(repoFullName);
}

/** All contribution statements for a work record, keyed by repository. One query. */
export async function listContributions(passportId: string): Promise<Map<string, ContributionContext>> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("passport_contributions").select(CONTRIBUTION_COLUMNS).eq("passport_id", passportId);
  return new Map(((data ?? []) as ContributionRow[]).map((r) => [r.repo_full_name, toContribution(r)]));
}

/** Active (not withdrawn) decision records for a work record, newest first. One query. */
export async function listDecisionsForPassport(passportId: string): Promise<DecisionRecord[]> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_decisions")
    .select(DECISION_COLUMNS)
    .eq("passport_id", passportId)
    .is("withdrawn_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  return ((data ?? []) as DecisionRow[]).map(toDecision);
}

/** Append-only copy of each saved statement, so what a recipient saw can be reconstructed. */
async function recordContributionRevision(passportId: string, saved: ContributionContext): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("passport_contribution_revisions").insert({
    passport_id: passportId,
    repo_full_name: saved.repoFullName,
    version: saved.version,
    content: {
      problem: saved.problem,
      workedOn: saved.workedOn,
      inherited: saved.inherited,
      collaboration: saved.collaboration,
      collaborationNote: saved.collaborationNote,
      constraintsFaced: saved.constraintsFaced,
      checkedHow: saved.checkedHow,
      results: saved.results,
      improvements: saved.improvements,
      evidenceRefs: saved.evidenceRefs,
    },
  });
  if (error) console.error("[passport] contribution revision not recorded");
}

export type SaveResult<T> = { ok: true; value: T } | { ok: false; status: number; error: string; current?: T };

/**
 * Saves the contribution statement. `expectedVersion` must match the stored
 * version (0 for a first save); a mismatch returns the newer copy instead of
 * overwriting it.
 */
export async function saveContribution(
  ownerId: string,
  repoFullName: string,
  input: ContributionInput,
  expectedVersion: number,
): Promise<SaveResult<ContributionContext>> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId || !(await repoInRecord(passportId, repoFullName))) return { ok: false, status: 404, error: "That project is not in your Passport." };
  if (!(await refsBelong(passportId, repoFullName, input.evidenceRefs))) {
    return { ok: false, status: 400, error: "An evidence link does not point at this project's evidence." };
  }
  const admin = createAdminSupabaseClient();
  const row = {
    problem: input.problem,
    worked_on: input.workedOn,
    inherited: input.inherited,
    collaboration: input.collaboration,
    collaboration_note: input.collaborationNote,
    constraints_faced: input.constraintsFaced,
    checked_how: input.checkedHow,
    results: input.results,
    improvements: input.improvements,
    evidence_refs: input.evidenceRefs,
    updated_at: new Date().toISOString(),
  };
  if (expectedVersion === 0) {
    const { data, error } = await admin
      .from("passport_contributions")
      .insert({ ...row, passport_id: passportId, repo_full_name: repoFullName, version: 1 })
      .select(CONTRIBUTION_COLUMNS)
      .single();
    if (data) {
      const value = toContribution(data as ContributionRow);
      await recordContributionRevision(passportId, value);
      return { ok: true, value };
    }
    if (error?.code !== "23505") return { ok: false, status: 500, error: "Could not save. Your text is kept; try again." };
  } else {
    const { data } = await admin
      .from("passport_contributions")
      .update({ ...row, version: expectedVersion + 1 })
      .eq("passport_id", passportId)
      .eq("repo_full_name", repoFullName)
      .eq("version", expectedVersion)
      .select(CONTRIBUTION_COLUMNS);
    const saved = (data ?? [])[0];
    if (saved) {
      const value = toContribution(saved as ContributionRow);
      await recordContributionRevision(passportId, value);
      return { ok: true, value };
    }
  }
  return {
    ok: false,
    status: 409,
    error: "This was changed somewhere else since you opened it. Review the newer version; your text is kept below.",
    current: await getContribution(ownerId, repoFullName),
  };
}

export async function listDecisions(ownerId: string, repoFullName: string): Promise<DecisionRecord[]> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return [];
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_decisions")
    .select(DECISION_COLUMNS)
    .eq("passport_id", passportId)
    .eq("repo_full_name", repoFullName)
    .order("created_at", { ascending: false })
    .limit(50);
  return ((data ?? []) as DecisionRow[]).map(toDecision);
}

function decisionRow(input: DecisionInput) {
  return {
    title: input.title,
    problem: input.problem,
    constraints_faced: input.constraintsFaced,
    alternatives: input.alternatives,
    choice: input.choice,
    tradeoffs: input.tradeoffs,
    outcome: input.outcome,
    evidence_refs: input.evidenceRefs,
    updated_at: new Date().toISOString(),
  };
}

export async function createDecision(ownerId: string, repoFullName: string, input: DecisionInput): Promise<SaveResult<DecisionRecord>> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId || !(await repoInRecord(passportId, repoFullName))) return { ok: false, status: 404, error: "That project is not in your Passport." };
  if (!(await refsBelong(passportId, repoFullName, input.evidenceRefs))) {
    return { ok: false, status: 400, error: "An evidence link does not point at this project's evidence." };
  }
  const admin = createAdminSupabaseClient();
  const { count } = await admin
    .from("passport_decisions")
    .select("id", { count: "exact", head: true })
    .eq("passport_id", passportId)
    .eq("repo_full_name", repoFullName)
    .is("withdrawn_at", null);
  if ((count ?? 0) >= 20) return { ok: false, status: 409, error: "A project can hold up to 20 decisions. Withdraw one first." };
  const { data } = await admin
    .from("passport_decisions")
    .insert({ ...decisionRow(input), passport_id: passportId, repo_full_name: repoFullName })
    .select(DECISION_COLUMNS)
    .single();
  if (!data) return { ok: false, status: 500, error: "Could not save. Your text is kept; try again." };
  return { ok: true, value: toDecision(data as DecisionRow) };
}

export async function updateDecision(
  ownerId: string,
  decisionId: string,
  input: DecisionInput,
  expectedVersion: number,
): Promise<SaveResult<DecisionRecord>> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId || !/^[0-9a-f-]{36}$/.test(decisionId)) return { ok: false, status: 404, error: "Decision not found." };
  const admin = createAdminSupabaseClient();
  const { data: existing } = await admin.from("passport_decisions").select(DECISION_COLUMNS).eq("id", decisionId).eq("passport_id", passportId).maybeSingle();
  if (!existing) return { ok: false, status: 404, error: "Decision not found." };
  const current = toDecision(existing as DecisionRow);
  if (current.withdrawnAt) return { ok: false, status: 409, error: "This decision was withdrawn and can no longer be edited." };
  if (!(await refsBelong(passportId, current.repoFullName, input.evidenceRefs))) {
    return { ok: false, status: 400, error: "An evidence link does not point at this project's evidence." };
  }
  const { data } = await admin
    .from("passport_decisions")
    .update({ ...decisionRow(input), version: expectedVersion + 1 })
    .eq("id", decisionId)
    .eq("passport_id", passportId)
    .eq("version", expectedVersion)
    .is("withdrawn_at", null)
    .select(DECISION_COLUMNS);
  const saved = (data ?? [])[0];
  if (saved) return { ok: true, value: toDecision(saved as DecisionRow) };
  return { ok: false, status: 409, error: "This decision was changed somewhere else. Review the newer version; your text is kept.", current };
}

/** Withdrawn decisions stay stored (with the time) but leave shared views. */
export async function withdrawDecision(ownerId: string, decisionId: string): Promise<boolean> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId || !/^[0-9a-f-]{36}$/.test(decisionId)) return false;
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_decisions")
    .update({ withdrawn_at: new Date().toISOString() })
    .eq("id", decisionId)
    .eq("passport_id", passportId)
    .is("withdrawn_at", null)
    .select("id");
  return (data ?? []).length > 0;
}
