import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getOwnerPassport, getShareOwnerId, previewShare, resolveShare } from "@/lib/passport/store";
import type { PassportData } from "@/lib/passport/view";
import { aggregateTimeline, publicTimelineItem } from "./aggregate";
import type { ParsedEditorEvidence } from "./editor-import/parse";
import type {
  ConnectedAccount,
  ConnectedAccountProvider,
  EditorEvidenceImport,
  EngineerProfile,
  OpenTo,
  ProfileHub,
  ProfileLink,
  TimelineItem,
} from "./types";
import { EMPTY_SOCIAL, OPEN_TO, SOCIAL_KINDS, type SocialKind } from "./types";
import { normalizeSocial } from "./social";
import { normalizeHandle } from "./handle";
import { sniffImage } from "./image";
import { shareHowIBuild, type HowIBuildInput } from "./how-i-build";
import { signSharedPresentationImages } from "@/lib/passport/presentation-store";

const SOCIAL_COLUMN: Record<SocialKind, "linkedin_url" | "x_url" | "instagram_url"> = {
  linkedin: "linkedin_url",
  x: "x_url",
  instagram: "instagram_url",
};

type ProfileRow = {
  display_name: string;
  handle: string | null;
  headline: string;
  role: string;
  bio: string | null;
  location: string | null;
  website: string | null;
  links: unknown;
  open_to: string | null;
  avatar_path: string | null;
  linkedin_url: string | null;
  x_url: string | null;
  instagram_url: string | null;
  how_i_build: string | null;
  how_i_build_shared: boolean | null;
  how_i_build_updated_at: string | null;
  updated_at: string;
};

export const PHOTO_BUCKET = "profile-photos";

function photoUrl(path: string | null): string {
  if (!path) return "";
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  return base ? `${base}/storage/v1/object/public/${PHOTO_BUCKET}/${path}` : "";
}

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

const PROFILE_COLUMNS =
  "display_name,handle,headline,role,bio,location,website,links,open_to,avatar_path,linkedin_url,x_url,instagram_url,how_i_build,how_i_build_shared,how_i_build_updated_at,updated_at";

function toProfile(row: ProfileRow): EngineerProfile {
  const links = Array.isArray(row.links)
    ? row.links.filter(
        (l): l is ProfileLink =>
          typeof l === "object" && l !== null && typeof (l as ProfileLink).label === "string" && typeof (l as ProfileLink).url === "string",
      )
    : [];
  return {
    displayName: row.display_name,
    handle: row.handle ?? "",
    headline: row.headline,
    role: row.role,
    bio: row.bio ?? "",
    location: row.location ?? "",
    website: row.website ?? "",
    links,
    openTo: (OPEN_TO as readonly string[]).includes(row.open_to ?? "") ? (row.open_to as OpenTo) : "",
    avatarUrl: photoUrl(row.avatar_path),
    social: { linkedin: row.linkedin_url ?? "", x: row.x_url ?? "", instagram: row.instagram_url ?? "" },
    howIBuild: row.how_i_build
      ? { text: row.how_i_build, includeInShares: row.how_i_build_shared === true, updatedAt: row.how_i_build_updated_at }
      : null,
    updatedAt: row.updated_at,
  };
}

export class HowIBuildConflict extends Error {
  constructor() {
    super("Your statement was changed in another tab or device. Reload to see the latest version, then make your edit again.");
  }
}

/**
 * Saves the engineer's "How I build" statement. Clearing the text also stops
 * sharing it. The save applies only if the statement is still the one the
 * editor started from; a cleared statement counts as none.
 */
export async function updateHowIBuild(ownerId: string, fallbackName: string, input: HowIBuildInput): Promise<EngineerProfile> {
  await getOrCreateProfile(ownerId, fallbackName);
  const admin = createAdminSupabaseClient();
  const { data: current, error: readError } = await admin
    .from("engineer_profiles")
    .select("how_i_build, how_i_build_updated_at")
    .eq("owner_id", ownerId)
    .single();
  if (readError || !current) throw new Error("Could not read the statement.");
  const stamp = current.how_i_build_updated_at as string | null;
  const visible = current.how_i_build ? stamp : null;
  if (input.expectedUpdatedAt !== visible) throw new HowIBuildConflict();

  const now = new Date().toISOString();
  const update = admin
    .from("engineer_profiles")
    .update({ how_i_build: input.text, how_i_build_shared: input.text ? input.includeInShares : false, how_i_build_updated_at: now, updated_at: now })
    .eq("owner_id", ownerId);
  const { data, error } = await (stamp ? update.eq("how_i_build_updated_at", stamp) : update.is("how_i_build_updated_at", null))
    .select(PROFILE_COLUMNS)
    .maybeSingle();
  if (error) throw new Error("Could not save the statement.");
  if (!data) throw new HowIBuildConflict();
  return toProfile(data as ProfileRow);
}

