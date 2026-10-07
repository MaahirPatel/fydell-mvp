/**
 * Role pages: the employer's description of one genuine open position, and
 * the shape an applicant reads before being asked to sign in. Pure; storage
 * lives in roles.ts.
 */

export type RemotePolicy = "onsite" | "hybrid" | "remote";

export type StoredRoleStatus = "draft" | "configuring" | "active" | "paused" | "filled" | "archived";

/** What the role page and workspace call each stored status. */
export type RoleState = "draft" | "open" | "paused" | "filled" | "closed";

export const ROLE_STATE_LABEL: Record<RoleState, string> = {
  draft: "Draft",
  open: "Open",
  paused: "Paused",
  filled: "Filled",
  closed: "Closed",
};

export const REMOTE_LABEL: Record<RemotePolicy, string> = {
  onsite: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
};

export function roleState(status: string): RoleState {
  if (status === "active") return "open";
  if (status === "paused") return "paused";
  if (status === "filled") return "filled";
  if (status === "archived") return "closed";
  return "draft";
}

export type RoleTransition = "publish" | "pause" | "reopen" | "fill" | "close";

const TRANSITIONS: Record<RoleTransition, { from: RoleState[]; to: StoredRoleStatus }> = {
  publish: { from: ["draft"], to: "active" },
  pause: { from: ["open"], to: "paused" },
  reopen: { from: ["paused"], to: "active" },
  fill: { from: ["open", "paused"], to: "filled" },
  close: { from: ["draft", "open", "paused"], to: "archived" },
};

export function nextStatus(current: string, action: RoleTransition): StoredRoleStatus | null {
  const t = TRANSITIONS[action];
  return t.from.includes(roleState(current)) ? t.to : null;
}

export function isRoleTransition(value: unknown): value is RoleTransition {
  return typeof value === "string" && value in TRANSITIONS;
}

export type RoleInput = {
  title: string;
  description: string;
  seniority: string;
  location: string;
  remotePolicy: RemotePolicy | null;
  employmentType: string;
  compensation: string;
  required: string[];
  preferred: string[];
  hiringSteps: string[];
  expectedEffort: string;
  applicationDeadline: string | null;
  contactEmail: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function text(raw: unknown, max: number): string | null {
  const v = typeof raw === "string" ? raw.trim() : "";
  return v.length > max ? null : v;
}

function list(raw: unknown, maxItems: number, maxLen: number): string[] | null {
  if (raw === undefined || raw === null) return [];
  const source = typeof raw === "string" ? raw.split("\n") : Array.isArray(raw) ? raw : null;
  if (!source) return null;
  const items = source.filter((i): i is string => typeof i === "string").map((i) => i.trim()).filter(Boolean);
  if (items.length > maxItems || items.some((i) => i.length > maxLen)) return null;
  return items;
}

/** Validates a role draft. Publishing has stricter rules; see publishProblems. */
export function parseRoleInput(raw: unknown): { ok: true; value: RoleInput } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "Send the role fields." };
  const b = raw as Record<string, unknown>;
  const title = text(b.title, 120);
  if (!title || title.length < 2) return { ok: false, error: "Give the role a title between 2 and 120 characters." };
  const description = text(b.description, 4000);
  if (description === null) return { ok: false, error: "Keep the description of the work under 4,000 characters." };
  const seniority = text(b.seniority, 60);
  const location = text(b.location, 120);
  const employmentType = text(b.employmentType, 60);
  const compensation = text(b.compensation, 200);
  const expectedEffort = text(b.expectedEffort, 200);
  if (seniority === null || location === null || employmentType === null || compensation === null || expectedEffort === null) {
    return { ok: false, error: "One of the short fields is too long. Level, type and location are limited to a line each." };
  }
  const remotePolicy = b.remotePolicy === "onsite" || b.remotePolicy === "hybrid" || b.remotePolicy === "remote" ? b.remotePolicy : null;
  const required = list(b.required, 10, 200);
  if (!required) return { ok: false, error: "List up to 10 required capabilities, each under 200 characters." };
  const preferred = list(b.preferred, 10, 200);
  if (!preferred) return { ok: false, error: "List up to 10 preferred capabilities, each under 200 characters." };
  const hiringSteps = list(b.hiringSteps, 8, 160);
  if (!hiringSteps) return { ok: false, error: "List up to 8 hiring steps, each under 160 characters." };
  const deadlineRaw = typeof b.applicationDeadline === "string" ? b.applicationDeadline.trim() : "";
  if (deadlineRaw && !DATE.test(deadlineRaw)) return { ok: false, error: "Use a date for the deadline, or leave it empty." };
  const contactEmail = text(b.contactEmail, 254);
  if (contactEmail === null || (contactEmail && !EMAIL.test(contactEmail))) {
    return { ok: false, error: "Enter a contact email applicants can write to, or leave it empty." };
  }
  return {
    ok: true,
    value: {
      title,
      description,
      seniority,
      location,
      remotePolicy,
      employmentType,
      compensation,
      required,
      preferred,
      hiringSteps,
      expectedEffort,
      applicationDeadline: deadlineRaw || null,
      contactEmail: contactEmail.toLowerCase(),
    },
  };
}

