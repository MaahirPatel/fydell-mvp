import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getOwnerPassport } from "@/lib/passport/store";
import { currentSnapshots } from "@/lib/passport/snapshots";
import { adoptContributionStatement, listContributions, listDecisionsForPassport } from "@/lib/passport/context-store";
import { COLLABORATION_LABEL } from "@/lib/passport/context-contract";
import { listPresentationRows } from "@/lib/passport/presentation-store";
import {
  draftFromProject,
  draftSourceOf,
  formatPeriod,
  isManualKey,
  PROJECT_STATE_LABEL,
  TEAM_LABEL,
  type ProjectPresentation,
} from "@/lib/passport/presentation";
import { describeCoverage, type PassportProject } from "@/lib/passport/view";
import {
  buildEvidenceContent,
  confirmationState,
  guideGaps,
  parseEvidenceContent,
  type ConfirmationRecord,
  type ConfirmationState,
  type EvidenceSourceKind,
  type EvidenceSources,
  type EvidenceVersionContent,
  type GuideKey,
  type PresentationSource,
  type SnapshotFeedback,
} from "./contract";
import { contentHash } from "./hash";
import { recordEvidenceEvent } from "./events";
import { listFeedbackRows } from "./feedback";
import { passportIdFor, type Failure } from "./ids";
import { getWorkSampleRow, listWorkSamples, SAMPLE_PREFIX } from "./work-samples";
import { issueEvidenceReceipt } from "@/lib/receipts/store";

export type { Failure };

function toPresentationSource(p: ProjectPresentation, saved: boolean): PresentationSource {
  return {
    title: p.title,
    summary: p.summary,
    purpose: p.purpose,
    contribution: p.contribution,
    outcomes: p.outcomes,
    technologies: p.technologies,
    links: p.links,
    period: formatPeriod(p.startedOn, p.endedOn, p.projectState),
    teamContext: p.teamContext === "unspecified" ? "" : TEAM_LABEL[p.teamContext],
    projectState: p.projectState === "unspecified" ? "" : PROJECT_STATE_LABEL[p.projectState],
    fieldSources: p.fieldSources,
    version: saved ? p.version : 0,
    saved,
  };
}

async function latestConfirmation(passportId: string, projectKey: string): Promise<ConfirmationRecord | null> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("project_contribution_confirmations")
    .select("presentation_version,contribution_version,created_at")
    .eq("passport_id", passportId)
    .eq("project_key", projectKey)
    .is("withdrawn_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = data as { presentation_version: number; contribution_version: number; created_at: string } | null;
  return row ? { presentationVersion: row.presentation_version, contributionVersion: row.contribution_version, createdAt: row.created_at } : null;
}

export type Gathered = {
  passportId: string;
  sources: EvidenceSources;
  isPrivate: boolean;
  /** The engineer-confirmable contribution text, empty when none was written. */
  contributionText: string;
};

/**
 * Everything one evidence version is built from, read only from the caller's
 * own record. Repository projects use the latest analyzed snapshot; the
 * engineer's narrative is keyed by project, so re-analysis never resets it.
 */
