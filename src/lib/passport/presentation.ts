import { CATEGORY_LABEL } from "./record-states";
import type { PassportProject } from "./view";

export const TEAM_CONTEXTS = ["unspecified", "solo", "team", "employment", "open_source", "coursework"] as const;
export type TeamContext = (typeof TEAM_CONTEXTS)[number];
export const PROJECT_STATES = ["unspecified", "prototype", "in_progress", "shipped", "maintained", "archived"] as const;
export type ProjectState = (typeof PROJECT_STATES)[number];
export type PresentationVisibility = "private" | "shareable";
export type PresentationSourceKind = "github" | "upload" | "manual";

export const TEAM_LABEL: Record<TeamContext, string> = {
  unspecified: "Not stated",
  solo: "Built alone",
  team: "Built with a team",
  employment: "Built at work",
  open_source: "Open-source contribution",
  coursework: "Coursework",
};

export const PROJECT_STATE_LABEL: Record<ProjectState, string> = {
  unspecified: "Not stated",
  prototype: "Prototype",
  in_progress: "In progress",
  shipped: "Shipped",
  maintained: "Maintained",
  archived: "Archived",
};

export const FEATURED_MAX = 4;
export const MANUAL_PREFIX = "manual:";

export type PresentationLink = { label: string; url: string };
export type PresentationField =
  | "title"
  | "summary"
  | "purpose"
  | "intendedUsers"
  | "contribution"
  | "teamContext"
  | "projectState"
  | "outcomes"
  | "technologies"
  | "links"
  | "dates";
export type FieldSource = "engineer" | "generated";

export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const IMAGE_ALT_MAX = 200;
/** Seconds a signed image URL stays valid. Share pages mint fresh ones on each load. */
export const SHARE_IMAGE_TTL = 600;
export const OWNER_IMAGE_TTL = 3600;

/**
 * Optional image the engineer uploaded for a project. `url` is a short-lived
 * signed URL minted server-side for the current viewer, or "" when none was
 * minted; the storage path never leaves the server.
 */
export type PresentationImage = { alt: string; url: string; updatedAt: string | null };

export type ProjectPresentation = {
  /** Null for a draft that has never been saved. */
  id: string | null;
  /** Repository full name for analyzed projects; `manual:<uuid>` for manual ones. */
  projectKey: string;
  sourceKind: PresentationSourceKind;
  title: string;
  summary: string;
  purpose: string;
  intendedUsers: string;
  contribution: string;
  teamContext: TeamContext;
  projectState: ProjectState;
  outcomes: string;
  technologies: string[];
  links: PresentationLink[];
  startedOn: string | null;
  endedOn: string | null;
  featured: boolean;
  sortOrder: number;
  visibility: PresentationVisibility;
  image: PresentationImage | null;
  fieldSources: Partial<Record<PresentationField, FieldSource>>;
  /** Set when the engineer has reviewed and saved; drafts stay unconfirmed. */
  confirmedAt: string | null;
  version: number;
  updatedAt: string | null;
};

export type PresentationInput = {
  title: string;
  summary: string;
  purpose: string;
  intendedUsers: string;
  contribution: string;
  teamContext: TeamContext;
  projectState: ProjectState;
  outcomes: string;
  technologies: string[];
  links: PresentationLink[];
  startedOn: string | null;
  endedOn: string | null;
  featured: boolean;
  visibility: PresentationVisibility;
};

const LIMITS = { title: 120, summary: 600, purpose: 600, intendedUsers: 200, contribution: 1200, outcomes: 1200 } as const;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export const isManualKey = (key: string) => key.startsWith(MANUAL_PREFIX);

function text(raw: Record<string, unknown>, key: keyof typeof LIMITS): string | { error: string } {
  const value = raw[key];
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") return { error: `${key} must be text.` };
  const trimmed = value.trim();
  if (trimmed.length > LIMITS[key]) return { error: `Keep ${key === "intendedUsers" ? "intended users" : key} under ${LIMITS[key]} characters.` };
  return trimmed;
}

function month(value: unknown, label: string): string | null | { error: string } {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !MONTH.test(value)) return { error: `${label} must be a month like 2026-03.` };
  return value;
}

/** https only; no credentials in the URL. Returns the normalized URL or an error. */
export function cleanLinkUrl(value: string): string | { error: string } {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return { error: "Each link needs a full address starting with https://." };
  }
  if (url.protocol !== "https:") return { error: "Links must start with https://." };
  if (url.username || url.password) return { error: "Links cannot contain a username or password." };
  if (url.toString().length > 400) return { error: "One of the links is too long." };
  return url.toString();
}

