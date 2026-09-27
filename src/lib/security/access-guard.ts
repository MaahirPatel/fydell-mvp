import "server-only";

/**
 * Cross-tenant access policy (SEC-06 / DATA-02).
 *
 * Pure, side-effect-free rules used by every server access path (API routes,
 * storage downloads, exports). The database grants/RLS are the second layer;
 * this is the server-side authorization check the checklist requires.
 *
 * Visibility model (from the required access matrix):
 *  - Candidate-owned evidence: the owning candidate, plus employer members of
 *    organizations the candidate explicitly shared with (share scope).
 *  - Employer-specific attempt data: members of the owning organization only.
 *  - Employer-private notes/decisions: org members with reviewer role or above.
 *  - Billing: org members with owner/admin role only.
 *  - Demo fixtures: everyone sees the same fictional fixtures; fixtures can
 *    never be mixed into real records (see ops/demo-isolation).
 */

export type RecordKind =
  | "candidate_evidence"
  | "attempt"
  | "employer_report"
  | "reviewer_note"
  | "billing"
  | "demo_fixture";

export type AccessPath = "api" | "storage" | "export" | "realtime";

export interface Actor {
  userId: string | null; // null = unauthenticated
  organizationIds: string[]; // active memberships
  billingRoles: Record<string, "owner" | "admin" | "member" | "reviewer">;
  candidateId: string | null; // the candidate profile this user owns, if any
  revoked: boolean; // removed member / revoked access
  isOperator: boolean; // purpose-limited, audited operator access
}

export interface GuardedRecord {
  kind: RecordKind;
  ownerCandidateId: string | null;
  organizationId: string | null;
  /** org ids the candidate explicitly shared this record with */
  sharedWithOrgIds: string[];
  /** reviewer notes require at least this role */
  minRole?: "member" | "reviewer" | "admin" | "owner";
}

const ROLE_RANK: Record<string, number> = { member: 0, reviewer: 1, admin: 2, owner: 3 };

export interface AccessDecision {
  allowed: boolean;
  reason: string;
}

export function checkAccess(actor: Actor, record: GuardedRecord, _path: AccessPath): AccessDecision {
  // Public demo fixtures are fictional and visible to everyone, including
  // anonymous visitors (DEMO-05). They can never be mixed into real records.
  if (record.kind === "demo_fixture") {
    return { allowed: true, reason: "demo_fixture_public" };
  }
  if (!actor.userId) return { allowed: false, reason: "unauthenticated" };
  if (actor.revoked) return { allowed: false, reason: "access_revoked" };

  switch (record.kind) {
    case "candidate_evidence": {
      if (record.ownerCandidateId && actor.candidateId === record.ownerCandidateId) {
        return { allowed: true, reason: "owner" };
      }
      const shared = actor.organizationIds.some((org) => record.sharedWithOrgIds.includes(org));
      if (shared) return { allowed: true, reason: "shared_scope" };
      if (actor.isOperator) return { allowed: true, reason: "operator_purpose_limited" };
      return { allowed: false, reason: "not_owner_or_shared" };
    }

    case "attempt":
    case "employer_report": {
      if (!record.organizationId) return { allowed: false, reason: "no_organization" };
      if (record.ownerCandidateId && actor.candidateId === record.ownerCandidateId) {
        return { allowed: true, reason: "candidate_own_attempt" };
      }
      if (actor.organizationIds.includes(record.organizationId)) {
        return { allowed: true, reason: "org_member" };
      }
      if (actor.isOperator) return { allowed: true, reason: "operator_purpose_limited" };
      return { allowed: false, reason: "cross_organization" };
    }

    case "reviewer_note": {
      if (!record.organizationId) return { allowed: false, reason: "no_organization" };
      if (!actor.organizationIds.includes(record.organizationId)) {
        return { allowed: false, reason: "cross_organization" };
      }
      const rank = ROLE_RANK[actor.billingRoles[record.organizationId] ?? "member"] ?? 0;
      const need = ROLE_RANK[record.minRole ?? "reviewer"] ?? 1;
      if (rank >= need) return { allowed: true, reason: "org_role" };
      return { allowed: false, reason: "insufficient_role" };
    }

    case "billing": {
      if (!record.organizationId) return { allowed: false, reason: "no_organization" };
      const role = actor.billingRoles[record.organizationId];
      if (role === "owner" || role === "admin") return { allowed: true, reason: "billing_role" };
      return { allowed: false, reason: "not_billing_authorized" };
    }
  }
}

/** Convenience: throw a 403-shaped error when access is denied. */
export function assertAccess(actor: Actor, record: GuardedRecord, path: AccessPath): void {
  const decision = checkAccess(actor, record, path);
  if (!decision.allowed) {
    const err = new Error(`Access denied: ${decision.reason}`);
    (err as { status?: number }).status = 403;
    throw err;
  }
}
