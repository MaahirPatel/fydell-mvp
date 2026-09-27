import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getOwnerPassport, getShareOwnerId, resolveShare } from "@/lib/passport/store";
import { aggregateTimeline, publicTimelineItem } from "./aggregate";
import type { ParsedEditorEvidence } from "./editor-import/parse";
import type {
  ConnectedAccount,
  ConnectedAccountProvider,
  EditorEvidenceImport,
  EngineerProfile,
  ProfileHub,
  TimelineItem,
} from "./types";

type ProfileRow = {
  display_name: string;
  headline: string;
  role: string;
  updated_at: string;
};

type AccountRow = {
  id: string;
  provider: ConnectedAccountProvider;
  label: string;
  status: ConnectedAccount["status"];
  connected_at: string;
  last_synced_at: string | null;
  meta: Record<string, unknown>;
};

type EditorRow = {
  id: string;
  source: "vscode" | "cursor";
  imported_at: string;
  time_range_start: string | null;
  time_range_end: string | null;
  session_count: number;
  files_touched: EditorEvidenceFileRow[];
  languages: string[];
  parse_method: string;
  detail: Record<string, unknown>;
};

type EditorEvidenceFileRow = {
  path: string;
  edits: number | null;
  language: string | null;
  lastTouchedAt: string | null;
};

export async function getProfile(ownerId: string): Promise<EngineerProfile | null> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("engineer_profiles")
    .select("display_name,headline,role,updated_at")
    .eq("owner_id", ownerId)
    .maybeSingle();
  const row = data as ProfileRow | null;
  if (!row) return null;
  return { displayName: row.display_name, headline: row.headline, role: row.role, updatedAt: row.updated_at };
}

export async function getOrCreateProfile(ownerId: string, fallbackName: string): Promise<EngineerProfile> {
  const existing = await getProfile(ownerId);
  if (existing) return existing;
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("engineer_profiles")
    .upsert({ owner_id: ownerId, display_name: fallbackName.slice(0, 80) }, { onConflict: "owner_id" })
    .select("display_name,headline,role,updated_at")
    .single();
  if (error || !data) throw new Error("Could not create the engineering profile.");
  const row = data as ProfileRow;
  return { displayName: row.display_name, headline: row.headline, role: row.role, updatedAt: row.updated_at };
}

const MAX_FIELD = 120;

export async function updateIdentity(
  ownerId: string,
  input: { displayName?: string; headline?: string; role?: string },
): Promise<EngineerProfile> {
  const patch: Record<string, string> = { updated_at: new Date().toISOString() };
  if (typeof input.displayName === "string") patch.display_name = input.displayName.trim().slice(0, MAX_FIELD);
  if (typeof input.headline === "string") patch.headline = input.headline.trim().slice(0, 160);
  if (typeof input.role === "string") patch.role = input.role.trim().slice(0, MAX_FIELD);
  if (!patch.display_name?.trim() && typeof input.displayName === "string") {
    throw new Error("Display name cannot be empty.");
  }
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("engineer_profiles")
    .upsert({ owner_id: ownerId, ...patch }, { onConflict: "owner_id" })
    .select("display_name,headline,role,updated_at")
    .single();
  if (error || !data) throw new Error("Could not save the profile.");
  const row = data as ProfileRow;
  return { displayName: row.display_name, headline: row.headline, role: row.role, updatedAt: row.updated_at };
}

export async function listAccounts(ownerId: string): Promise<ConnectedAccount[]> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("profile_connected_accounts")
    .select("id,provider,label,status,connected_at,last_synced_at,meta")
    .eq("owner_id", ownerId)
    .order("connected_at", { ascending: true });
  return ((data ?? []) as AccountRow[]).map((r) => ({
    id: r.id,
    provider: r.provider,
    label: r.label,
    status: r.status,
    connectedAt: r.connected_at,
    lastSyncedAt: r.last_synced_at,
    meta: r.meta ?? {},
  }));
}

const PROVIDERS: ConnectedAccountProvider[] = ["github", "vscode", "cursor"];

/**
 * Register (or refresh) a connected account.
 *
 * NOTE: GitHub OAuth is a follow-up. Today the github row is written after
 * the existing paste-flow extraction succeeds, with meta.repos listing the
 * analyzed repositories and meta.login the GitHub username.
 */
