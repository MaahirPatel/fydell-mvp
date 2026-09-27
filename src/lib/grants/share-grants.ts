/**
 * Accounts chunk — candidate-directed share grants (NET-01..NET-08).
 *
 * The network model, enforced server-side:
 *
 * - NET-01 identity vs applications: a `DeveloperPassport` is the one stable
 *   developer-owned record. Employer applications are separate
 *   `ApplicationSnapshot` records derived from explicit grants. Employer
 *   membership never confers ownership of the passport.
 * - NET-02 provenance: every evidence item carries type, source/version,
 *   assessment conditions, date, scope, verification method and limitations.
 *   Missing provenance is rejected at creation. Records keep per-evidence
 *   findings; there is deliberately no universal cross-scope ability score.
 * - NET-03 candidate-directed reuse: the candidate selects eligible evidence
 *   when responding to a role invitation; the employer sees exactly the
 *   authorized snapshot for that application.
 * - NET-04 private/portable separation: evidence has a visibility
 *   classification. `createShareGrant` only accepts `portable` items —
 *   private notes, employer-confidential material and hidden tests are
 *   rejected by construction (the error lists what was excluded).
 * - NET-05 pre-share disclosure: `preShareDisclosure` reports recipient,
 *   scope, expiry, retention, revocation mechanics and the limits of
 *   retracting downloaded copies *before* anything is shared.
 * - NET-06 freshness/corrections: re-evaluation creates a new version;
 *   material corrections are traceable (previous version, corrected finding,
 *   actor/reason) and propagated with notification status to affected
 *   authorized records.
 * - NET-07 voluntary participation: passports default to undiscoverable,
 *   no auto-apply, no outreach triggered by connecting GitHub. The candidate
 *   can decline reuse entirely.
 * - NET-08 cross-employer path: separate grants per employer; each employer
 *   sees only its allowed scope.
 *
 * Grants carry owner, audience, fields/items, expiry, revocation and an
 * access log, matching the required "Share grant" record invariant.
 */

import { randomUUID } from "node:crypto";

export type EvidenceVisibility = "portable" | "private" | "employer_confidential" | "hidden_test";

export type EvidenceStatus = "current" | "superseded";

export interface EvidenceItem {
  id: string;
  ownerUserId: string;
  /** NET-02 provenance — all required. */
  evidenceType: string;
  source: string;
  sourceVersion: string;
  assessmentConditions: string;
  capturedAt: string;
  scope: string;
  verificationMethod: string;
  limitations: string;
  visibility: EvidenceVisibility;
  version: number;
  status: EvidenceStatus;
  supersedesId?: string;
  /** Set on the old version when a material correction replaces it. */
  correction?: {
    correctedFinding: string;
    reason: string;
    actorUserId: string;
    at: string;
  };
  correctionOf?: string;
}

export interface DeveloperPassport {
  developerUserId: string;
  evidenceIds: string[];
  /** NET-07 defaults: everything opt-in, nothing automatic. */
  discoverable: boolean;
  autoApply: boolean;
  outreachOnGithubConnect: boolean;
  reuseOptOut: boolean;
  createdAt: string;
}

export interface EvidenceVersionPin {
  evidenceId: string;
  version: number;
}

export interface GrantAccessEntry {
  at: string;
  accessorOrgId: string;
  accessorUserId: string;
  fields: string[];
}

export interface ShareGrant {
  id: string;
  ownerUserId: string;
  audienceOrgId: string;
  evidence: EvidenceVersionPin[];
  fields: string[];
  purpose: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
  accessLog: GrantAccessEntry[];
}

export interface RoleInvitation {
  id: string;
  orgId: string;
  roleId: string;
  roleTitle: string;
  invitedUserId: string;
  status: "pending" | "responded" | "withdrawn";
}

export interface ApplicationSnapshot {
  id: string;
  grantId: string;
  orgId: string;
  roleId: string;
  roleTitle: string;
  evidence: EvidenceVersionPin[];
  disclosure: ShareDisclosure;
  /** Retained application records behave as disclosed (E2E-13). */
  retainedUntil: string;
  createdAt: string;
}

