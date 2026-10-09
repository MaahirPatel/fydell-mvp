import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sha256 } from "@/lib/builder-analysis/hash";
import { getContribution, listDecisions } from "../context-store";
import { currentSnapshots } from "../snapshots";
import { getOwnerPassport } from "../store";
import { buildEnrichedReview } from "./enrich";
import { profileCapabilityGroups, type ProfileCapabilityGroup } from "./profile";
import { buildCapabilityReview, type ReviewInput } from "./synthesize";
import { CAPABILITY_SCHEMA_VERSION, type CapabilityReview } from "./types";

/**
 * Stored capability reports. A version is immutable once written; a changed
 * input (new analysis, new contribution evidence, a stated relationship)
 * appends a new version with a reason. The same input never produces a
 * second version, so retries and concurrent calls converge on one row.
 */

export type StoredCapabilityReport = {
  id: string;
  snapshotId: string;
  version: number;
  reason: string;
  inputHash: string;
  reportHash: string;
  supersedesId: string | null;
  createdAt: string;
  report: CapabilityReview;
};

export type CapabilityReportVersion = Omit<StoredCapabilityReport, "report">;

type Row = {
  id: string;
  snapshot_id: string;
  version: number;
  reason: string;
  input_hash: string;
  report_hash: string;
  supersedes_id: string | null;
  created_at: string;
  report: CapabilityReview;
};

const COLUMNS = "id,snapshot_id,version,reason,input_hash,report_hash,supersedes_id,created_at,report";
const SUMMARY_COLUMNS = "id,snapshot_id,version,reason,input_hash,report_hash,supersedes_id,created_at";
const UUID = /^[0-9a-f-]{36}$/;

function toStored(r: Row): StoredCapabilityReport {
  return { id: r.id, snapshotId: r.snapshot_id, version: r.version, reason: r.reason, inputHash: r.input_hash, reportHash: r.report_hash, supersedesId: r.supersedes_id, createdAt: r.created_at, report: r.report };
}

async function ownedPassportId(ownerId: string, snapshotId: string): Promise<string | null> {
  if (!UUID.test(snapshotId)) return null;
  const { data } = await createAdminSupabaseClient()
    .from("passport_projects")
    .select("passport_id,passports!inner(owner_id)")
    .eq("id", snapshotId)
    .eq("passports.owner_id", ownerId)
    .maybeSingle();
  return (data as { passport_id: string } | null)?.passport_id ?? null;
}

/** Everything the review is built from, read fresh for one owned snapshot. */
export async function reviewInputFor(ownerId: string, snapshotId: string): Promise<ReviewInput | null> {
  const passport = await getOwnerPassport(ownerId);
  const project = passport?.projects.find((p) => p.id === snapshotId);
  if (!passport || !project) return null;
  const [contribution, decisions] = await Promise.all([getContribution(ownerId, project.repoFullName), listDecisions(ownerId, project.repoFullName)]);
  return {
    project,
    contribution,
    decisions,
    otherProjects: currentSnapshots(passport.projects).filter((p) => p.id !== snapshotId),
  };
}

export async function latestCapabilityReport(ownerId: string, snapshotId: string): Promise<StoredCapabilityReport | null> {
  if (!(await ownedPassportId(ownerId, snapshotId))) return null;
  const { data } = await createAdminSupabaseClient().from("passport_capability_reports").select(COLUMNS).eq("snapshot_id", snapshotId).order("version", { ascending: false }).limit(1).maybeSingle();
  return data ? toStored(data as Row) : null;
}

/** Newest stored report per snapshot, for every snapshot in one work record. One query. */
export async function latestReportsForPassport(passportId: string): Promise<Map<string, StoredCapabilityReport>> {
  const out = new Map<string, StoredCapabilityReport>();
  if (!UUID.test(passportId)) return out;
  const { data } = await createAdminSupabaseClient().from("passport_capability_reports").select(COLUMNS).eq("passport_id", passportId).order("version", { ascending: false });
  for (const r of (data ?? []) as Row[]) if (!out.has(r.snapshot_id)) out.set(r.snapshot_id, toStored(r));
  return out;
}

export async function latestReportsForOwner(ownerId: string): Promise<Map<string, StoredCapabilityReport>> {
  const { data } = await createAdminSupabaseClient().from("passports").select("id").eq("owner_id", ownerId).maybeSingle();
  const id = (data as { id: string } | null)?.id;
  return id ? latestReportsForPassport(id) : new Map();
}

/**
 * Profile capability groups for a set of snapshots. Callers pass snapshot ids
 * that already went through ownership or share projection; ids the caller
 * cannot see must never reach this function.
 */
