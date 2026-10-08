/**
 * Structured role requirements. These, not the job title, are what reviewers
 * look for. Suggestions (from a pasted job description) stay unconfirmed until
 * the employer confirms, downgrades or removes each one, and an unconfirmed
 * suggestion is never saved as a screening criterion. Pure; shared by the
 * browser form, the API and the tests.
 */

export type RequirementKind = "required" | "preferred";
export type RequirementSource = "employer" | "suggested";

export type RoleRequirement = {
  id: string;
  text: string;
  kind: RequirementKind;
  source: RequirementSource;
  confirmed: boolean;
};

export const REQUIREMENT_LIMITS = { maxItems: 40, maxPerKind: 20, maxText: 200 } as const;

const ID = /^[A-Za-z0-9_-]{1,40}$/;

export function newRequirementId(): string {
  const c = globalThis.crypto;
  const raw = c && typeof c.randomUUID === "function" ? c.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `r_${raw.replace(/-/g, "").slice(0, 16)}`;
}

/** Cuts text to the requirement limit at a word boundary. */
export function clampRequirementText(text: string, max: number = REQUIREMENT_LIMITS.maxText): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.-]+$/, "");
}

export function parseRequirements(raw: unknown): { ok: true; value: RoleRequirement[] } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, value: [] };
  if (!Array.isArray(raw)) return { ok: false, error: "Send requirements as a list." };
  if (raw.length > REQUIREMENT_LIMITS.maxItems) return { ok: false, error: `Keep the list to ${REQUIREMENT_LIMITS.maxItems} requirements or fewer.` };
  const seen = new Set<string>();
  const out: RoleRequirement[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) return { ok: false, error: "One of the requirements is not readable." };
    const r = item as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : "";
    if (!ID.test(id) || seen.has(id)) return { ok: false, error: "One of the requirements has a missing or repeated id. Reload and try again." };
    seen.add(id);
    const text = typeof r.text === "string" ? r.text.replace(/\s+/g, " ").trim() : "";
    if (text.length < 3) return { ok: false, error: "Each requirement needs a few words describing what a person can show. Remove empty ones." };
    if (text.length > REQUIREMENT_LIMITS.maxText) return { ok: false, error: `Keep each requirement under ${REQUIREMENT_LIMITS.maxText} characters.` };
    if (r.kind !== "required" && r.kind !== "preferred") return { ok: false, error: "Mark each requirement as required or preferred." };
    if (r.source !== "employer" && r.source !== "suggested") return { ok: false, error: "One of the requirements has an unknown source." };
    if (typeof r.confirmed !== "boolean") return { ok: false, error: "One of the requirements is missing its confirmation state." };
    out.push({ id, text, kind: r.kind, source: r.source, confirmed: r.confirmed });
  }
  for (const kind of ["required", "preferred"] as const) {
    if (out.filter((r) => r.kind === kind).length > REQUIREMENT_LIMITS.maxPerKind) {
      return { ok: false, error: `Keep ${kind} requirements to ${REQUIREMENT_LIMITS.maxPerKind} or fewer.` };
    }
  }
  return { ok: true, value: out };
}

export function unconfirmedSuggestions(reqs: readonly RoleRequirement[]): RoleRequirement[] {
  return reqs.filter((r) => !r.confirmed);
}

/** Why this list can't be saved yet, or null when it can. */
export function savableRequirementsProblem(reqs: readonly RoleRequirement[]): string | null {
  const pending = unconfirmedSuggestions(reqs).length;
  if (pending === 0) return null;
  return `${pending} suggested requirement${pending === 1 ? "" : "s"} still need${pending === 1 ? "s" : ""} review. Confirm, make preferred, or remove each one before saving.`;
}

/** The confirmed lists stored as evaluation criteria. Order is kept: review mappings use the index. */
export function criteriaFrom(reqs: readonly RoleRequirement[]): { required: string[]; preferred: string[] } {
  const confirmed = reqs.filter((r) => r.confirmed);
  return {
    required: confirmed.filter((r) => r.kind === "required").map((r) => r.text),
    preferred: confirmed.filter((r) => r.kind === "preferred").map((r) => r.text),
  };
}

function fingerprint(reqs: readonly RoleRequirement[]): string {
  return JSON.stringify(reqs.filter((r) => r.confirmed).map((r) => [r.id, r.text, r.kind]));
}

export function requirementsChanged(before: readonly RoleRequirement[], after: readonly RoleRequirement[]): boolean {
  return fingerprint(before) !== fingerprint(after);
}

export const INITIAL_REQUIREMENT_VERSION = 1;

/**
 * The version a save should write, or null when the requirements did not
 * change. Roles created before structured requirements carry their version in
 * the older rubric counter, so the next version continues from whichever is higher.
 */
export function nextRequirementVersion(current: { requirementVersion: number; legacyVersion: number }, changed: boolean): number | null {
  if (!changed) return null;
  return Math.max(current.requirementVersion, current.legacyVersion, 0) + 1;
}

/** Builds structured requirements from plain lists, reusing ids for unchanged lines. */
export function requirementsFromLists(required: readonly string[], preferred: readonly string[], existing: readonly RoleRequirement[] = []): RoleRequirement[] {
  const pool = [...existing];
  const take = (text: string, kind: RequirementKind): RoleRequirement => {
    const i = pool.findIndex((r) => r.text === text && r.kind === kind);
    const prior = i >= 0 ? pool.splice(i, 1)[0] : null;
    return { id: prior?.id ?? newRequirementId(), text: clampRequirementText(text), kind, source: prior?.source ?? "employer", confirmed: true };
  };
  return [...required.map((t) => take(t, "required")), ...preferred.map((t) => take(t, "preferred"))];
}