export interface ShareDisclosure {
  recipientOrgId: string;
  recipientOrgName: string;
  scopeFields: string[];
  evidenceCount: number;
  expiresAt: string;
  retentionPolicy: string;
  revocation: string;
  downloadLimits: string;
}

export interface CorrectionRecord {
  id: string;
  previousEvidenceId: string;
  previousVersion: number;
  newEvidenceId: string;
  correctedFinding: string;
  reason: string;
  actorUserId: string;
  at: string;
  notifications: Array<{ grantId: string; at: string; status: "notified" }>;
}

export interface GrantStore {
  passports: Map<string, DeveloperPassport>;
  evidence: Map<string, EvidenceItem>;
  grants: Map<string, ShareGrant>;
  roleInvitations: Map<string, RoleInvitation>;
  snapshots: Map<string, ApplicationSnapshot>;
  corrections: CorrectionRecord[];
}

export function createGrantMemoryStore(): GrantStore {
  return {
    passports: new Map(),
    evidence: new Map(),
    grants: new Map(),
    roleInvitations: new Map(),
    snapshots: new Map(),
    corrections: [],
  };
}

export type GrantError =
  | "passport_not_found"
  | "evidence_not_found"
  | "not_owner"
  | "missing_provenance"
  | "non_portable_evidence"
  | "no_evidence_selected"
  | "grant_not_found"
  | "grant_revoked"
  | "grant_expired"
  | "grant_org_mismatch"
  | "reuse_declined"
  | "invitation_not_found"
  | "invitation_not_pending"
  | "superseded_evidence";

export type GrantResult<T> = { ok: true; value: T } | { ok: false; code: GrantError; message: string };

function fail<T>(code: GrantError, message: string): GrantResult<T> {
  return { ok: false, code, message };
}

const PROVENANCE_FIELDS = [
  "evidenceType",
  "source",
  "sourceVersion",
  "assessmentConditions",
  "capturedAt",
  "scope",
  "verificationMethod",
  "limitations",
] as const;

/* Passports (NET-01 identity, NET-07 voluntary) -------------------------------- */

export function createPassport(store: GrantStore, developerUserId: string): DeveloperPassport {
  const existing = store.passports.get(developerUserId);
  if (existing) return existing;
  const passport: DeveloperPassport = {
    developerUserId,
    evidenceIds: [],
    discoverable: false,
    autoApply: false,
    outreachOnGithubConnect: false,
    reuseOptOut: false,
    createdAt: new Date().toISOString(),
  };
  store.passports.set(developerUserId, passport);
  return passport;
}

/** The candidate can decline reuse entirely; grants then refuse to mint. */
export function setReuseOptOut(store: GrantStore, developerUserId: string, optOut: boolean): void {
  const p = createPassport(store, developerUserId);
  p.reuseOptOut = optOut;
}

/* Evidence (NET-02 provenance, NET-04 visibility, NET-06 versioning) ------------ */

export function createEvidence(
  store: GrantStore,
  developerUserId: string,
  input: Partial<EvidenceItem> & { visibility: EvidenceVisibility }
): GrantResult<EvidenceItem> {
  const passport = store.passports.get(developerUserId);
  if (!passport) return fail("passport_not_found", "developer passport does not exist");

  const missing = PROVENANCE_FIELDS.filter((f) => {
    const v = (input as Record<string, unknown>)[f];
    return typeof v !== "string" || v.trim() === "";
  });
  if (missing.length > 0) {
    return fail("missing_provenance", `provenance required: ${missing.join(", ")}`);
  }

  const item: EvidenceItem = {
    id: randomUUID(),
    ownerUserId: developerUserId,
    evidenceType: input.evidenceType!,
    source: input.source!,
    sourceVersion: input.sourceVersion!,
    assessmentConditions: input.assessmentConditions!,
    capturedAt: input.capturedAt!,
    scope: input.scope!,
    verificationMethod: input.verificationMethod!,
    limitations: input.limitations!,
    visibility: input.visibility,
    version: 1,
    status: "current",
  };
  store.evidence.set(item.id, item);
  passport.evidenceIds.push(item.id);
  return { ok: true, value: item };
}