export async function getProfile(ownerId: string): Promise<EngineerProfile | null> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("engineer_profiles").select(PROFILE_COLUMNS).eq("owner_id", ownerId).maybeSingle();
  const row = data as ProfileRow | null;
  return row ? toProfile(row) : null;
}

export async function getOrCreateProfile(ownerId: string, fallbackName: string): Promise<EngineerProfile> {
  const existing = await getProfile(ownerId);
  if (existing) return existing;
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("engineer_profiles")
    .upsert({ owner_id: ownerId, display_name: fallbackName.slice(0, 80) }, { onConflict: "owner_id" })
    .select(PROFILE_COLUMNS)
    .single();
  if (error || !data) throw new Error("Could not create the engineering profile.");
  return toProfile(data as ProfileRow);
}

const MAX_FIELD = 120;

export class ProfileInputError extends Error {}

/** Only https URLs, so a profile link can never run script or point at a local file. */
export function cleanUrl(value: string, field: string): string {
  const raw = value.trim();
  if (!raw) return "";
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new ProfileInputError(`${field} is not a valid web address.`);
  }
  if (url.protocol !== "https:") throw new ProfileInputError(`${field} must start with https://.`);
  const out = url.toString();
  if (out.length > 200) throw new ProfileInputError(`${field} is too long.`);
  return out;
}

export async function updateIdentity(
  ownerId: string,
  input: {
    displayName?: string;
    handle?: string;
    headline?: string;
    role?: string;
    bio?: string;
    location?: string;
    website?: string;
    links?: ProfileLink[];
    openTo?: string;
    social?: Partial<Record<SocialKind, string>>;
  },
): Promise<EngineerProfile> {
  const patch: Record<string, string | null | ProfileLink[]> = { updated_at: new Date().toISOString() };
  if (typeof input.displayName === "string") {
    patch.display_name = input.displayName.trim().slice(0, MAX_FIELD);
    if (!patch.display_name) throw new ProfileInputError("Display name cannot be empty.");
  }
  if (typeof input.handle === "string") {
    if (!input.handle.trim()) patch.handle = null;
    else {
      const result = normalizeHandle(input.handle);
      if ("error" in result) throw new ProfileInputError(result.error);
      patch.handle = result.handle;
    }
  }
  if (typeof input.headline === "string") patch.headline = input.headline.trim().slice(0, 160);
  if (typeof input.role === "string") patch.role = input.role.trim().slice(0, MAX_FIELD);
  if (typeof input.bio === "string") {
    if (input.bio.trim().length > 1200) throw new ProfileInputError("Keep About under 1,200 characters.");
    patch.bio = input.bio.trim();
  }
  if (typeof input.location === "string") patch.location = input.location.trim().slice(0, 80);
  if (typeof input.website === "string") patch.website = cleanUrl(input.website, "Website");
  if (Array.isArray(input.links)) {
    const links = input.links
      .filter((l) => l.url.trim())
      .map((l) => ({ label: l.label.trim().slice(0, 40), url: cleanUrl(l.url, l.label.trim() || "Link") }));
    if (links.length > 5) throw new ProfileInputError("Add up to five links.");
    patch.links = links.map((l) => ({ label: l.label || new URL(l.url).hostname.replace(/^www\./, ""), url: l.url }));
  }
  if (typeof input.openTo === "string") {
    if (!(OPEN_TO as readonly string[]).includes(input.openTo)) throw new ProfileInputError("Choose what you are open to from the list.");
    patch.open_to = input.openTo;
  }
  if (input.social) {
    for (const kind of SOCIAL_KINDS) {
      const value = input.social[kind];
      if (typeof value !== "string") continue;
      const result = normalizeSocial(kind, value);
      if ("error" in result) throw new ProfileInputError(result.error);
      patch[SOCIAL_COLUMN[kind]] = result.url;
    }
  }
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("engineer_profiles")
    .upsert({ owner_id: ownerId, ...patch }, { onConflict: "owner_id" })
    .select(PROFILE_COLUMNS)
    .single();
  if (error?.code === "23505" && patch.handle) throw new ProfileInputError("That handle is taken. Choose another.");
  if (error || !data) throw new Error("Could not save the profile.");
  return toProfile(data as ProfileRow);
}

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export { sniffImage };

async function currentPhotoPath(ownerId: string): Promise<string> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("engineer_profiles").select("avatar_path").eq("owner_id", ownerId).maybeSingle();
  return (data as { avatar_path: string | null } | null)?.avatar_path ?? "";
}

