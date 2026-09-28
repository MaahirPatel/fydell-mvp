/**
 * Accounts chunk — field- and record-level access matrix.
 *
 * Implements the "Required access matrix" from the release checklist as a
 * single pure permission function. Every server route that serves accounts,
 * organization, evidence, report, billing or demo data goes through
 * `checkAccess`; the matrix rows are the four caller kinds:
 *
 *   developer  — the candidate who owns the record
 *   employer   — a member of an employer organization, with a role
 *   unrelated  — any other signed-in user
 *   operator   — a platform operator, always purpose-limited and audited
 *
 * Rules encoded here (checklist defaults):
 * - Passport evidence: developer full; employer only inside an authorized
 *   shared scope; unrelated never; operator only with a stated purpose and
 *   an audit record.
 * - Employer-specific submission/transcript: developer sees their own attempt
 *   under the stated policy; employer only for their assigned org/role;
 *   unrelated never; operator purpose-limited.
 * - Employer report: developer sees the candidate-facing subset when the
 *   employer provided one; employer sees the org report; unrelated never;
 *   operator purpose-limited.
 * - Internal notes / hiring decision history: developer never by default
 *   (access-rights requests are handled separately, not silently granted);
 *   employer only for authorized team roles; unrelated never; operator
 *   purpose-limited.
 * - Hidden tests / answer keys: developer never; employer may preview the
 *   rubric but never the secrets; unrelated never; operator only when the
 *   operator is a restricted assessment maintainer.
 * - Billing: developer never unless they hold the workspace billing role;
 *   employer only for billing-authorized members (the billing role is
 *   explicit — org owner/admin do NOT inherit it); unrelated never; operator
 *   only restricted billing support with a purpose and audit.
 * - Public demo: everyone gets fictional fixtures only.
 *
 * AUTH-06 enforcement: a membership whose status is not "active" (removed /
 * suspended / never accepted) grants nothing org-scoped, and a revoked
 * session is treated as no membership at all. The caller builds the Actor
 * from server-side store reads — never from values the browser supplied.
 *
 * These functions are pure and side-effect free so they can be unit-tested
 * in-process. They are server-side logic by convention; routes must call
 * them after authenticating the caller.
 */

export type CallerKind = "developer" | "employer" | "unrelated" | "operator";

/** Canonical employer workspace roles for this chunk (AUTH-04). */
export type OrgRole = "owner" | "admin" | "reviewer" | "billing";

export type MembershipStatus = "invited" | "active" | "suspended" | "removed";

export interface Actor {
  kind: CallerKind;
  /** Authenticated user id, from the server session — never from the request body. */
  userId: string;
  /** For employers: the organization the caller is acting inside, resolved server-side. */
  orgId?: string;
  orgRole?: OrgRole;
  membershipStatus?: MembershipStatus;
  /** For operators: the declared purpose of this access (audited). */
  operatorPurpose?: string;
  /** For operators: true when this access will be written to the audit log. */
  operatorAudited?: boolean;
  /** For operators touching hidden tests: restricted assessment maintainer flag. */
  assessmentMaintainer?: boolean;
  /** For operators touching billing: restricted billing-support flag. */
  billingSupport?: boolean;
}

export type ResourceKind =
  | "passport_evidence"
  | "submission"
  | "report"
  | "internal_notes"
  | "hidden_tests"
  | "billing"
  | "public_demo";

export interface Resource {
  kind: ResourceKind;
  /** Developer (candidate) who owns the record, when there is one. */
  ownerUserId?: string;
  /** Employer organization the record belongs to, when there is one. */
  orgId?: string;
  /**
   * For passport evidence: the orgs this candidate has authorized a live
   * share grant to, and the fields included. Undefined/empty = private.
   */
  authorizedGrants?: Array<{ orgId: string; fields: string[]; active: boolean }>;
  /** For reports: true when the employer provided a candidate-facing subset. */
  candidateSubsetProvided?: boolean;
  /** For public demo: true when the payload is fictional fixture content. */
  fixtureOnly?: boolean;
}

export type AccessScope =
  | "full"
  | "authorized_scope"
  | "candidate_subset"
  | "rubric_only"
  | "fixtures_only"
  | "none";