export function parsePresentationInput(raw: unknown): { ok: true; value: PresentationInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "Send the project details as an object." };
  const r = raw as Record<string, unknown>;
  const fields = {} as Record<keyof typeof LIMITS, string>;
  for (const key of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    const v = text(r, key);
    if (typeof v !== "string") return { ok: false, error: v.error };
    fields[key] = v;
  }
  if (!fields.title) return { ok: false, error: "Give the project a name." };

  const teamContext = TEAM_CONTEXTS.find((t) => t === r.teamContext) ?? "unspecified";
  const projectState = PROJECT_STATES.find((s) => s === r.projectState) ?? "unspecified";

  const techRaw = Array.isArray(r.technologies) ? r.technologies : [];
  const technologies: string[] = [];
  for (const t of techRaw) {
    if (typeof t !== "string") continue;
    const v = t.trim().slice(0, 40);
    if (v && !technologies.some((x) => x.toLowerCase() === v.toLowerCase())) technologies.push(v);
  }
  if (technologies.length > 20) return { ok: false, error: "List at most 20 technologies." };

  const linksRaw = Array.isArray(r.links) ? r.links : [];
  if (linksRaw.length > 6) return { ok: false, error: "Add at most 6 links." };
  const links: PresentationLink[] = [];
  for (const l of linksRaw) {
    if (!l || typeof l !== "object") return { ok: false, error: "Each link needs an address." };
    const entry = l as Record<string, unknown>;
    if (typeof entry.url !== "string" || !entry.url.trim()) continue;
    const url = cleanLinkUrl(entry.url);
    if (typeof url !== "string") return { ok: false, error: url.error };
    const label = typeof entry.label === "string" ? entry.label.trim().slice(0, 60) : "";
    links.push({ label, url });
  }

  const startRaw = month(r.startedOn, "Start date");
  if (startRaw && typeof startRaw === "object") return { ok: false, error: startRaw.error };
  const endRaw = month(r.endedOn, "End date");
  if (endRaw && typeof endRaw === "object") return { ok: false, error: endRaw.error };
  const startedOn = typeof startRaw === "string" ? startRaw : null;
  const endedOn = typeof endRaw === "string" ? endRaw : null;
  if (startedOn && endedOn && endedOn < startedOn) return { ok: false, error: "The end date is before the start date." };

  return {
    ok: true,
    value: {
      ...fields,
      teamContext,
      projectState,
      technologies,
      links,
      startedOn,
      endedOn,
      featured: r.featured === true,
      visibility: r.visibility === "private" ? "private" : "shareable",
    },
  };
}

function humanize(repoFullName: string): string {
  const name = repoFullName.split("/").pop() ?? repoFullName;
  const words = name.replace(/\.(zip|git)$/i, "").split(/[-_.\s]+/).filter(Boolean);
  const title = words.map((w) => (w.length <= 3 && w === w.toUpperCase() ? w : w[0].toUpperCase() + w.slice(1))).join(" ");
  return (title || name).slice(0, 120);
}

/**
 * Unconfirmed draft built only from what the analysis observed: the
 * repository name, detected languages, and the areas with cited findings.
 * Nothing about purpose, users or contribution is guessed.
 */
export type DraftSource = {
  repoFullName: string;
  sourceKind: "github" | "upload";
  htmlUrl: string;
  primaryLanguage: string | null;
  languages: string[];
  /** One entry per cited finding. */
  categories: string[];
};

export function draftSourceOf(p: PassportProject): DraftSource {
  return {
    repoFullName: p.repoFullName,
    sourceKind: p.sourceKind === "upload" ? "upload" : "github",
    htmlUrl: p.htmlUrl,
    primaryLanguage: p.primaryLanguage,
    languages: p.coverage.languages,
    categories: p.evidence.map((e) => e.category),
  };
}

