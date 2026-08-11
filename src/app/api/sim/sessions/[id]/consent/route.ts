import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { getSessionForCandidate } from "@/lib/simulations/db";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  CONSENT_POLICY_VERSION,
  getConsentForInvitation,
  recordConsent,
} from "@/lib/pilot/consent";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const session = await getSessionForCandidate(id, user.id);
    const consent = await getConsentForInvitation(session.invitation_id);
    return NextResponse.json({
      policyVersion: CONSENT_POLICY_VERSION,
      accepted: Boolean(consent),
      consent,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { accepted?: boolean; policyVersion?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (body.accepted !== true) {
    return NextResponse.json({ error: "Consent must be explicitly accepted" }, { status: 400 });
  }
  if (body.policyVersion && body.policyVersion !== CONSENT_POLICY_VERSION) {
    return NextResponse.json(
      { error: "Consent policy version mismatch. Refresh and try again." },
      { status: 409 }
    );
  }

  try {
    const session = await getSessionForCandidate(id, user.id);
    const consent = await recordConsent({
      invitationId: session.invitation_id,
      sessionId: session.id,
      organizationId: session.organization_id,
      candidateUserId: user.id,
    });
    const admin = createAdminSupabaseClient();
    await admin
      .from("sim_sessions")
      .update({ consent_id: consent.id })
      .eq("id", session.id);
    return NextResponse.json({ ok: true, consentId: consent.id, policyVersion: CONSENT_POLICY_VERSION });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not record consent" },
      { status: 400 }
    );
  }
}