export interface AccessDecision {
  allowed: boolean;
  scope: AccessScope;
  /** Stable machine-readable reason for logs and tests. */
  reason: string;
}

function deny(reason: string): AccessDecision {
  return { allowed: false, scope: "none", reason };
}

function allow(scope: AccessScope, reason: string): AccessDecision {
  return { allowed: true, scope, reason };
}

/** AUTH-06: only an active membership confers org-scoped access. */
function hasActiveMembership(actor: Actor): boolean {
  return actor.kind === "employer" && actor.membershipStatus === "active" && !!actor.orgId;
}

/** Operator access is always purpose-limited and audited — no blanket access. */
function operatorGate(actor: Actor): boolean {
  return !!actor.operatorPurpose && actor.operatorAudited === true;
}

function checkPassportEvidence(actor: Actor, resource: Resource): AccessDecision {
  if (actor.kind === "developer") {
    if (resource.ownerUserId && actor.userId === resource.ownerUserId) {
      return allow("full", "developer_owns_record");
    }
    return deny("developer_not_owner");
  }
  if (actor.kind === "employer") {
    if (!hasActiveMembership(actor)) return deny("employer_no_active_membership");
    const grant = (resource.authorizedGrants ?? []).find(
      (g) => g.orgId === actor.orgId && g.active
    );
    if (!grant) return deny("employer_no_authorized_grant");
    return allow("authorized_scope", "employer_authorized_grant");
  }
  if (actor.kind === "operator") {
    if (!operatorGate(actor)) return deny("operator_needs_purpose_and_audit");
    return allow("full", "operator_purpose_limited_audited");
  }
  return deny("unrelated_no_access");
}

function checkSubmission(actor: Actor, resource: Resource): AccessDecision {
  if (actor.kind === "developer") {
    if (resource.ownerUserId && actor.userId === resource.ownerUserId) {
      // Own attempt under the stated policy: full transcript of their own work.
      return allow("full", "developer_own_attempt");
    }
    return deny("developer_not_owner");
  }
  if (actor.kind === "employer") {
    if (!hasActiveMembership(actor)) return deny("employer_no_active_membership");
    if (!resource.orgId || resource.orgId !== actor.orgId) {
      return deny("employer_wrong_organization");
    }
    if (actor.orgRole !== "owner" && actor.orgRole !== "admin" && actor.orgRole !== "reviewer") {
      return deny("employer_role_not_permitted");
    }
    return allow("full", "employer_assigned_org_role");
  }
  if (actor.kind === "operator") {
    if (!operatorGate(actor)) return deny("operator_needs_purpose_and_audit");
    return allow("full", "operator_purpose_limited_audited");
  }
  return deny("unrelated_no_access");
}

function checkReport(actor: Actor, resource: Resource): AccessDecision {
  if (actor.kind === "developer") {
    if (resource.ownerUserId && actor.userId === resource.ownerUserId) {
      if (resource.candidateSubsetProvided) {
        return allow("candidate_subset", "developer_candidate_subset");
      }
      return deny("developer_no_candidate_subset");
    }
    return deny("developer_not_owner");
  }
  if (actor.kind === "employer") {
    if (!hasActiveMembership(actor)) return deny("employer_no_active_membership");
    if (!resource.orgId || resource.orgId !== actor.orgId) {
      return deny("employer_wrong_organization");
    }
    if (actor.orgRole !== "owner" && actor.orgRole !== "admin" && actor.orgRole !== "reviewer") {
      return deny("employer_role_not_permitted");
    }
    return allow("full", "employer_assigned_org_role");
  }
  if (actor.kind === "operator") {
    if (!operatorGate(actor)) return deny("operator_needs_purpose_and_audit");
    return allow("full", "operator_purpose_limited_audited");
  }
  return deny("unrelated_no_access");
}