/**
 * NET-06: re-evaluation creates a new version; the old version is marked
 * superseded but retained for traceability.
 */
export function reevaluateEvidence(
  store: GrantStore,
  developerUserId: string,
  evidenceId: string,
  updates: Partial<Pick<EvidenceItem, "assessmentConditions" | "verificationMethod" | "limitations" | "sourceVersion">>
): GrantResult<EvidenceItem> {
  const old = store.evidence.get(evidenceId);
  if (!old) return fail("evidence_not_found", "evidence not found");
  if (old.ownerUserId !== developerUserId) return fail("not_owner", "not the evidence owner");
  if (old.status !== "current") return fail("superseded_evidence", "only the current version can be re-evaluated");

  old.status = "superseded";
  const next: EvidenceItem = {
    ...old,
    ...updates,
    id: randomUUID(),
    version: old.version + 1,
    status: "current",
    supersedesId: old.id,
    correction: undefined,
    correctionOf: undefined,
  };
  store.evidence.set(next.id, next);
  const passport = store.passports.get(developerUserId);
  passport?.evidenceIds.push(next.id);
  return { ok: true, value: next };
}

/**
 * NET-06: a correction to a material finding is traceable — the old version
 * keeps the corrected finding, actor and reason; affected authorized grants
 * are notified with a recorded status.
 */
export function correctEvidence(
  store: GrantStore,
  actorUserId: string,
  evidenceId: string,
  input: { correctedFinding: string; reason: string }
): GrantResult<{ newVersion: EvidenceItem; correction: CorrectionRecord }> {
  const old = store.evidence.get(evidenceId);
  if (!old) return fail("evidence_not_found", "evidence not found");
  if (old.status !== "current") return fail("superseded_evidence", "only the current version can be corrected");

  const at = new Date().toISOString();
  old.status = "superseded";
  old.correction = {
    correctedFinding: input.correctedFinding,
    reason: input.reason,
    actorUserId,
    at,
  };
  const next: EvidenceItem = {
    ...old,
    id: randomUUID(),
    version: old.version + 1,
    status: "current",
    supersedesId: old.id,
    correction: undefined,
    correctionOf: old.id,
  };
  store.evidence.set(next.id, next);

  const correction: CorrectionRecord = {
    id: randomUUID(),
    previousEvidenceId: old.id,
    previousVersion: old.version,
    newEvidenceId: next.id,
    correctedFinding: input.correctedFinding,
    reason: input.reason,
    actorUserId,
    at,
    notifications: [],
  };
  // Propagate to authorized affected records: every live grant pinning the
  // corrected version *or any version in its superseded lineage* gets a
  // notification entry with its status. Grants pin exact versions, so a
  // grant showing v1 is affected by a material correction to v2.
  const lineage = new Set<string>();
  let cursor: EvidenceItem | undefined = old;
  while (cursor) {
    lineage.add(cursor.id);
    cursor = cursor.supersedesId ? store.evidence.get(cursor.supersedesId) : undefined;
  }
  for (const grant of store.grants.values()) {
    if (grant.revokedAt) continue;
    if (new Date(grant.expiresAt).getTime() <= Date.now()) continue;
    if (grant.evidence.some((pin) => lineage.has(pin.evidenceId))) {
      correction.notifications.push({ grantId: grant.id, at, status: "notified" });
    }
  }
  store.corrections.push(correction);
  return { ok: true, value: { newVersion: next, correction } };
}

/* Share grants (NET-03/04/05/08) ------------------------------------------------ */

export interface CreateGrantInput {
  ownerUserId: string;
  audienceOrgId: string;
  evidenceIds: string[];
  fields: string[];
  purpose: string;
  expiresAt: string;
  orgNameForDisclosure?: string;
  retentionPolicy?: string;
}

/**
 * Mint a candidate-directed scoped grant. Excludes non-portable material by
 * construction: any selected item that is not `portable` (employer notes,
 * employer-confidential artifacts, hidden tests, private items) fails the
 * whole grant with the offending ids listed. Nothing is silently dropped —
 * the candidate must make a deliberate, valid selection.
 *
 * `ownerUserId` MUST be the authenticated session user id (from requireUser),
 * never a value taken from the request body — that is what stops an employer
 * minting grants over a candidate's passport.
 */