export async function profileGroupsForSnapshots(snapshotIds: string[]): Promise<ProfileCapabilityGroup[]> {
  const ids = [...new Set(snapshotIds.filter((id) => UUID.test(id)))].slice(0, 100);
  if (!ids.length) return [];
  const { data } = await createAdminSupabaseClient().from("passport_capability_reports").select(COLUMNS).in("snapshot_id", ids).order("version", { ascending: false });
  const latest = new Map<string, CapabilityReview>();
  for (const r of (data ?? []) as Row[]) if (!latest.has(r.snapshot_id)) latest.set(r.snapshot_id, r.report);
  return profileCapabilityGroups(ids.map((id) => latest.get(id)).filter((r): r is CapabilityReview => !!r));
}

export async function capabilityReportVersion(ownerId: string, snapshotId: string, version: number): Promise<StoredCapabilityReport | null> {
  if (!Number.isInteger(version) || version < 1 || !(await ownedPassportId(ownerId, snapshotId))) return null;
  const { data } = await createAdminSupabaseClient().from("passport_capability_reports").select(COLUMNS).eq("snapshot_id", snapshotId).eq("version", version).maybeSingle();
  return data ? toStored(data as Row) : null;
}

export async function listCapabilityReportVersions(ownerId: string, snapshotId: string): Promise<CapabilityReportVersion[]> {
  if (!(await ownedPassportId(ownerId, snapshotId))) return [];
  const { data } = await createAdminSupabaseClient().from("passport_capability_reports").select(SUMMARY_COLUMNS).eq("snapshot_id", snapshotId).order("version", { ascending: false });
  return ((data ?? []) as Array<Omit<Row, "report">>).map((r) => ({ id: r.id, snapshotId: r.snapshot_id, version: r.version, reason: r.reason, inputHash: r.input_hash, reportHash: r.report_hash, supersedesId: r.supersedes_id, createdAt: r.created_at }));
}

/** Latest stored report plus whether its inputs have changed since. Never calls the model. */
export async function capabilityReportState(ownerId: string, snapshotId: string): Promise<{ latest: StoredCapabilityReport | null; currentInputHash: string | null; stale: boolean }> {
  const [latest, input] = await Promise.all([latestCapabilityReport(ownerId, snapshotId), reviewInputFor(ownerId, snapshotId)]);
  const currentInputHash = input ? buildCapabilityReview(input).inputHash : null;
  return { latest, currentInputHash, stale: !!latest && !!currentInputHash && latest.inputHash !== currentInputHash };
}

/**
 * Returns the report for the snapshot's current inputs, building and storing
 * a new version only when none exists for them. The stored row is written
 * before this returns, so "Report ready" always refers to a persisted report.
 */
export async function ensureCapabilityReport(
  ownerId: string,
  snapshotId: string,
  reason: string,
): Promise<{ report: StoredCapabilityReport; created: boolean } | null> {
  const passportId = await ownedPassportId(ownerId, snapshotId);
  const input = passportId ? await reviewInputFor(ownerId, snapshotId) : null;
  if (!passportId || !input) return null;
  const admin = createAdminSupabaseClient();
  const inputHash = buildCapabilityReview(input).inputHash;
  const existing = async () => {
    const { data } = await admin.from("passport_capability_reports").select(COLUMNS).eq("snapshot_id", snapshotId).eq("input_hash", inputHash).maybeSingle();
    return data ? toStored(data as Row) : null;
  };
  const found = await existing();
  if (found) return { report: found, created: false };

  const report = await buildEnrichedReview(input);
  if (report.inputHash !== inputHash) throw new Error("Capability review inputs changed while it was built.");
  const reportHash = sha256(report);
  const cleanReason = reason.trim().slice(0, 300) || "Analysis";
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: top } = await admin.from("passport_capability_reports").select("id,version").eq("snapshot_id", snapshotId).order("version", { ascending: false }).limit(1).maybeSingle();
    const prev = top as { id: string; version: number } | null;
    const { data, error } = await admin
      .from("passport_capability_reports")
      .insert({
        passport_id: passportId,
        snapshot_id: snapshotId,
        version: (prev?.version ?? 0) + 1,
        reason: cleanReason,
        input_hash: inputHash,
        schema_version: CAPABILITY_SCHEMA_VERSION,
        analysis_version: report.analysisVersion,
        report,
        report_hash: reportHash,
        supersedes_id: prev?.id ?? null,
      })
      .select(COLUMNS)
      .single();
    if (data) return { report: toStored(data as Row), created: true };
    if (error?.code !== "23505") throw new Error("Could not save the capability report.");
    const raced = await existing();
    if (raced) return { report: raced, created: false };
  }
  throw new Error("Could not save the capability report.");
}
