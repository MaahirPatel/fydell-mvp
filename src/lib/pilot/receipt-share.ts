import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hashToken, mintToken } from "@/lib/simulations/db";
import { recordPilotAudit } from "@/lib/pilot/cohort";
import { recordAvoidedWork } from "@/lib/pilot/avoided-work";
import {
  normalizeAllowedFields,
  RECEIPT_FIELD_CATALOG,
  type ReceiptField,
} from "@/lib/pilot/receipt-fields";

export { normalizeAllowedFields, RECEIPT_FIELD_CATALOG };
export type { ReceiptField };

export async function createReceiptShare(input: {
  credentialId: string;
  sessionId: string;
  candidateUserId: string;
  audienceLabel: string;
  allowedFields: ReceiptField[];
  expiresInDays: number;
}): Promise<{ token: string; shareId: string; expiresAt: string }> {
  const db = createAdminSupabaseClient();
  const token = mintToken();
  const expiresAt = new Date(
    Date.now() + Math.min(90, Math.max(1, input.expiresInDays)) * 86400000
  ).toISOString();

  const { data, error } = await db
    .from("sim_receipt_shares")
    .insert({
      credential_id: input.credentialId,
      session_id: input.sessionId,
      candidate_user_id: input.candidateUserId,
      token_hash: hashToken(token),
      audience_label: input.audienceLabel.slice(0, 200),
      allowed_fields: input.allowedFields,
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Could not create share: ${error.message}`);

  await recordPilotAudit({
    actorUserId: input.candidateUserId,
    action: "receipt_share_created",
    entityType: "sim_receipt_share",
    entityId: data.id,
    payload: { expiresAt, fields: input.allowedFields },
  });

  return { token, shareId: data.id as string, expiresAt };
}

export async function revokeReceiptShare(
  shareId: string,
  candidateUserId: string
): Promise<void> {
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from("sim_receipt_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", shareId)
    .eq("candidate_user_id", candidateUserId)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Share not found or already revoked");
  await recordPilotAudit({
    actorUserId: candidateUserId,
    action: "receipt_share_revoked",
    entityType: "sim_receipt_share",
    entityId: shareId,
  });
}

export async function resolveReceiptShare(token: string): Promise<
  | { ok: true; share: Record<string, unknown> }
  | { ok: false; reason: "not_found" | "expired" | "revoked" }
> {
  const db = createAdminSupabaseClient();
  const { data: share } = await db
    .from("sim_receipt_shares")
    .select("*")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!share) {
    return { ok: false, reason: "not_found" };
  }
  if (share.revoked_at) {
    await db.from("sim_receipt_share_access").insert({
      share_id: share.id,
      result: "revoked",
    });
    return { ok: false, reason: "revoked" };
  }
  if (new Date(share.expires_at) < new Date()) {
    await db.from("sim_receipt_share_access").insert({
      share_id: share.id,
      result: "expired",
    });
    return { ok: false, reason: "expired" };
  }
  await db.from("sim_receipt_share_access").insert({
    share_id: share.id,
    result: "allowed",
  });
  return { ok: true, share };
}

export type ReceiptAcceptance = {
  id: string;
  organizationId: string;
  shareId: string;
  candidateUserId: string;
  sessionId: string;
  acceptedBy: string | null;
  notes: string;
  acceptedAt: string;
};

/**
 * Accept a shared receipt as evidence in the accepting org's hiring process.
 *
 * The share must be valid (not expired/revoked). The acceptance is
 * idempotent per org per share — re-accepting returns the existing record.
 * The candidate's data is not copied; the share link remains the source of
 * truth under its own expiry/revocation.
 */
export async function acceptReceiptShare(input: {
  organizationId: string;
  acceptedBy: string;
  shareToken: string;
  notes?: string;
}): Promise<{ ok: true; acceptance: ReceiptAcceptance; alreadyAccepted: boolean } | { ok: false; reason: string }> {
  const resolved = await resolveReceiptShare(input.shareToken);
  if (resolved.ok === false) {
    return { ok: false, reason: `The shared results are ${resolved.reason}. Ask the candidate for a fresh link.` };
  }
  const share = resolved.share as {
    id: string;
    candidate_user_id: string;
    session_id: string;
  };

  const notes = (input.notes ?? "").trim().slice(0, 2000);
  const db = createAdminSupabaseClient();

  // Idempotent: return existing acceptance if this org already accepted.
  const { data: existing } = await db
    .from("employer_receipt_acceptances")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("share_id", share.id)
    .maybeSingle();
  if (existing) {
    const e = existing as Record<string, string>;
    return {
      ok: true,
      acceptance: {
        id: e.id,
        organizationId: e.organization_id,
        shareId: e.share_id,
        candidateUserId: e.candidate_user_id,
        sessionId: e.session_id,
        acceptedBy: e.accepted_by,
        notes: e.notes,
        acceptedAt: e.accepted_at,
      },
      alreadyAccepted: true,
    };
  }

  const { data, error } = await db
    .from("employer_receipt_acceptances")
    .insert({
      organization_id: input.organizationId,
      share_id: share.id,
      candidate_user_id: share.candidate_user_id,
      session_id: share.session_id,
      accepted_by: input.acceptedBy,
      notes,
    })
    .select("*")
    .single();
  if (error || !data) return { ok: false, reason: "Could not record the acceptance." };

  const row = data as Record<string, string>;
  await recordPilotAudit({
    action: "receipt_accepted",
    entityType: "employer_receipt_acceptance",
    entityId: row.id,
    payload: {
      organizationId: input.organizationId,
      shareId: share.id,
      candidateUserId: share.candidate_user_id,
    },
  });

  // §11/§29: accepting existing evidence avoided a new assessment.
  await recordAvoidedWork({
    organizationId: input.organizationId,
    candidateUserId: share.candidate_user_id,
    kind: "receipt_accepted",
    avoided: "full_assessment",
    sourceId: row.id,
    sourceKind: "employer_receipt_acceptance",
    recordedBy: input.acceptedBy,
    idempotencyKey: `receipt_accepted:${row.id}`,
  });

  return {
    ok: true,
    acceptance: {
      id: row.id,
      organizationId: row.organization_id,
      shareId: row.share_id,
      candidateUserId: row.candidate_user_id,
      sessionId: row.session_id,
      acceptedBy: row.accepted_by,
      notes: row.notes,
      acceptedAt: row.accepted_at,
    },
    alreadyAccepted: false,
  };
}

/** List receipts an org has accepted, newest first. */
export async function listAcceptedReceipts(organizationId: string): Promise<ReceiptAcceptance[]> {
  const db = createAdminSupabaseClient();
  const { data } = await db
    .from("employer_receipt_acceptances")
    .select("*")
    .eq("organization_id", organizationId)
    .order("accepted_at", { ascending: false });
  return ((data ?? []) as Record<string, string>[]).map((r) => ({
    id: r.id,
    organizationId: r.organization_id,
    shareId: r.share_id,
    candidateUserId: r.candidate_user_id,
    sessionId: r.session_id,
    acceptedBy: r.accepted_by,
    notes: r.notes,
    acceptedAt: r.accepted_at,
  }));
}