export async function connectAccount(
  ownerId: string,
  provider: ConnectedAccountProvider,
  label: string,
  meta: Record<string, unknown> = {},
): Promise<ConnectedAccount> {
  if (!PROVIDERS.includes(provider)) throw new Error("Unknown provider.");
  const cleanLabel = label.trim().slice(0, MAX_FIELD);
  if (!cleanLabel) throw new Error("A label is required (e.g. your GitHub username).");
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("profile_connected_accounts")
    .upsert(
      {
        owner_id: ownerId,
        provider,
        label: cleanLabel,
        status: "connected",
        last_synced_at: new Date().toISOString(),
        meta,
      },
      { onConflict: "owner_id,provider,label" },
    )
    .select("id,provider,label,status,connected_at,last_synced_at,meta")
    .single();
  if (error || !data) throw new Error("Could not connect the account.");
  const r = data as AccountRow;
  return {
    id: r.id,
    provider: r.provider,
    label: r.label,
    status: r.status,
    connectedAt: r.connected_at,
    lastSyncedAt: r.last_synced_at,
    meta: r.meta ?? {},
  };
}

export async function disconnectAccount(ownerId: string, provider: ConnectedAccountProvider, label?: string): Promise<boolean> {
  if (!PROVIDERS.includes(provider)) throw new Error("Unknown provider.");
  const admin = createAdminSupabaseClient();
  let q = admin.from("profile_connected_accounts").delete().eq("owner_id", ownerId).eq("provider", provider);
  if (label) q = q.eq("label", label);
  const { data } = await q.select("id");
  return (data ?? []).length > 0;
}

export async function saveEditorImport(
  ownerId: string,
  source: "vscode" | "cursor",
  parsed: ParsedEditorEvidence,
): Promise<EditorEvidenceImport> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("profile_editor_evidence")
    .insert({
      owner_id: ownerId,
      source,
      consent_ack: true,
      time_range_start: parsed.timeRangeStart,
      time_range_end: parsed.timeRangeEnd,
      session_count: parsed.sessionCount,
      files_touched: parsed.filesTouched,
      languages: parsed.languages,
      parse_method: parsed.parseMethod,
      detail: { warnings: parsed.warnings },
    })
    .select("id,source,imported_at,time_range_start,time_range_end,session_count,files_touched,languages,parse_method")
    .single();
  if (error || !data) throw new Error("Could not save the imported evidence.");
  const r = data as EditorRow;
  return toEditorImport(r);
}

function toEditorImport(r: EditorRow): EditorEvidenceImport {
  return {
    id: r.id,
    source: r.source,
    importedAt: r.imported_at,
    timeRangeStart: r.time_range_start,
    timeRangeEnd: r.time_range_end,
    sessionCount: r.session_count,
    filesTouched: (r.files_touched ?? []).map((f) => ({
      path: f.path,
      edits: f.edits,
      language: f.language,
      lastTouchedAt: f.lastTouchedAt,
    })),
    languages: r.languages ?? [],
    parseMethod: r.parse_method,
    provenance: "local-import",
  };
}

export async function listEditorImports(ownerId: string): Promise<EditorEvidenceImport[]> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("profile_editor_evidence")
    .select("id,source,imported_at,time_range_start,time_range_end,session_count,files_touched,languages,parse_method")
    .eq("owner_id", ownerId)
    .order("imported_at", { ascending: false });
  return ((data ?? []) as EditorRow[]).map(toEditorImport);
}

type SubmissionRow = {
  id: string;
  submitted_at: string;
  sim_sessions: {
    id: string;
    submitted_at: string | null;
    sim_templates: { title: string; slug: string } | null;
  } | null;
};

async function listSubmissionTimeline(ownerId: string): Promise<TimelineItem[]> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("sim_submissions")
    .select("id,submitted_at,sim_sessions!inner(id,submitted_at,candidate_user_id,sim_templates(title,slug))")
    .eq("sim_sessions.candidate_user_id", ownerId)
    .order("submitted_at", { ascending: false })
    .limit(50);
  const rows = (data ?? []) as unknown as SubmissionRow[];
  return rows.map((r) => {
    const session = r.sim_sessions;
    const title = session?.sim_templates?.title ?? "Simulation";
    return {
      id: `sim-${r.id}`,
      kind: "simulation" as const,
      title: `Submitted: ${title}`,
      detail: "Completed inside a Fydell simulation and verified server-side.",
      occurredAt: r.submitted_at,
      provenance: "observed-simulation" as const,
      url: null,
      meta: { submissionId: r.id, sessionId: session?.id ?? null, templateSlug: session?.sim_templates?.slug ?? null },
    };
  });
}

export type PublicProfile = {
  profile: EngineerProfile;
  accounts: { provider: ConnectedAccount["provider"]; label: string }[];
  timeline: TimelineItem[];
  passport: import("@/lib/passport/view").PassportData;
};

