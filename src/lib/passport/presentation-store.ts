import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { currentSnapshots } from "./snapshots";
import { sniffImage } from "@/lib/profile/image";
import {
  FEATURED_MAX,
  IMAGE_MAX_BYTES,
  MANUAL_PREFIX,
  OWNER_IMAGE_TTL,
  SHARE_IMAGE_TTL,
  draftFromProject,
  engineerSources,
  imageTargets,
  isManualKey,
  mergePresentations,
  parseImageAlt,
  titleKey,
  withSignedImages,
  type DraftSource,
  type StoredImageRow,
  type FieldSource,
  type PresentationField,
  type PresentationInput,
  type PresentationLink,
  type ProjectPresentation,
  type ProjectState,
  type TeamContext,
} from "./presentation";
import type { PassportProject } from "./view";

type Row = {
  id: string;
  project_key: string;
  source_kind: ProjectPresentation["sourceKind"];
  title: string;
  summary: string;
  purpose: string;
  intended_users: string;
  contribution: string;
  team_context: TeamContext;
  project_state: ProjectState;
  outcomes: string;
  technologies: string[];
  links: PresentationLink[];
  started_on: string | null;
  ended_on: string | null;
  featured: boolean;
  sort_order: number;
  visibility: ProjectPresentation["visibility"];
  field_sources: Partial<Record<PresentationField, FieldSource>>;
  confirmed_at: string | null;
  version: number;
  updated_at: string;
  image_path: string | null;
  image_alt: string;
  image_updated_at: string | null;
};

const COLUMNS =
  "id,project_key,source_kind,title,summary,purpose,intended_users,contribution,team_context,project_state,outcomes,technologies,links,started_on,ended_on,featured,sort_order,visibility,field_sources,confirmed_at,version,updated_at,image_path,image_alt,image_updated_at";

export const IMAGE_BUCKET = "project-images";

function toPresentation(r: Row): ProjectPresentation {
  return {
    id: r.id,
    projectKey: r.project_key,
    sourceKind: r.source_kind,
    title: r.title,
    summary: r.summary,
    purpose: r.purpose,
    intendedUsers: r.intended_users,
    contribution: r.contribution,
    teamContext: r.team_context,
    projectState: r.project_state,
    outcomes: r.outcomes,
    technologies: r.technologies ?? [],
    links: Array.isArray(r.links) ? r.links : [],
    startedOn: r.started_on,
    endedOn: r.ended_on,
    featured: r.featured,
    sortOrder: r.sort_order,
    visibility: r.visibility,
    image: r.image_path ? { alt: r.image_alt, url: "", updatedAt: r.image_updated_at } : null,
    fieldSources: r.field_sources ?? {},
    confirmedAt: r.confirmed_at,
    version: r.version,
    updatedAt: r.updated_at,
  };
}

function inputColumns(input: PresentationInput) {
  return {
    title: input.title,
    summary: input.summary,
    purpose: input.purpose,
    intended_users: input.intendedUsers,
    contribution: input.contribution,
    team_context: input.teamContext,
    project_state: input.projectState,
    outcomes: input.outcomes,
    technologies: input.technologies,
    links: input.links,
    started_on: input.startedOn,
    ended_on: input.endedOn,
    featured: input.featured,
    visibility: input.visibility,
  };
}

export type PresentationResult =
  | { ok: true; value: ProjectPresentation; reused?: boolean }
  | { ok: false; status: number; error: string; current?: ProjectPresentation; duplicateOf?: { projectKey: string; title: string } };

async function passportIdFor(ownerId: string): Promise<string | null> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("passports").select("id").eq("owner_id", ownerId).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

async function ensurePassport(ownerId: string, displayName: string): Promise<string> {
  const existing = await passportIdFor(ownerId);
  if (existing) return existing;
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.from("passports").insert({ owner_id: ownerId, display_name: displayName }).select("id").single();
  if (data) return (data as { id: string }).id;
  if (error?.code === "23505") {
    const again = await passportIdFor(ownerId);
    if (again) return again;
  }
  throw new Error("Could not create the profile record.");
}