export function draftFromProject(project: DraftSource, sortOrder: number): ProjectPresentation {
  const areas = new Map<string, number>();
  for (const c of project.categories) areas.set(c, (areas.get(c) ?? 0) + 1);
  const topAreas = [...areas.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => CATEGORY_LABEL[k] ?? k.replace(/_/g, " "));
  const summary = topAreas.length ? `Cited findings in the analyzed code cover ${topAreas.join("; ")}.` : "";
  const technologies = [...new Set([...(project.primaryLanguage ? [project.primaryLanguage] : []), ...project.languages])].slice(0, 8);
  return {
    id: null,
    projectKey: project.repoFullName,
    sourceKind: project.sourceKind,
    title: humanize(project.repoFullName),
    summary,
    purpose: "",
    intendedUsers: "",
    contribution: "",
    teamContext: "unspecified",
    projectState: "unspecified",
    outcomes: "",
    technologies,
    links: project.sourceKind !== "upload" && project.htmlUrl ? [{ label: "Repository", url: project.htmlUrl }] : [],
    startedOn: null,
    endedOn: null,
    featured: false,
    sortOrder,
    visibility: "shareable",
    image: null,
    fieldSources: { title: "generated", ...(summary ? { summary: "generated" as const } : {}), technologies: "generated", links: "generated" },
    confirmedAt: null,
    version: 0,
    updatedAt: null,
  };
}

/** Field provenance after an engineer save: every field they submitted is now theirs. */
export function engineerSources(): Record<PresentationField, FieldSource> {
  return {
    title: "engineer",
    summary: "engineer",
    purpose: "engineer",
    intendedUsers: "engineer",
    contribution: "engineer",
    teamContext: "engineer",
    projectState: "engineer",
    outcomes: "engineer",
    technologies: "engineer",
    links: "engineer",
    dates: "engineer",
  };
}

/**
 * One list for the profile: saved presentations for current repositories and
 * manual projects, plus drafts for analyzed repositories never presented.
 * Presentations whose repository was removed are left out.
 */
export function mergePresentations(currentProjects: PassportProject[], saved: ProjectPresentation[]): ProjectPresentation[] {
  const byKey = new Map(saved.map((p) => [p.projectKey.toLowerCase(), p]));
  const out: ProjectPresentation[] = saved.filter((p) => p.sourceKind === "manual");
  let next = saved.reduce((m, p) => Math.max(m, p.sortOrder), 0) + 1;
  for (const project of currentProjects) {
    const existing = byKey.get(project.repoFullName.toLowerCase());
    out.push(existing ?? draftFromProject(draftSourceOf(project), next++));
  }
  return orderPresentations(out);
}

export function orderPresentations(list: ProjectPresentation[]): ProjectPresentation[] {
  return [...list].sort((a, b) => Number(b.featured) - Number(a.featured) || a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
}

/** Alt text is required whenever an image is set. */
export function parseImageAlt(value: unknown): string | { error: string } {
  if (typeof value !== "string" || !value.trim()) return { error: "Describe the image for people who cannot see it." };
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length > IMAGE_ALT_MAX) return { error: `Keep the image description under ${IMAGE_ALT_MAX} characters.` };
  return trimmed;
}

export type StoredImageRow = { projectKey: string; visibility: PresentationVisibility; imagePath: string | null };

/**
 * Storage paths a viewer may receive signed URLs for. For a share, only
 * presentations that survived the share projection and are shareable in the
 * database right now qualify; the owner may see every image they uploaded.
 */
export function imageTargets(viewer: "owner" | "share", visible: ProjectPresentation[], rows: StoredImageRow[]): Map<string, string> {
  const shown = new Set(visible.map((p) => p.projectKey.toLowerCase()));
  const out = new Map<string, string>();
  for (const row of rows) {
    const key = row.projectKey.toLowerCase();
    if (!row.imagePath || !shown.has(key)) continue;
    if (viewer === "share" && row.visibility !== "shareable") continue;
    out.set(key, row.imagePath);
  }
  return out;
}

/** Drops images with no signed URL, so the renderer falls back to the text-only layout. */
export function withSignedImages(list: ProjectPresentation[], urls: Map<string, string>): ProjectPresentation[] {
  return list.map((p) => {
    const url = urls.get(p.projectKey.toLowerCase());
    return { ...p, image: p.image && url ? { ...p.image, url } : null };
  });
}

/** Lowercased, punctuation-free title used to warn about duplicate manual projects. */
export function titleKey(title: string): string {
  return title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
}

export function formatPeriod(startedOn: string | null, endedOn: string | null, state: ProjectState): string {
  const fmt = (m: string) => {
    const [y, mo] = m.split("-").map(Number);
    return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  };
  if (startedOn && endedOn) return `${fmt(startedOn)} – ${fmt(endedOn)}`;
  if (startedOn) return state === "archived" || state === "shipped" ? `Since ${fmt(startedOn)}` : `${fmt(startedOn)} – present`;
  if (endedOn) return `Until ${fmt(endedOn)}`;
  return "";
}