/** Reasons a role cannot be published yet, in plain language. Empty means ready. */
export function publishProblems(role: Pick<RoleInput, "description" | "required">, confirmedGenuine: boolean): string[] {
  const problems: string[] = [];
  if (role.description.trim().length < 40) problems.push("Describe the actual work in a few sentences.");
  if (role.required.length === 0) problems.push("Add at least one required capability. Reviews are organized around them.");
  if (!confirmedGenuine) problems.push("Confirm this is a genuine open position before publishing.");
  return problems;
}

export function deadlinePassed(deadline: string | null, now: Date = new Date()): boolean {
  if (!deadline) return false;
  return new Date(`${deadline}T23:59:59Z`).getTime() < now.getTime();
}

/** True when the role page may accept a new application. */
export function acceptsApplications(status: string, deadline: string | null, now: Date = new Date()): boolean {
  return roleState(status) === "open" && !deadlinePassed(deadline, now);
}

/** Why a role page is not taking applications, for the applicant. */
export function closedReason(status: string, deadline: string | null, now: Date = new Date()): string | null {
  const state = roleState(status);
  if (state === "paused") return "The team has paused new applications for this role. Applications already sent are still being reviewed.";
  if (state === "filled") return "This role has been filled. Applications already sent are kept.";
  if (state === "closed") return "This role is closed and is not taking new applications.";
  if (state === "draft") return "This role is not published.";
  if (deadlinePassed(deadline, now)) return "The application deadline for this role has passed.";
  return null;
}

export function slugFor(title: string, suffix: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return `${base || "role"}-${suffix}`;
}

export type ApplicationInput = {
  contactName: string;
  repos: string[];
  links: string[];
  note: string;
  confirmShare: boolean;
};

export function parseApplicationInput(raw: unknown): { ok: true; value: ApplicationInput } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "Send the application fields." };
  const b = raw as Record<string, unknown>;
  const contactName = text(b.contactName, 120);
  if (!contactName) return { ok: false, error: "Add the name the team should use for you." };
  const repos = Array.isArray(b.repos) ? [...new Set(b.repos.filter((r): r is string => typeof r === "string" && r.length <= 200))].slice(0, 20) : [];
  const rawLinks = Array.isArray(b.links) ? b.links.filter((l): l is string => typeof l === "string").map((l) => l.trim()).filter(Boolean) : [];
  if (rawLinks.length > 5) return { ok: false, error: "Add up to 5 links." };
  for (const l of rawLinks) {
    let url: URL;
    try {
      url = new URL(l);
    } catch {
      return { ok: false, error: `"${l.slice(0, 60)}" is not a full link. Start it with https://.` };
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, error: "Links must start with https://." };
    if (l.length > 300) return { ok: false, error: "Keep each link under 300 characters." };
  }
  const note = text(b.note, 2000);
  if (note === null) return { ok: false, error: "Keep the note under 2,000 characters." };
  if (b.confirmShare !== true) return { ok: false, error: "Confirm what you are sharing with this team." };
  if (repos.length === 0 && rawLinks.length === 0 && !note) {
    return { ok: false, error: "Include at least one project, a link, or a short note about relevant work." };
  }
  return { ok: true, value: { contactName, repos, links: rawLinks, note, confirmShare: true } };
}

export type ApplicationStage = "new" | "in_review" | "awaiting_candidate" | "closed";

export const STAGE_LABEL: Record<ApplicationStage, string> = {
  new: "New",
  in_review: "In review",
  awaiting_candidate: "Waiting on applicant",
  closed: "Closed",
};

export function isStage(value: unknown): value is ApplicationStage {
  return value === "new" || value === "in_review" || value === "awaiting_candidate" || value === "closed";
}