export async function listPresentationRows(passportId: string): Promise<ProjectPresentation[]> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("passport_project_presentations").select(COLUMNS).eq("passport_id", passportId).order("sort_order");
  return ((data ?? []) as Row[]).map(toPresentation);
}

async function storedImageRows(passportId: string): Promise<StoredImageRow[]> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_project_presentations")
    .select("project_key,visibility,image_path")
    .eq("passport_id", passportId)
    .not("image_path", "is", null);
  return ((data ?? []) as { project_key: string; visibility: StoredImageRow["visibility"]; image_path: string | null }[]).map((r) => ({
    projectKey: r.project_key,
    visibility: r.visibility,
    imagePath: r.image_path,
  }));
}

/**
 * Fills each visible image with a short-lived signed URL. Visibility is read
 * from the database, not from the list passed in, so a share can never sign
 * an image of a project that is private now.
 */
async function signImages(passportId: string, viewer: "owner" | "share", list: ProjectPresentation[]): Promise<ProjectPresentation[]> {
  if (!list.some((p) => p.image)) return list;
  const targets = imageTargets(viewer, list, await storedImageRows(passportId));
  const urls = new Map<string, string>();
  if (targets.size) {
    const admin = createAdminSupabaseClient();
    const keys = [...targets.keys()];
    const { data } = await admin.storage
      .from(IMAGE_BUCKET)
      .createSignedUrls(keys.map((k) => targets.get(k) ?? ""), viewer === "share" ? SHARE_IMAGE_TTL : OWNER_IMAGE_TTL);
    (data ?? []).forEach((entry, i) => {
      if (entry.signedUrl && !entry.error) urls.set(keys[i], entry.signedUrl);
    });
  }
  return withSignedImages(list, urls);
}

/** Owner view: saved presentations, manual projects and drafts for unpresented repositories. */
export async function getPresentations(ownerId: string, projects: PassportProject[]): Promise<ProjectPresentation[]> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return [];
  return signImages(passportId, "owner", mergePresentations(currentSnapshots(projects), await listPresentationRows(passportId)));
}

/** Share view: signs images only for presentations already through the share projection. */
export async function signSharedPresentationImages(
  ownerId: string,
  projected: ProjectPresentation[] | undefined,
): Promise<ProjectPresentation[] | undefined> {
  if (!projected) return projected;
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return projected.map((p) => ({ ...p, image: null }));
  return signImages(passportId, "share", projected);
}

/** Latest snapshot of a repository in this work record, as draft input. */
async function currentProjectFor(passportId: string, repoFullName: string): Promise<DraftSource | null> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_projects")
    .select("repo_full_name,html_url,primary_language,source_kind,coverage, passport_evidence(category)")
    .eq("passport_id", passportId)
    .eq("repo_full_name", repoFullName)
    .order("analyzed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const r = data as {
    repo_full_name: string;
    html_url: string;
    primary_language: string | null;
    source_kind: "github" | "upload" | null;
    coverage: { languages?: string[] } | null;
    passport_evidence: { category: string }[] | null;
  };
  return {
    repoFullName: r.repo_full_name,
    sourceKind: r.source_kind === "upload" ? "upload" : "github",
    htmlUrl: r.html_url,
    primaryLanguage: r.primary_language,
    languages: r.coverage?.languages ?? [],
    categories: (r.passport_evidence ?? []).map((e) => e.category),
  };
}

async function nextSortOrder(passportId: string): Promise<number> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_project_presentations")
    .select("sort_order")
    .eq("passport_id", passportId)
    .order("sort_order", { ascending: false })
    .limit(1);
  return (((data ?? [])[0] as { sort_order: number } | undefined)?.sort_order ?? 0) + 1;
}

async function featuredCount(passportId: string, exceptKey: string): Promise<number> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_project_presentations")
    .select("project_key")
    .eq("passport_id", passportId)
    .eq("featured", true);
  return ((data ?? []) as { project_key: string }[]).filter((r) => r.project_key.toLowerCase() !== exceptKey.toLowerCase()).length;
}

