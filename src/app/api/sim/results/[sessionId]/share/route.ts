import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { issueCredential } from "@/lib/simulations/db";
import { appUrl } from "@/lib/app-url";
import {
  createReceiptShare,
  normalizeAllowedFields,
  RECEIPT_FIELD_CATALOG,
  revokeReceiptShare,
} from "@/lib/pilot/receipt-share";

export const runtime = "nodejs";

/**
 * POST: create a field-scoped, expiring Work Receipt share (token hash only in DB).
 * DELETE: revoke a share by shareId.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    allowedFields?: string[];
    audienceLabel?: string;
    expiresInDays?: number;
  } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const admin = createAdminSupabaseClient();
  const { data: session } = await admin
    .from("sim_sessions")
    .select("id, candidate_user_id, status")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.candidate_user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: run } = await admin
    .from("sim_analysis_runs")
    .select("id")
    .eq("session_id", sessionId)
    .eq("status", "complete")
    .maybeSingle();
  if (!run) {
    return NextResponse.json({ error: "Result is not ready yet" }, { status: 409 });
  }

  try {
    await issueCredential(sessionId);
  } catch {
    // may already exist
  }

  const { data: credential } = await admin
    .from("sim_credentials")
    .select("id, credential_number")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (!credential) {
    return NextResponse.json({ error: "Credential not issued yet" }, { status: 409 });
  }

  try {
    const share = await createReceiptShare({
      credentialId: credential.id,
      sessionId,
      candidateUserId: user.id,
      audienceLabel: body.audienceLabel || "Authorized viewer",
      allowedFields: normalizeAllowedFields(body.allowedFields),
      expiresInDays: typeof body.expiresInDays === "number" ? body.expiresInDays : 30,
    });

    await admin
      .from("sim_credentials")
      .update({
        share_token_hash: null,
        visibility: "private",
        updated_at: new Date().toISOString(),
      })
      .eq("id", credential.id);

    return NextResponse.json({
      ok: true,
      shareId: share.shareId,
      token: share.token,
      recordUrl: `${appUrl()}/record/${share.token}`,
      expiresAt: share.expiresAt,
      allowedFields: RECEIPT_FIELD_CATALOG,
      credentialNumber: credential.credential_number,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create share" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let shareId: string | null = null;
  try {
    const body = await req.json();
    shareId = typeof body.shareId === "string" ? body.shareId : null;
  } catch {
    shareId = null;
  }
  if (!shareId) {
    return NextResponse.json({ error: "shareId required" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: session } = await admin
    .from("sim_sessions")
    .select("candidate_user_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.candidate_user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await revokeReceiptShare(shareId, user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not revoke" },
      { status: 400 }
    );
  }
}
