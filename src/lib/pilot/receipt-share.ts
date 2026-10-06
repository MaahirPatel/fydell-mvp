import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hashToken, mintToken } from "@/lib/simulations/db";
import { recordPilotAudit } from "@/lib/pilot/cohort";
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