async function getRow(passportId: string, projectKey: string): Promise<ProjectPresentation | null> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_project_presentations")
    .select(COLUMNS)
    .eq("passport_id", passportId)
    .eq("project_key", projectKey)
    .maybeSingle();
  return data ? toPresentation(data as Row) : null;
}

const conflict = (current: ProjectPresentation | null): PresentationResult => ({
  ok: false,
  status: 409,
  error: "This project was changed somewhere else since you opened it. Review the newer version; your text is kept.",
  ...(current ? { current } : {}),
});

/**
 * Saves the engineer's presentation for an analyzed repository or an existing
 * manual project. `expectedVersion` 0 means a first save over a draft. Saving
 * confirms the text: every field becomes engineer-provided.
 */
export async function savePresentation(
  ownerId: string,
  projectKey: string,
  input: PresentationInput,
  expectedVersion: number,
): Promise<PresentationResult> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return { ok: false, status: 404, error: "That project is not in your profile." };
  const existing = await getRow(passportId, projectKey);
  if (!existing && (isManualKey(projectKey) || !(await currentProjectFor(passportId, projectKey)))) {
    return { ok: false, status: 404, error: "That project is not in your profile." };
  }
  if (input.featured && (await featuredCount(passportId, projectKey)) >= FEATURED_MAX) {
    return { ok: false, status: 400, error: `Feature at most ${FEATURED_MAX} projects. Unfeature one first.` };
  }
  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const columns = { ...inputColumns(input), field_sources: engineerSources(), confirmed_at: now, updated_at: now };

  if (!existing) {
    if (expectedVersion !== 0) return conflict(null);
    const project = await currentProjectFor(passportId, projectKey);
    const { data, error } = await admin
      .from("passport_project_presentations")
      .insert({
        ...columns,
        passport_id: passportId,
        project_key: projectKey,
        source_kind: project?.sourceKind ?? "github",
        sort_order: await nextSortOrder(passportId),
        version: 1,
      })
      .select(COLUMNS)
      .single();
    if (data) return { ok: true, value: toPresentation(data as Row) };
    if (error?.code === "23505") return conflict(await getRow(passportId, projectKey));
    return { ok: false, status: 500, error: "Could not save. Your text is kept; try again." };
  }

  if (existing.version !== expectedVersion) return conflict(await signOne(passportId, existing));
  const { data } = await admin
    .from("passport_project_presentations")
    .update({ ...columns, version: expectedVersion + 1 })
    .eq("passport_id", passportId)
    .eq("project_key", projectKey)
    .eq("version", expectedVersion)
    .select(COLUMNS);
  const saved = (data ?? [])[0] as Row | undefined;
  if (saved) return { ok: true, value: await signOne(passportId, toPresentation(saved)) };
  const latest = await getRow(passportId, projectKey);
  return conflict(latest ? await signOne(passportId, latest) : null);
}

async function signOne(passportId: string, p: ProjectPresentation): Promise<ProjectPresentation> {
  return (await signImages(passportId, "owner", [p]))[0] ?? p;
}

export type ImageResult = { ok: true; value: ProjectPresentation } | { ok: false; status: number; error: string };

const notInProfile: ImageResult = { ok: false, status: 404, error: "Save this project before adding an image." };

async function imageRow(passportId: string, projectKey: string): Promise<{ id: string; imagePath: string | null } | null> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_project_presentations")
    .select("id,image_path")
    .eq("passport_id", passportId)
    .eq("project_key", projectKey)
    .maybeSingle();
  const r = data as { id: string; image_path: string | null } | null;
  return r ? { id: r.id, imagePath: r.image_path } : null;
}

/**
 * Stores or replaces a project's image. The type is read from the file's
 * leading bytes; the file lives under the owner's id in a private bucket.
 * Does not change the presentation version, so an open editor stays valid.
 */