/**
 * Public profile behind a passport share link: identity, connected-account
 * labels, and a privacy-filtered evidence timeline, plus the shared passport
 * itself. Editor-import file lists are stripped for viewers.
 */
export async function getPublicProfile(
  token: string,
): Promise<{ status: "ok"; public: PublicProfile } | { status: "revoked" | "missing" }> {
  const shared = await resolveShare(token);
  if (shared.status !== "ok") return shared;
  const ownerId = await getShareOwnerId(token);
  if (!ownerId) return { status: "missing" };
  const [profile, accounts, editorImports, simItems] = await Promise.all([
    getProfile(ownerId),
    listAccounts(ownerId),
    listEditorImports(ownerId),
    listSubmissionTimeline(ownerId),
  ]);
  const passport = shared.passport;
  const items: TimelineItem[] = [...simItems];
  for (const project of passport.projects) {
    items.push({
      id: `gh-${project.repoFullName}`,
      kind: "github-project",
      title: project.repoFullName,
      detail: `${project.evidence.length} cited finding${project.evidence.length === 1 ? "" : "s"}${project.primaryLanguage ? ` · ${project.primaryLanguage}` : ""}`,
      occurredAt: passport.updatedAt ?? new Date(0).toISOString(),
      provenance: "repository-observation",
      url: project.htmlUrl,
      meta: {},
    });
  }
  for (const imp of editorImports) {
    items.push({
      id: `ed-${imp.id}`,
      kind: "editor-import",
      title: `${imp.source === "vscode" ? "VS Code" : "Cursor"} work history`,
      detail: `${imp.filesTouched.length} files · ${imp.languages.join(", ") || "languages unknown"} · self-supplied, not independently observed.`,
      occurredAt: imp.importedAt,
      provenance: "local-import",
      url: null,
      meta: {
        filesTouched: imp.filesTouched,
        languages: imp.languages,
        sessionCount: imp.sessionCount,
      },
    });
  }
  return {
    status: "ok",
    public: {
      profile: profile ?? {
        displayName: passport.displayName,
        headline: passport.headline,
        role: "",
        updatedAt: passport.updatedAt,
      },
      accounts: accounts.map((a) => ({ provider: a.provider, label: a.label })),
      timeline: aggregateTimeline(items).map(publicTimelineItem),
      passport,
    },
  };
}
export async function getProfileHub(ownerId: string, fallbackName: string): Promise<ProfileHub> {
  const [profile, accounts, editorImports, passport, simItems] = await Promise.all([
    getOrCreateProfile(ownerId, fallbackName),
    listAccounts(ownerId),
    listEditorImports(ownerId),
    getOwnerPassport(ownerId),
    listSubmissionTimeline(ownerId),
  ]);

  const items: TimelineItem[] = [...simItems];

  for (const project of passport?.projects ?? []) {
    items.push({
      id: `gh-${project.repoFullName}`,
      kind: "github-project",
      title: project.repoFullName,
      detail: `${project.evidence.length} cited finding${project.evidence.length === 1 ? "" : "s"}${project.primaryLanguage ? ` · ${project.primaryLanguage}` : ""}${project.commitSha ? ` · ${project.commitSha.slice(0, 7)}` : ""}`,
      occurredAt: passport?.updatedAt ?? new Date(0).toISOString(),
      provenance: "repository-observation",
      url: project.htmlUrl,
      meta: { commitSha: project.commitSha, status: project.status, findings: project.evidence.length },
    });
  }

  for (const imp of editorImports) {
    const range =
      imp.timeRangeStart && imp.timeRangeEnd
        ? `${imp.timeRangeStart.slice(0, 10)} → ${imp.timeRangeEnd.slice(0, 10)}`
        : imp.timeRangeStart
          ? `since ${imp.timeRangeStart.slice(0, 10)}`
          : "date range unknown";
    items.push({
      id: `ed-${imp.id}`,
      kind: "editor-import",
      title: `${imp.source === "vscode" ? "VS Code" : "Cursor"} work history`,
      detail: `${imp.filesTouched.length} files · ${imp.languages.join(", ") || "languages unknown"} · ${range}. Self-supplied — not independently observed.`,
      occurredAt: imp.importedAt,
      provenance: "local-import",
      url: null,
      meta: {
        filesTouched: imp.filesTouched,
        languages: imp.languages,
        sessionCount: imp.sessionCount,
        parseMethod: imp.parseMethod,
        timeRangeStart: imp.timeRangeStart,
        timeRangeEnd: imp.timeRangeEnd,
      },
    });
  }

  return {
    profile,
    accounts,
    editorImports,
    timeline: aggregateTimeline(items),
    hasGithubEvidence: (passport?.projects.length ?? 0) > 0,
  };
}