export async function gatherSources(ownerId: string, projectKey: string): Promise<Gathered | Failure> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return { ok: false, status: 404, error: "Add a project to your profile first." };
  const feedback = (await listFeedbackRows(passportId, projectKey)).map(
    (f): SnapshotFeedback => ({
      id: f.id,
      authorName: f.authorName,
      relationship: f.relationship,
      relationshipNote: f.relationshipNote,
      directlyObserved: f.directlyObserved,
      statement: f.statement,
      verification: f.verification,
      createdAt: f.createdAt,
    }),
  );

  if (projectKey.startsWith(SAMPLE_PREFIX)) {
    const sample = await getWorkSampleRow(ownerId, projectKey.slice(SAMPLE_PREFIX.length));
    if (!sample) return { ok: false, status: 404, error: "That work sample is not in your profile." };
    return {
      passportId,
      isPrivate: false,
      contributionText: "",
      sources: {
        projectKey,
        sourceKind: "work_sample",
        presentation: null,
        contribution: null,
        decisions: [],
        snapshot: null,
        notes: [],
        simulations: [sample.summary],
        feedback: [],
        confirmation: null,
      },
    };
  }

  const presentations = await listPresentationRows(passportId);
  const saved = presentations.find((p) => p.projectKey.toLowerCase() === projectKey.toLowerCase()) ?? null;

  if (isManualKey(projectKey)) {
    if (!saved || saved.sourceKind !== "manual") return { ok: false, status: 404, error: "That project is not in your profile." };
    return {
      passportId,
      isPrivate: saved.visibility === "private",
      contributionText: saved.contribution,
      sources: {
        projectKey: saved.projectKey,
        sourceKind: "manual",
        presentation: toPresentationSource(saved, true),
        contribution: null,
        decisions: [],
        snapshot: null,
        notes: [],
        simulations: [],
        feedback,
        confirmation: await latestConfirmation(passportId, saved.projectKey),
      },
    };
  }

  const passport = await getOwnerPassport(ownerId, { withNotes: true });
  const snapshot = currentSnapshots(passport?.projects ?? []).find((p) => p.repoFullName.toLowerCase() === projectKey.toLowerCase()) as
    | (PassportProject & { id: string })
    | undefined;
  if (!passport || !snapshot?.id) return { ok: false, status: 404, error: "That project is not in your profile." };
  const repo = snapshot.repoFullName;
  const [contributions, decisions] = await Promise.all([listContributions(passportId), listDecisionsForPassport(passportId)]);
  const contribution = contributions.get(repo) ?? null;
  // Featuring or reordering stores the generated draft without the engineer saving it (no confirmedAt);
  // that is still the draft, so it must not make an earlier confirmation stale.
  const presentation = saved ? toPresentationSource(saved, !!saved.confirmedAt) : toPresentationSource(draftFromProject(draftSourceOf(snapshot), 0), false);
  const sourceKind: EvidenceSourceKind = snapshot.sourceKind === "upload" ? "upload" : "github";
  return {
    passportId,
    isPrivate: saved?.visibility === "private",
    contributionText: contribution?.workedOn || (saved ? saved.contribution : ""),
    sources: {
      projectKey: repo,
      sourceKind,
      presentation,
      contribution: contribution
        ? {
            problem: contribution.problem,
            workedOn: contribution.workedOn,
            inherited: contribution.inherited,
            collaborationLabel: contribution.collaboration === "unspecified" ? "" : COLLABORATION_LABEL[contribution.collaboration],
            collaborationNote: contribution.collaborationNote,
            constraintsFaced: contribution.constraintsFaced,
            checkedHow: contribution.checkedHow,
            results: contribution.results,
            version: contribution.version,
          }
        : null,
      decisions: decisions
        .filter((d) => d.repoFullName === repo)
        .map((d) => ({
          title: d.title,
          problem: d.problem,
          constraints: d.constraintsFaced,
          alternatives: d.alternatives,
          choice: d.choice,
          tradeoffs: d.tradeoffs,
          outcome: d.outcome,
        })),
      snapshot: {
        id: snapshot.id,
        commitSha: snapshot.commitSha,
        analyzedAt: snapshot.analyzedAt,
        analysisVersion: snapshot.analysisVersion ?? null,
        importerVersion: snapshot.importerVersion ?? null,
        coverage: describeCoverage(snapshot),
        findings: snapshot.evidence.map((e) => ({
          id: e.id,
          finding: e.finding,
          category: e.category,
          basis: e.basis,
          path: e.path,
          startLine: e.startLine,
          endLine: e.endLine,
          excerpt: e.excerpt,
          sourceUrl: e.sourceUrl,
          limitations: e.limitations,
        })),
      },
      notes: (passport.engineerNotes ?? []).map((n) => ({
        findingId: n.findingId,
        kind: n.kind,
        text: n.text,
        proposedInterpretation: n.proposedInterpretation,
        createdAt: n.createdAt,
      })),
      simulations: [],
      feedback,
      confirmation: await latestConfirmation(passportId, repo),
    },
  };
}

function currentVersions(s: EvidenceSources) {
  return { presentationVersion: s.presentation?.saved ? s.presentation.version : 0, contributionVersion: s.contribution?.version ?? 0 };
}