export async function setPresentationImage(ownerId: string, projectKey: string, bytes: Uint8Array, altRaw: unknown): Promise<ImageResult> {
  const alt = parseImageAlt(altRaw);
  if (typeof alt !== "string") return { ok: false, status: 400, error: alt.error };
  if (bytes.length === 0) return { ok: false, status: 400, error: "Choose an image to upload." };
  if (bytes.length > IMAGE_MAX_BYTES) return { ok: false, status: 400, error: "Use an image under 2 MB." };
  const kind = sniffImage(bytes);
  if (!kind) return { ok: false, status: 400, error: "Use a PNG, JPEG or WebP image." };
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return notInProfile;
  const row = await imageRow(passportId, projectKey);
  if (!row) return notInProfile;

  const admin = createAdminSupabaseClient();
  const path = `${ownerId}/${row.id}/${randomUUID()}.${kind.ext}`;
  const { error: uploadError } = await admin.storage
    .from(IMAGE_BUCKET)
    .upload(path, bytes, { contentType: kind.mime, cacheControl: "3600", upsert: false });
  if (uploadError) return { ok: false, status: 500, error: "Could not store the image. Try again." };
  const { data } = await admin
    .from("passport_project_presentations")
    .update({ image_path: path, image_alt: alt, image_updated_at: new Date().toISOString() })
    .eq("passport_id", passportId)
    .eq("id", row.id)
    .select(COLUMNS);
  const saved = (data ?? [])[0] as Row | undefined;
  if (!saved) {
    await admin.storage.from(IMAGE_BUCKET).remove([path]);
    return { ok: false, status: 500, error: "Could not save the image. Try again." };
  }
  if (row.imagePath && row.imagePath !== path) await admin.storage.from(IMAGE_BUCKET).remove([row.imagePath]);
  return { ok: true, value: await signOne(passportId, toPresentation(saved)) };
}

export async function setPresentationImageAlt(ownerId: string, projectKey: string, altRaw: unknown): Promise<ImageResult> {
  const alt = parseImageAlt(altRaw);
  if (typeof alt !== "string") return { ok: false, status: 400, error: alt.error };
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return notInProfile;
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_project_presentations")
    .update({ image_alt: alt })
    .eq("passport_id", passportId)
    .eq("project_key", projectKey)
    .not("image_path", "is", null)
    .select(COLUMNS);
  const saved = (data ?? [])[0] as Row | undefined;
  return saved ? { ok: true, value: await signOne(passportId, toPresentation(saved)) } : { ok: false, status: 404, error: "This project has no image." };
}

export async function removePresentationImage(ownerId: string, projectKey: string): Promise<ImageResult> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return notInProfile;
  const row = await imageRow(passportId, projectKey);
  if (!row) return notInProfile;
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_project_presentations")
    .update({ image_path: null, image_alt: "", image_updated_at: new Date().toISOString() })
    .eq("passport_id", passportId)
    .eq("id", row.id)
    .select(COLUMNS);
  const saved = (data ?? [])[0] as Row | undefined;
  if (!saved) return { ok: false, status: 500, error: "Could not remove the image. Try again." };
  if (row.imagePath) await admin.storage.from(IMAGE_BUCKET).remove([row.imagePath]);
  return { ok: true, value: toPresentation(saved) };
}

/**
 * Adds a project that has no analyzed source. Retrying with the same
 * clientRequestId returns the first result. A project with the same name is
 * refused unless the engineer confirms it is a different project.
 */