export async function setProfilePhoto(ownerId: string, bytes: Uint8Array): Promise<EngineerProfile> {
  if (bytes.length === 0) throw new ProfileInputError("Choose an image to upload.");
  if (bytes.length > MAX_PHOTO_BYTES) throw new ProfileInputError("Use an image under 2 MB.");
  const kind = sniffImage(bytes);
  if (!kind) throw new ProfileInputError("Use a PNG, JPEG or WebP image.");

  const admin = createAdminSupabaseClient();
  const previous = await currentPhotoPath(ownerId);
  const path = `${ownerId}/${crypto.randomUUID()}.${kind.ext}`;
  const { error: uploadError } = await admin.storage
    .from(PHOTO_BUCKET)
    .upload(path, bytes, { contentType: kind.mime, cacheControl: "31536000", upsert: false });
  if (uploadError) throw new Error("Could not store the photo.");

  const { data, error } = await admin
    .from("engineer_profiles")
    .update({ avatar_path: path, updated_at: new Date().toISOString() })
    .eq("owner_id", ownerId)
    .select(PROFILE_COLUMNS)
    .single();
  if (error || !data) {
    await admin.storage.from(PHOTO_BUCKET).remove([path]);
    throw new Error("Could not save the photo.");
  }
  if (previous) await admin.storage.from(PHOTO_BUCKET).remove([previous]);
  return toProfile(data as ProfileRow);
}

export async function removeProfilePhoto(ownerId: string): Promise<EngineerProfile> {
  const admin = createAdminSupabaseClient();
  const previous = await currentPhotoPath(ownerId);
  const { data, error } = await admin
    .from("engineer_profiles")
    .update({ avatar_path: "", updated_at: new Date().toISOString() })
    .eq("owner_id", ownerId)
    .select(PROFILE_COLUMNS)
    .single();
  if (error || !data) throw new Error("Could not remove the photo.");
  if (previous) await admin.storage.from(PHOTO_BUCKET).remove([previous]);
  return toProfile(data as ProfileRow);
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
      detail: "Completed inside a Fydell simulation. Fydell recorded the session and ran the checks on its servers.",
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
): Promise<{ status: "ok"; public: PublicProfile } | { status: "revoked" | "missing" | "expired" }> {
  const shared = await resolveShare(token);
  if (shared.status !== "ok") return shared;
  const ownerId = await getShareOwnerId(token);
  if (!ownerId) return { status: "missing" };
  return { status: "ok", public: await buildPublicProfile(ownerId, shared.passport) };
}

/**
 * Recipient preview for the owner: the same assembly as a live share link,
 * built from unsaved share settings. Nothing is created or recorded.
 */
export async function getSharePreview(
  ownerId: string,
  fields: string[],
  opts: { repos?: string[]; versionPolicy?: string; label?: string },
): Promise<PublicProfile | null> {
  const passport = await previewShare(ownerId, fields, opts);
  return passport ? buildPublicProfile(ownerId, passport) : null;
}

async function buildPublicProfile(ownerId: string, passport: PassportData): Promise<PublicProfile> {
  // Simulation history is private to the engineer and is never part of a
  // share; only the shared passport and self-supplied imports appear here.
  const [profile, accounts, editorImports, presentations] = await Promise.all([
    getProfile(ownerId),
    listAccounts(ownerId),
    listEditorImports(ownerId),
    signSharedPresentationImages(ownerId, passport.presentations),
  ]);
  const items: TimelineItem[] = [];
  for (const project of passport.projects) {
    items.push({
      id: `gh-${project.repoFullName}`,
      kind: "github-project",
      title: project.repoFullName,
      detail: `${project.evidence.length} cited finding${project.evidence.length === 1 ? "" : "s"}${project.primaryLanguage ? ` · ${project.primaryLanguage}` : ""}`,
      occurredAt: passport.updatedAt ?? new Date(0).toISOString(),
      provenance: "repository-observation",
      url: project.htmlUrl || null,
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
    profile: profile
      ? { ...profile, howIBuild: shareHowIBuild(profile.howIBuild) }
      : {
          displayName: passport.displayName,
          handle: "",
          headline: passport.headline,
          role: "",
          bio: "",
          location: "",
          website: "",
          links: [],
          openTo: "",
          avatarUrl: "",
          social: EMPTY_SOCIAL,
          howIBuild: null,
          updatedAt: passport.updatedAt,
        },
    accounts: accounts.map((a) => ({ provider: a.provider, label: a.label })),
    timeline: aggregateTimeline(items).map(publicTimelineItem),
    passport: presentations ? { ...passport, presentations } : passport,
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
      url: project.htmlUrl || null,
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
      detail: `${imp.filesTouched.length} files · ${imp.languages.join(", ") || "languages unknown"} · ${range}. Self-supplied. Not independently observed.`,
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