/** The statement written at import on the newest snapshot, for records saved before it moved into the project context. */
async function importedStatement(ownerId: string, repoFullName: string): Promise<string> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return "";
  const { data } = await createAdminSupabaseClient()
    .from("passport_projects")
    .select("contribution_statement")
    .eq("passport_id", passportId)
    .eq("repo_full_name", repoFullName)
    .neq("contribution_statement", "")
    .order("analyzed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { contribution_statement: string } | null)?.contribution_statement ?? "";
}

/**
 * The engineer states the contribution is theirs, as currently written. A
 * later edit to the statement makes the confirmation stale; it is never
 * carried over silently.
 */
export async function confirmContribution(ownerId: string, projectKey: string): Promise<{ ok: true; state: ConfirmationState } | Failure> {
  let g = await gatherSources(ownerId, projectKey);
  if ("ok" in g) return g;
  if (!g.contributionText.trim() && !g.sources.contribution && (g.sources.sourceKind === "github" || g.sources.sourceKind === "upload")) {
    const statement = await importedStatement(ownerId, g.sources.projectKey);
    if (statement && (await adoptContributionStatement(ownerId, g.sources.projectKey, statement))) {
      g = await gatherSources(ownerId, projectKey);
      if ("ok" in g) return g;
    }
  }
  if (g.sources.sourceKind === "work_sample") return { ok: false, status: 400, error: "Work samples are Fydell observations; there is no contribution statement to confirm." };
  if (!g.contributionText.trim()) {
    await recordEvidenceEvent("publish_blocked", { reason: "no_contribution", source_kind: g.sources.sourceKind });
    return { ok: false, status: 400, error: "Write what your contribution was before confirming it." };
  }
  const versions = currentVersions(g.sources);
  if (confirmationState(g.sources.confirmation, versions) === "confirmed") return { ok: true, state: "confirmed" };
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("project_contribution_confirmations").insert({
    passport_id: g.passportId,
    project_key: g.sources.projectKey,
    presentation_version: versions.presentationVersion,
    contribution_version: versions.contributionVersion,
    statement: g.contributionText.slice(0, 2000),
    confirmed_by: ownerId,
  });
  if (error) return { ok: false, status: 500, error: "Could not record your confirmation. Try again." };
  const gaps = guideGaps(buildEvidenceContent(g.sources).guide);
  await recordEvidenceEvent("contribution_confirmed", { source_kind: g.sources.sourceKind, guide_gaps: gaps, guide_gap_count: gaps.length });
  return { ok: true, state: "confirmed" };
}

export type VersionSummary = {
  id: string;
  version: number;
  createdAt: string;
  origin: "publish" | "application";
  contentHash: string;
  applications: Array<{ id: string; roleTitle: string; organizationName: string; active: boolean }>;
};

type VersionRow = { id: string; version: number; created_at: string; origin: "publish" | "application"; content_hash: string };

async function usageFor(versionIds: string[]): Promise<Map<string, VersionSummary["applications"]>> {
  const out = new Map<string, VersionSummary["applications"]>();
  if (versionIds.length === 0) return out;
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("application_evidence")
    .select("evidence_version_id,revoked_at,role_applications(id,status,role_snapshot)")
    .in("evidence_version_id", versionIds);
  type Row = {
    evidence_version_id: string;
    revoked_at: string | null;
    role_applications: { id: string; status: string; role_snapshot: { title?: unknown; organizationName?: unknown } | null } | null;
  };
  for (const r of (data ?? []) as unknown as Row[]) {
    const app = r.role_applications;
    if (!app) continue;
    const list = out.get(r.evidence_version_id) ?? [];
    list.push({
      id: app.id,
      roleTitle: typeof app.role_snapshot?.title === "string" ? app.role_snapshot.title : "A role",
      organizationName: typeof app.role_snapshot?.organizationName === "string" ? app.role_snapshot.organizationName : "An employer",
      active: app.status === "submitted" && !r.revoked_at,
    });
    out.set(r.evidence_version_id, list);
  }
  return out;
}

export async function listVersions(ownerId: string, projectKey: string): Promise<VersionSummary[]> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return [];
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("evidence_versions")
    .select("id,version,created_at,origin,content_hash")
    .eq("passport_id", passportId)
    .eq("project_key", projectKey)
    .order("version", { ascending: false })
    .limit(50);
  const rows = (data ?? []) as VersionRow[];
  const usage = await usageFor(rows.map((r) => r.id));
  return rows.map((r) => ({ id: r.id, version: r.version, createdAt: r.created_at, origin: r.origin, contentHash: r.content_hash, applications: usage.get(r.id) ?? [] }));
}

