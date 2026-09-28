/**
 * POST /api/employer/invitations — create a candidate assessment invitation (EMP-05).
 *
 * Creates a DRAFT invitation: nothing is sent. The response includes the
 * one-time plaintext token needed for the deliberate send call
 * (POST /api/employer/invitations/[id]/send). The token is never stored and
 * never returned again.
 *
 * State rules are enforced by src/lib/invitations/* (tested in-process).
 * Store persistence is NEEDS-LIVE (in-memory here; Supabase next).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import {
  createCandidateInvitation,
} from "@/lib/invitations/candidate-invites";
import type { VersionRegistry } from "@/lib/invitations/config-freeze";
import { appUrl, getEmployerStores, pinLiveTemplateVersion } from "../_lib/employer-stores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "No organization" }, { status: 403 });

  let body: {
    templateId?: string;
    roleKey?: string;
    candidateEmail?: string;
    candidateName?: string | null;
    expiresInDays?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Pin the live template's current scenario/rubric versions at creation
  // (EMP-03). Later template edits cannot alter this invitation's attempt.
  const pinned = await pinLiveTemplateVersion(String(body.templateId ?? ""));
  if (!pinned) {
    return NextResponse.json(
      { error: "Assessment template not found or not published." },
      { status: 404 }
    );
  }
  const registry: VersionRegistry = {
    getVersion: () => null,
    currentScenarioVersionId: () => pinned.scenarioVersionId,
    currentRubricVersionId: () => pinned.rubricVersionId,
  };

  const { invites, audit } = getEmployerStores();
  const result = createCandidateInvitation(invites, audit, {
    orgId: org.organizationId,
    templateId: String(body.templateId),
    roleKey: String(body.roleKey ?? ""),
    candidateEmail: String(body.candidateEmail ?? ""),
    candidateName: body.candidateName ?? null,
    createdBy: user.id,
    expiresInDays: body.expiresInDays,
    registry,
  });
  if (result.ok === false) {
    const status =
      result.code === "invalid_email" ? 400 : result.code === "not_found" ? 404 : 409;
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status }
    );
  }
  const { invitation, token, duplicate } = result.value;
  return NextResponse.json({
    ok: true,
    duplicate,
    invitation: {
      id: invitation.id,
      state: invitation.state,
      deliveryStatus: invitation.deliveryStatus,
      candidateEmail: invitation.candidateEmail,
      scenarioVersionId: invitation.pinned.scenarioVersionId,
      rubricVersionId: invitation.pinned.rubricVersionId,
      expiresAt: invitation.expiresAt,
    },
    // One-time only. The employer needs it for the deliberate send call and
    // the copyable secure invite link; it is never stored or returned again.
    token: duplicate ? undefined : token,
    inviteUrl: duplicate ? undefined : `${appUrl()}/invite/${token}`,
    next: duplicate
      ? "An active invitation already covers this candidate; no duplicate was created."
      : "Invitation created as a draft. Call POST /api/employer/invitations/[id]/send with the token to deliberately send it.",
  });
}