export async function createManualProject(
  owner: { id: string; displayName: string },
  input: PresentationInput,
  clientRequestId: string,
  confirmDuplicate: boolean,
): Promise<PresentationResult> {
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(clientRequestId)) return { ok: false, status: 400, error: "Missing request id; reload and try again." };
  const passportId = await ensurePassport(owner.id, owner.displayName);
  const admin = createAdminSupabaseClient();

  const { data: prior } = await admin
    .from("passport_project_presentations")
    .select(COLUMNS)
    .eq("passport_id", passportId)
    .eq("client_request_id", clientRequestId)
    .maybeSingle();
  if (prior) return { ok: true, value: toPresentation(prior as Row), reused: true };

  if (!confirmDuplicate) {
    const all = await listPresentationRows(passportId);
    const { data: repoRows } = await admin.from("passport_projects").select("repo_full_name").eq("passport_id", passportId);
    const key = titleKey(input.title);
    const same =
      all.find((p) => titleKey(p.title) === key) ??
      ((repoRows ?? []) as { repo_full_name: string }[])
        .map((r) => ({ projectKey: r.repo_full_name, title: r.repo_full_name.split("/").pop() ?? r.repo_full_name }))
        .find((r) => titleKey(r.title) === key);
    if (same) {
      return {
        ok: false,
        status: 409,
        error: `You already have a project called "${same.title}". Add this one anyway only if it is a different project.`,
        duplicateOf: { projectKey: same.projectKey, title: same.title },
      };
    }
  }

  if (input.featured && (await featuredCount(passportId, "")) >= FEATURED_MAX) {
    return { ok: false, status: 400, error: `Feature at most ${FEATURED_MAX} projects. Unfeature one first.` };
  }
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("passport_project_presentations")
    .insert({
      ...inputColumns(input),
      passport_id: passportId,
      project_key: `${MANUAL_PREFIX}${randomUUID()}`,
      source_kind: "manual",
      field_sources: engineerSources(),
      confirmed_at: now,
      client_request_id: clientRequestId,
      sort_order: await nextSortOrder(passportId),
      version: 1,
      updated_at: now,
    })
    .select(COLUMNS)
    .single();
  if (data) return { ok: true, value: toPresentation(data as Row) };
  if (error?.code === "23505") {
    const { data: again } = await admin
      .from("passport_project_presentations")
      .select(COLUMNS)
      .eq("passport_id", passportId)
      .eq("client_request_id", clientRequestId)
      .maybeSingle();
    if (again) return { ok: true, value: toPresentation(again as Row), reused: true };
  }
  return { ok: false, status: 500, error: "Could not add the project. Your text is kept; try again." };
}

/**
 * Applies a full ordering and featured set. Repositories that only had a
 * draft get a row holding that draft, still unconfirmed, so their position
 * persists without claiming the engineer reviewed the text.
 */
export async function arrangePresentations(
  ownerId: string,
  order: { projectKey: string; featured: boolean }[],
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (order.filter((o) => o.featured).length > FEATURED_MAX) return { ok: false, status: 400, error: `Feature at most ${FEATURED_MAX} projects.` };
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return { ok: false, status: 404, error: "Add a project first." };
  const admin = createAdminSupabaseClient();
  const rows = await listPresentationRows(passportId);
  const byKey = new Map(rows.map((r) => [r.projectKey.toLowerCase(), r]));
  const seen = new Set<string>();
  for (const [index, entry] of order.entries()) {
    const lower = entry.projectKey.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    const existing = byKey.get(lower);
    if (existing) {
      await admin
        .from("passport_project_presentations")
        .update({ sort_order: index + 1, featured: entry.featured })
        .eq("passport_id", passportId)
        .eq("project_key", existing.projectKey);
      continue;
    }
    if (isManualKey(entry.projectKey)) continue;
    const project = await currentProjectFor(passportId, entry.projectKey);
    if (!project) continue;
    const draft = draftFromProject(project, index + 1);
    const { error } = await admin.from("passport_project_presentations").insert({
      passport_id: passportId,
      project_key: project.repoFullName,
      source_kind: draft.sourceKind,
      title: draft.title,
      summary: draft.summary,
      technologies: draft.technologies,
      links: draft.links,
      field_sources: draft.fieldSources,
      featured: entry.featured,
      sort_order: index + 1,
    });
    if (error && error.code !== "23505") return { ok: false, status: 500, error: "Could not save the order. Try again." };
  }
  return { ok: true };
}

export async function deleteManualProject(ownerId: string, projectKey: string): Promise<boolean> {
  if (!isManualKey(projectKey)) return false;
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return false;
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_project_presentations")
    .delete()
    .eq("passport_id", passportId)
    .eq("project_key", projectKey)
    .select("id,image_path");
  const removed = (data ?? []) as { id: string; image_path: string | null }[];
  const paths = removed.map((r) => r.image_path).filter((p): p is string => !!p);
  if (paths.length) await admin.storage.from(IMAGE_BUCKET).remove(paths);
  return removed.length > 0;
}