export type PublishResult = { ok: true; versionId: string; version: number; reused: boolean; content: EvidenceVersionContent; receiptId: string | null } | Failure;

/**
 * Stores the current evidence for one project as an immutable version.
 * Identical content resolves to the existing version, so a retry, a double
 * click, or a second application with unchanged evidence never creates a
 * duplicate. Explicit publishing needs a current contribution confirmation.
 */
export async function publishEvidenceVersion(ownerId: string, projectKey: string, origin: "publish" | "application"): Promise<PublishResult> {
  const g = await gatherSources(ownerId, projectKey);
  if ("ok" in g) return g;
  const content = buildEvidenceContent(g.sources);
  const gaps = guideGaps(content.guide);
  if (origin === "publish" && g.sources.sourceKind !== "work_sample" && !content.confirmation.confirmed) {
    await recordEvidenceEvent("publish_blocked", { reason: "unconfirmed", source_kind: g.sources.sourceKind, guide_gap_count: gaps.length });
    return { ok: false, status: 409, error: "Confirm your contribution as it reads now, then publish." };
  }
  const hash = contentHash(content);
  const admin = createAdminSupabaseClient();
  const findExisting = async () => {
    const { data } = await admin
      .from("evidence_versions")
      .select("id,version")
      .eq("passport_id", g.passportId)
      .eq("project_key", g.sources.projectKey)
      .eq("content_hash", hash)
      .maybeSingle();
    return data as { id: string; version: number } | null;
  };
  const reportPublished = (reused: boolean, version: number) =>
    recordEvidenceEvent("version_published", {
      origin,
      reused,
      version,
      source_kind: g.sources.sourceKind,
      confirmed: content.confirmation.confirmed,
      guide_gaps: gaps,
      guide_gap_count: gaps.length,
      generated_field_count: content.provenance.generatedFields.length,
      finding_count: content.findings.length,
      note_count: content.notes.length,
    });

  // A version that exists without a receipt gets one on the next publish; publishing is idempotent.
  const receiptFor = (versionId: string) => issueEvidenceReceipt(ownerId, versionId).then((r) => r.id, () => null);

  const prior = await findExisting();
  if (prior) {
    await reportPublished(true, prior.version);
    return { ok: true, versionId: prior.id, version: prior.version, reused: true, content, receiptId: await receiptFor(prior.id) };
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: top } = await admin
      .from("evidence_versions")
      .select("version")
      .eq("passport_id", g.passportId)
      .eq("project_key", g.sources.projectKey)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const next = ((top as { version: number } | null)?.version ?? 0) + 1;
    const { data, error } = await admin
      .from("evidence_versions")
      .insert({
        passport_id: g.passportId,
        owner_id: ownerId,
        project_key: g.sources.projectKey,
        version: next,
        schema_version: content.schema,
        content,
        content_hash: hash,
        origin,
      })
      .select("id,version")
      .single();
    if (data) {
      const row = data as { id: string; version: number };
      await reportPublished(false, row.version);
      return { ok: true, versionId: row.id, version: row.version, reused: false, content, receiptId: await receiptFor(row.id) };
    }
    if (error?.code !== "23505") break;
    const raced = await findExisting();
    if (raced) {
      await reportPublished(true, raced.version);
      return { ok: true, versionId: raced.id, version: raced.version, reused: true, content, receiptId: await receiptFor(raced.id) };
    }
  }
  return { ok: false, status: 500, error: "Could not publish this version. Nothing changed; try again." };
}

export type EvidenceStatus = {
  projectKey: string;
  title: string;
  sourceKind: EvidenceSourceKind;
  confirmation: ConfirmationState;
  confirmedAt: string | null;
  canConfirm: boolean;
  gaps: GuideKey[];
  preview: EvidenceVersionContent;
  /** The published version whose content equals what would be published now, if any. */
  currentVersion: number | null;
  versions: VersionSummary[];
};