export function createShareGrant(
  store: GrantStore,
  input: CreateGrantInput
): GrantResult<{ grant: ShareGrant; disclosure: ShareDisclosure }> {
  const passport = store.passports.get(input.ownerUserId);
  if (!passport) return fail("passport_not_found", "developer passport does not exist");
  if (passport.reuseOptOut) return fail("reuse_declined", "candidate has declined evidence reuse");
  if (input.evidenceIds.length === 0) {
    return fail("no_evidence_selected", "select at least one evidence item to share");
  }

  const items: EvidenceItem[] = [];
  for (const id of input.evidenceIds) {
    const item = store.evidence.get(id);
    if (!item) return fail("evidence_not_found", `evidence ${id} not found`);
    if (item.ownerUserId !== input.ownerUserId) {
      // NET-01: employer membership never becomes ownership of the passport.
      return fail("not_owner", `evidence ${id} is not owned by the candidate`);
    }
    if (item.status !== "current") {
      return fail("superseded_evidence", `evidence ${id} is superseded; share the current version`);
    }
    items.push(item);
  }

  const nonPortable = items.filter((i) => i.visibility !== "portable");
  if (nonPortable.length > 0) {
    return fail(
      "non_portable_evidence",
      `these items can never enter a share grant (${nonPortable
        .map((i) => `${i.id}:${i.visibility}`)
        .join(", ")}): employer notes, confidential material and hidden tests stay private`
    );
  }

  const grant: ShareGrant = {
    id: randomUUID(),
    ownerUserId: input.ownerUserId,
    audienceOrgId: input.audienceOrgId,
    evidence: items.map((i) => ({ evidenceId: i.id, version: i.version })),
    fields: [...input.fields],
    purpose: input.purpose,
    createdAt: new Date().toISOString(),
    expiresAt: input.expiresAt,
    accessLog: [],
  };
  store.grants.set(grant.id, grant);
  const disclosure = preShareDisclosure(grant, {
    orgName: input.orgNameForDisclosure ?? input.audienceOrgId,
    retentionPolicy: input.retentionPolicy,
  });
  return { ok: true, value: { grant, disclosure } };
}

/**
 * NET-05: pre-share disclosure. Shown *before* the candidate confirms, so
 * the decision is informed: who receives it, what scope, when it expires,
 * whether an application snapshot is retained, how revocation works, and
 * the honest limit that downloaded copies cannot be retracted.
 */
export function preShareDisclosure(
  grant: ShareGrant,
  opts?: { orgName?: string; retentionPolicy?: string }
): ShareDisclosure {
  return {
    recipientOrgId: grant.audienceOrgId,
    recipientOrgName: opts?.orgName ?? grant.audienceOrgId,
    scopeFields: [...grant.fields],
    evidenceCount: grant.evidence.length,
    expiresAt: grant.expiresAt,
    retentionPolicy:
      opts?.retentionPolicy ??
      "An application snapshot built from this grant is retained for the hiring process plus 12 months, then deleted. The grant itself expires as stated.",
    revocation:
      "You can revoke hosted access at any time; revocation is immediate for hosted views. Copies the recipient already downloaded cannot be retracted — only further hosted access is cut off.",
    downloadLimits:
      "Recipients may view the authorized fields while the grant is live. Export/download, where offered, is limited to the same authorized scope and is logged.",
  };
}

/** Only the candidate who owns the grant may revoke it. */
export function revokeGrant(
  store: GrantStore,
  ownerUserId: string,
  grantId: string
): GrantResult<ShareGrant> {
  const grant = store.grants.get(grantId);
  if (!grant) return fail("grant_not_found", "grant not found");
  if (grant.ownerUserId !== ownerUserId) return fail("not_owner", "only the candidate can revoke this grant");
  if (!grant.revokedAt) grant.revokedAt = new Date().toISOString();
  return { ok: true, value: grant };
}

