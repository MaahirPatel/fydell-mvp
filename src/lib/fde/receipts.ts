import "server-only";
import { createHash, randomBytes } from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/fde/lifecycle";

export function mintShareToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashShareToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const RECEIPT_NUMBER_RE = /^WR-\d{4}-\d{6}$/;

/** Pure — receipt numbers are `WR-{year}-{6-digit sequence}`, e.g. WR-2026-000123. */
export function formatReceiptNumber(date: Date, sequence: number): string {
  const year = date.getUTCFullYear();
  const seq = String(Math.max(1, sequence)).padStart(6, "0");
  return `WR-${year}-${seq}`;
}

export type WorkReceiptRow = {
  id: string;
  receipt_number: string;
  fde_user_id: string;
  session_id: string;
  mission_id: string;
  version: number;
  status: string;
  context_summary: string | null;
  evidence_summary: string | null;
  limitations: string | null;
  issued_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

async function nextReceiptSequence(admin: ReturnType<typeof createAdminSupabaseClient>, year: number): Promise<number> {
  const { count } = await admin
    .from("work_receipts")
    .select("id", { count: "exact", head: true })
    .like("receipt_number", `WR-${year}-%`);
  return (count || 0) + 1;
}

function summarizeFindings(findings: Array<{ dimension: string; observation: string; interpretation: string; limitation: string | null }>) {
  if (findings.length === 0) {
    return { evidenceSummary: "No evidence findings were generated for this session.", limitations: null };
  }
  const evidenceSummary = findings
    .map((f) => `${f.dimension.replace(/_/g, " ")}: ${f.observation} ${f.interpretation}`.trim())
    .join("\n");
  const limitations = Array.from(new Set(findings.map((f) => f.limitation).filter(Boolean))).join("\n");
  return { evidenceSummary, limitations: limitations || null };
}

/** Idempotent — calling this again on the same session returns the existing receipt. */
export async function issueReceiptFromSession(sessionId: string, userId: string): Promise<WorkReceiptRow> {
  const admin = createAdminSupabaseClient();

  const { data: existing } = await admin
    .from("work_receipts")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (existing) return existing as WorkReceiptRow;

  const { data: session } = await admin.from("relay_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!session) throw new Error("Session not found.");
  if (session.fde_user_id !== userId) throw new Error("Forbidden.");
  if (session.status !== "receipt_ready") {
    throw new Error("This session's evidence isn't ready yet.");
  }

  const { data: mission } = await admin
    .from("fde_missions")
    .select("title, objective")
    .eq("id", session.mission_id)
    .maybeSingle();

  const { data: findings } = await admin
    .from("fde_evidence_findings")
    .select("dimension, observation, interpretation, limitation")
    .eq("session_id", sessionId);

  const { evidenceSummary, limitations } = summarizeFindings(findings || []);
  const now = new Date();
  const sequence = await nextReceiptSequence(admin, now.getUTCFullYear());
  const receiptNumber = formatReceiptNumber(now, sequence);

  const { data: receipt, error } = await admin
    .from("work_receipts")
    .insert({
      receipt_number: receiptNumber,
      fde_user_id: userId,
      session_id: sessionId,
      mission_id: session.mission_id,
      status: "issued",
      context_summary: mission?.title ? `${mission.title} — ${mission.objective || ""}`.trim() : null,
      evidence_summary: evidenceSummary,
      limitations,
      issued_at: now.toISOString(),
    })
    .select("*")
    .single();
  if (error || !receipt) throw new Error(error?.message || "Could not issue receipt.");

  await audit(userId, "work_receipt.issued", "work_receipt", receipt.id, { sessionId });
  return receipt as WorkReceiptRow;
}

export async function getReceiptForOwner(receiptId: string, userId: string) {
  const admin = createAdminSupabaseClient();
  const { data: receipt } = await admin.from("work_receipts").select("*").eq("id", receiptId).maybeSingle();
  if (!receipt) throw new Error("Receipt not found.");
  if (receipt.fde_user_id !== userId) throw new Error("Forbidden.");

  const { data: permissions } = await admin
    .from("receipt_permissions")
    .select("id, recipient_organization_id, recipient_user_id, purpose, granted_at, expires_at, revoked_at, last_accessed_at, access_count, share_token_hash")
    .eq("receipt_id", receiptId)
    .order("granted_at", { ascending: false });

  const { data: findings } = await admin
    .from("fde_evidence_findings")
    .select("*")
    .eq("session_id", receipt.session_id);

  return {
    receipt: receipt as WorkReceiptRow,
    findings: findings || [],
    permissions: (permissions || []).map((p) => ({
      id: p.id,
      recipientOrganizationId: p.recipient_organization_id,
      recipientUserId: p.recipient_user_id,
      purpose: p.purpose,
      grantedAt: p.granted_at,
      expiresAt: p.expires_at,
      revokedAt: p.revoked_at,
      lastAccessedAt: p.last_accessed_at,
      accessCount: p.access_count,
      hasToken: Boolean(p.share_token_hash),
    })),
  };
}

export async function shareReceipt(
  receiptId: string,
  ownerUserId: string,
  opts: { purpose?: string; expiresInDays?: number } = {}
) {
  const admin = createAdminSupabaseClient();
  const { data: receipt } = await admin.from("work_receipts").select("*").eq("id", receiptId).maybeSingle();
  if (!receipt) throw new Error("Receipt not found.");
  if (receipt.fde_user_id !== ownerUserId) throw new Error("Forbidden.");
  if (receipt.status !== "issued") throw new Error("Only issued receipts can be shared.");

  const token = mintShareToken();
  const tokenHash = hashShareToken(token);
  const expiresAt = opts.expiresInDays
    ? new Date(Date.now() + opts.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data: permission, error } = await admin
    .from("receipt_permissions")
    .insert({
      receipt_id: receiptId,
      owner_user_id: ownerUserId,
      share_token_hash: tokenHash,
      purpose: opts.purpose || "hiring_review",
      expires_at: expiresAt,
    })
    .select("*")
    .single();
  if (error || !permission) throw new Error(error?.message || "Could not share receipt.");

  await audit(ownerUserId, "work_receipt.shared", "receipt_permission", permission.id, { receiptId });

  return { permission, token, shareUrl: `/r/${token}` };
}

export async function revokePermission(permissionId: string, ownerUserId: string) {
  const admin = createAdminSupabaseClient();
  const { data: permission } = await admin
    .from("receipt_permissions")
    .select("*")
    .eq("id", permissionId)
    .maybeSingle();
  if (!permission) throw new Error("Permission not found.");
  if (permission.owner_user_id !== ownerUserId) throw new Error("Forbidden.");
  if (permission.revoked_at) return permission;

  const { data: updated, error } = await admin
    .from("receipt_permissions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", permissionId)
    .select("*")
    .single();
  if (error || !updated) throw new Error(error?.message || "Could not revoke permission.");

  await audit(ownerUserId, "work_receipt.permission_revoked", "receipt_permission", permissionId, {});
  return updated;
}

export async function getReceiptIfPermitted(shareToken: string) {
  const admin = createAdminSupabaseClient();
  const tokenHash = hashShareToken(shareToken);
  const { data: permission } = await admin
    .from("receipt_permissions")
    .select("*")
    .eq("share_token_hash", tokenHash)
    .maybeSingle();
  if (!permission) throw new Error("This link is invalid.");
  if (permission.revoked_at) throw new Error("This link has been revoked.");
  if (permission.expires_at && new Date(permission.expires_at) < new Date()) {
    throw new Error("This link has expired.");
  }

  const { data: receipt } = await admin
    .from("work_receipts")
    .select("*")
    .eq("id", permission.receipt_id)
    .maybeSingle();
  if (!receipt || receipt.status === "revoked") throw new Error("This receipt is no longer available.");

  const { data: findings } = await admin
    .from("fde_evidence_findings")
    .select("dimension, observation, interpretation, confidence, limitation")
    .eq("session_id", receipt.session_id);

  const { data: mission } = await admin
    .from("fde_missions")
    .select("title")
    .eq("id", receipt.mission_id)
    .maybeSingle();

  await admin
    .from("receipt_permissions")
    .update({
      last_accessed_at: new Date().toISOString(),
      access_count: (permission.access_count || 0) + 1,
    })
    .eq("id", permission.id);

  return {
    receipt: receipt as WorkReceiptRow,
    findings: findings || [],
    missionTitle: mission?.title || null,
    purpose: permission.purpose,
  };
}