function checkInternalNotes(actor: Actor, resource: Resource): AccessDecision {
  if (actor.kind === "developer") {
    // No by default; applicable access-rights requests are a separate
    // workflow, never a silent grant.
    return deny("developer_no_default_access");
  }
  if (actor.kind === "employer") {
    if (!hasActiveMembership(actor)) return deny("employer_no_active_membership");
    if (!resource.orgId || resource.orgId !== actor.orgId) {
      return deny("employer_wrong_organization");
    }
    if (actor.orgRole !== "owner" && actor.orgRole !== "admin" && actor.orgRole !== "reviewer") {
      return deny("employer_role_not_permitted");
    }
    return allow("full", "employer_authorized_team");
  }
  if (actor.kind === "operator") {
    if (!operatorGate(actor)) return deny("operator_needs_purpose_and_audit");
    return allow("full", "operator_purpose_limited_audited");
  }
  return deny("unrelated_no_access");
}

function checkHiddenTests(actor: Actor): AccessDecision {
  if (actor.kind === "developer") return deny("candidate_never_sees_hidden_tests");
  if (actor.kind === "employer") {
    if (!hasActiveMembership(actor)) return deny("employer_no_active_membership");
    // Preview rubric, not necessarily secrets: the rubric outline is
    // visible; secret content is never in scope.
    return allow("rubric_only", "employer_rubric_preview_only");
  }
  if (actor.kind === "operator") {
    if (!operatorGate(actor)) return deny("operator_needs_purpose_and_audit");
    if (!actor.assessmentMaintainer) return deny("operator_not_assessment_maintainer");
    return allow("full", "operator_assessment_maintainer");
  }
  return deny("unrelated_no_access");
}

function checkBilling(actor: Actor, resource: Resource): AccessDecision {
  if (actor.kind === "developer") {
    // "No unless workspace billing role": a candidate acting inside a
    // workspace where they hold the billing role may see that workspace's
    // billing. Everyone else is denied.
    if (actor.orgRole === "billing" && actor.membershipStatus === "active" && actor.orgId) {
      if (resource.orgId && resource.orgId !== actor.orgId) {
        return deny("billing_wrong_organization");
      }
      return allow("full", "workspace_billing_role");
    }
    return deny("developer_no_billing_access");
  }
  if (actor.kind === "employer") {
    if (!hasActiveMembership(actor)) return deny("employer_no_active_membership");
    if (!resource.orgId || resource.orgId !== actor.orgId) {
      return deny("employer_wrong_organization");
    }
    // Billing access is explicit: owner/admin do NOT inherit it.
    if (actor.orgRole !== "billing") return deny("billing_role_required_explicit");
    return allow("full", "billing_authorized_member");
  }
  if (actor.kind === "operator") {
    if (!operatorGate(actor)) return deny("operator_needs_purpose_and_audit");
    if (!actor.billingSupport) return deny("operator_not_billing_support");
    return allow("full", "operator_restricted_billing_support");
  }
  return deny("unrelated_no_access");
}

function checkPublicDemo(actor: Actor, resource: Resource): AccessDecision {
  // Everyone — including operators and unrelated visitors — may only ever
  // see fictional fixtures from the demo surface.
  if (resource.fixtureOnly) return allow("fixtures_only", "demo_fixtures_only");
  return deny("demo_must_be_fixtures");
}

/**
 * The access matrix as a function. Returns an explicit allow/deny with the
 * granted scope and a stable reason string. Pure: no I/O, no ambient state.
 */
export function checkAccess(actor: Actor, resource: Resource): AccessDecision {
  switch (resource.kind) {
    case "passport_evidence":
      return checkPassportEvidence(actor, resource);
    case "submission":
      return checkSubmission(actor, resource);
    case "report":
      return checkReport(actor, resource);
    case "internal_notes":
      return checkInternalNotes(actor, resource);
    case "hidden_tests":
      return checkHiddenTests(actor);
    case "billing":
      return checkBilling(actor, resource);
    case "public_demo":
      return checkPublicDemo(actor, resource);
  }
}

/**
 * Convenience: every row of the matrix for one actor/resource pair in a
 * single call, useful for audits.
 */
export function matrixRowFor(
  actor: Actor,
  resource: Resource
): { kind: ResourceKind; decision: AccessDecision } {
  return { kind: resource.kind, decision: checkAccess(actor, resource) };
}