export async function evidenceStatus(ownerId: string, projectKey: string): Promise<EvidenceStatus | null> {
  const g = await gatherSources(ownerId, projectKey);
  if ("ok" in g) return null;
  const preview = buildEvidenceContent(g.sources);
  const hash = contentHash(preview);
  const versions = await listVersions(ownerId, g.sources.projectKey);
  return {
    projectKey: g.sources.projectKey,
    title: preview.title,
    sourceKind: g.sources.sourceKind,
    confirmation: confirmationState(g.sources.confirmation, currentVersions(g.sources)),
    confirmedAt: g.sources.confirmation?.createdAt ?? null,
    canConfirm: g.contributionText.trim().length > 0,
    gaps: guideGaps(preview.guide),
    preview,
    currentVersion: versions.find((v) => v.contentHash === hash)?.version ?? null,
    versions,
  };
}

export type EvidenceOption = {
  key: string;
  title: string;
  kind: EvidenceSourceKind;
  detail: string;
  private: boolean;
  confirmed: boolean;
};

/** Everything an engineer can attach to an application: analyzed projects, described projects and included work samples. */
export async function listEvidenceOptions(ownerId: string): Promise<EvidenceOption[]> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return [];
  const admin = createAdminSupabaseClient();
  const [passport, presentations, samples, contributions, { data: confirmations }] = await Promise.all([
    getOwnerPassport(ownerId),
    listPresentationRows(passportId),
    listWorkSamples(ownerId),
    listContributions(passportId),
    admin
      .from("project_contribution_confirmations")
      .select("project_key,presentation_version,contribution_version,created_at")
      .eq("passport_id", passportId)
      .is("withdrawn_at", null)
      .order("created_at", { ascending: false }),
  ]);
  const latest = new Map<string, ConfirmationRecord>();
  for (const c of (confirmations ?? []) as Array<{ project_key: string; presentation_version: number; contribution_version: number; created_at: string }>) {
    const k = c.project_key.toLowerCase();
    if (!latest.has(k)) latest.set(k, { presentationVersion: c.presentation_version, contributionVersion: c.contribution_version, createdAt: c.created_at });
  }
  const byKey = new Map(presentations.map((p) => [p.projectKey.toLowerCase(), p]));
  const confirmed = (key: string, presentationVersion: number, contributionVersion: number) =>
    confirmationState(latest.get(key.toLowerCase()) ?? null, { presentationVersion, contributionVersion }) === "confirmed";

  const repos: EvidenceOption[] = currentSnapshots(passport?.projects ?? []).map((p) => {
    const pres = byKey.get(p.repoFullName.toLowerCase());
    return {
      key: p.repoFullName,
      title: pres?.title || p.repoFullName,
      kind: p.sourceKind === "upload" ? "upload" : "github",
      detail: `Revision ${p.commitSha.slice(0, 7)} · ${p.evidence.length} finding${p.evidence.length === 1 ? "" : "s"}`,
      private: pres?.visibility === "private",
      confirmed: confirmed(p.repoFullName, pres?.confirmedAt ? pres.version : 0, contributions.get(p.repoFullName)?.version ?? 0),
    };
  });
  const manual: EvidenceOption[] = presentations
    .filter((p) => p.sourceKind === "manual")
    .map((p) => ({ key: p.projectKey, title: p.title, kind: "manual", detail: "Described project", private: p.visibility === "private", confirmed: confirmed(p.projectKey, p.version, 0) }));
  const work: EvidenceOption[] = samples.map((s) => ({ key: `${SAMPLE_PREFIX}${s.id}`, title: s.summary.title, kind: "work_sample", detail: "Released work sample report", private: false, confirmed: true }));
  return [...repos, ...manual, ...work];
}

/**
 * Projects a new share link may include: confirmed and not private. Links
 * created before this rule keep their stored scope.
 */
export async function shareableProjectKeys(ownerId: string, requested: unknown): Promise<string[]> {
  const allowed = (await listEvidenceOptions(ownerId)).filter((o) => o.kind !== "work_sample" && o.confirmed && !o.private).map((o) => o.key);
  if (!Array.isArray(requested)) return allowed;
  const wanted = new Set(requested.filter((r): r is string => typeof r === "string").map((r) => r.toLowerCase()));
  return allowed.filter((k) => wanted.has(k.toLowerCase()));
}

/** Reads one stored version's content; null if the stored JSON is not a known schema. */
export function readContent(raw: unknown): EvidenceVersionContent | null {
  return parseEvidenceContent(raw);
}
