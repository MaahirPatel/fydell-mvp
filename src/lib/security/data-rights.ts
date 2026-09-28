import "server-only";

/**
 * Data-subject request model: export / correction / deletion (SEC-09).
 *
 * Manual authenticated requests are acceptable initially if they are
 * fulfillable and traceable. This module owns:
 *  - the request state machine (mirrors migration 030 data_subject_requests),
 *  - the fulfillment checklist builder that traces a subject's data through
 *    every surface: database tables, object storage, background jobs/search
 *    indexes, and third-party vendors,
 *  - the backup-expiry note that must accompany every deletion fulfillment.
 *
 * Live vendor tracing (asking Stripe/Resend/Supabase to confirm deletion)
 * requires production credentials and is marked NEEDS-LIVE in docs.
 */

export type DataRequestType = "export" | "correction" | "deletion";
export type DataRequestStatus =
  | "received"
  | "identity_verified"
  | "tracing"
  | "fulfilling"
  | "fulfilled"
  | "rejected";

const TRANSITIONS: Record<DataRequestStatus, DataRequestStatus[]> = {
  received: ["identity_verified", "rejected"],
  identity_verified: ["tracing", "rejected"],
  tracing: ["fulfilling", "rejected"],
  fulfilling: ["fulfilled", "rejected"],
  fulfilled: [],
  rejected: [],
};

export function canTransitionRequest(from: DataRequestStatus, to: DataRequestStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export interface ChecklistItem {
  surface: "database" | "object_storage" | "jobs_indexes" | "vendors" | "backups";
  location: string;
  action: string;
  notes: string;
  vendorTracingLive: boolean; // false => manual vendor step, NEEDS-LIVE to automate
}

/**
 * Builds the fulfillment checklist for a request. Every item names the
 * concrete surface; vendor items are flagged for manual/live tracing.
 */
export function buildFulfillmentChecklist(
  requestType: DataRequestType,
  subjectUserId: string
): ChecklistItem[] {
  const action =
    requestType === "export"
      ? "Include in export package"
      : requestType === "correction"
        ? "Apply correction and record provenance"
        : "Delete or irreversibly anonymize";
  void subjectUserId;

  return [
    {
      surface: "database",
      location: "public.profiles, public.developer_profiles (user-owned evidence)",
      action,
      notes: "Candidate-owned passport/evidence rows keyed by user id.",
      vendorTracingLive: true,
    },
    {
      surface: "database",
      location: "public.sim_sessions, submissions, artifacts, evaluation runs/results",
      action,
      notes: "Employer-specific attempt data; deletion keeps anonymized aggregates only where disclosed.",
      vendorTracingLive: true,
    },
    {
      surface: "database",
      location: "public.organization_members, invites, audit events",
      action: requestType === "deletion" ? "Anonymize member row; keep tombstone for audit" : action,
      notes: "Membership/audit rows may be retained in anonymized form per retention schedule.",
      vendorTracingLive: true,
    },
    {
      surface: "object_storage",
      location: "private artifact buckets (source ZIPs, transcripts, reports, hidden tests)",
      action,
      notes: "Enumerate objects by user prefix; delete or re-encrypt with destroyed key.",
      vendorTracingLive: true,
    },
    {
      surface: "jobs_indexes",
      location: "background job queues, search indexes, realtime presence",
      action: requestType === "deletion" ? "Purge queued payloads and index documents" : action,
      notes: "Durable job payloads and search documents keyed by user id.",
      vendorTracingLive: true,
    },
    {
      surface: "vendors",
      location: "Stripe (customer + payment records), Resend (email logs), Supabase Auth",
      action: requestType === "deletion" ? "Request erasure via vendor privacy tooling" : "Export via vendor dashboard/API",
      notes: "Vendor-side data is outside Fydell's database; trace manually until automated.",
      vendorTracingLive: false,
    },
    {
      surface: "backups",
      location: "database + object backups",
      action: "Document expiry; do not restore subject data from backup",
      notes: "Backups expire on the retention schedule; deletion from backups happens by expiry, not surgical edit.",
      vendorTracingLive: false,
    },
  ];
}

export const BACKUP_EXPIRY_NOTE =
  "Deletion is fulfilled against live systems immediately. Encrypted backups " +
  "expire on the documented retention schedule (see docs/RETENTION_SCHEDULE.md); " +
  "subject data is never restored from backup after fulfillment.";

export interface DataRequestRecord {
  id: string;
  requesterUserId: string;
  requestType: DataRequestType;
  status: DataRequestStatus;
  checklist: ChecklistItem[];
}

/** Creates a new request in the `received` state with its checklist attached. */
export function openDataRequest(
  id: string,
  requesterUserId: string,
  requestType: DataRequestType
): DataRequestRecord {
  return {
    id,
    requesterUserId,
    requestType,
    status: "received",
    checklist: buildFulfillmentChecklist(requestType, requesterUserId),
  };
}