function liveGrant(store: GrantStore, grantId: string): GrantResult<ShareGrant> {
  const grant = store.grants.get(grantId);
  if (!grant) return fail("grant_not_found", "grant not found");
  if (grant.revokedAt) return fail("grant_revoked", "grant was revoked by the candidate");
  if (new Date(grant.expiresAt).getTime() <= Date.now()) {
    return fail("grant_expired", "grant has expired");
  }
  return { ok: true, value: grant };
}

/**
 * Authorized read through a grant. The accessor's org must match the grant
 * audience, and every access is appended to the grant's access log.
 */
export function readThroughGrant(
  store: GrantStore,
  grantId: string,
  accessorOrgId: string,
  accessorUserId: string,
  requestedFields: string[]
): GrantResult<{ evidence: EvidenceItem[]; fields: string[] }> {
  const g = liveGrant(store, grantId);
  if (!g.ok) return g;
  const grant = g.value;
  if (grant.audienceOrgId !== accessorOrgId) {
    return fail("grant_org_mismatch", "this grant was not issued to your organization");
  }
  const fields = requestedFields.filter((f) => grant.fields.includes(f));
  grant.accessLog.push({
    at: new Date().toISOString(),
    accessorOrgId,
    accessorUserId,
    fields,
  });
  const evidence: EvidenceItem[] = [];
  for (const pin of grant.evidence) {
    const e = store.evidence.get(pin.evidenceId);
    // Pinned to the exact version the grant was issued against.
    if (e && e.version === pin.version) evidence.push(e);
  }
  return { ok: true, value: { evidence, fields } };
}

/* Candidate-directed reuse (NET-03) -------------------------------------------- */

export function createRoleInvitation(
  store: GrantStore,
  orgId: string,
  roleId: string,
  roleTitle: string,
  invitedUserId: string
): RoleInvitation {
  const inv: RoleInvitation = {
    id: randomUUID(),
    orgId,
    roleId,
    roleTitle,
    invitedUserId,
    status: "pending",
  };
  store.roleInvitations.set(inv.id, inv);
  return inv;
}

/**
 * The candidate responds to a role invitation by deliberately selecting
 * eligible evidence. This mints a grant scoped to that org/role and an
 * application snapshot pinned to exact evidence versions. Evidence the
 * candidate did not select stays private — it never enters the snapshot.
 */
export function respondToRoleInvitation(
  store: GrantStore,
  developerUserId: string,
  invitationId: string,
  selectedEvidenceIds: string[],
  opts?: { fields?: string[]; ttlHours?: number; retentionPolicy?: string; orgName?: string }
): GrantResult<{ grant: ShareGrant; snapshot: ApplicationSnapshot; disclosure: ShareDisclosure }> {
  const inv = store.roleInvitations.get(invitationId);
  if (!inv) return fail("invitation_not_found", "role invitation not found");
  if (inv.invitedUserId !== developerUserId) {
    return fail("not_owner", "this invitation was not sent to you");
  }
  if (inv.status !== "pending") {
    return fail("invitation_not_pending", "this invitation was already answered");
  }

  const grantRes = createShareGrant(store, {
    ownerUserId: developerUserId,
    audienceOrgId: inv.orgId,
    evidenceIds: selectedEvidenceIds,
    fields: opts?.fields ?? ["findings", "provenance"],
    purpose: `Application for ${inv.roleTitle}`,
    expiresAt: new Date(Date.now() + (opts?.ttlHours ?? 24 * 90) * 3600_000).toISOString(),
    orgNameForDisclosure: opts?.orgName,
    retentionPolicy: opts?.retentionPolicy,
  });
  if (!grantRes.ok) return grantRes;
  const { grant, disclosure } = grantRes.value;

  const snapshot: ApplicationSnapshot = {
    id: randomUUID(),
    grantId: grant.id,
    orgId: inv.orgId,
    roleId: inv.roleId,
    roleTitle: inv.roleTitle,
    evidence: grant.evidence.map((p) => ({ ...p })),
    disclosure,
    retainedUntil: new Date(Date.now() + 365 * 24 * 3600_000).toISOString(),
    createdAt: new Date().toISOString(),
  };
  store.snapshots.set(snapshot.id, snapshot);
  inv.status = "responded";
  return { ok: true, value: { grant, snapshot, disclosure } };
}
