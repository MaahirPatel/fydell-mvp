/**
 * POST /api/auth/invitations/accept — deliberate invitation acceptance.
 *
 * Non-UI logic only. The request body carries exactly one field: the
 * invitation `token`. The organization id and role come from the stored
 * invitation row, never from the request — there is no field to spoof.
 * The caller is authenticated via `requireUser` (cookie or Bearer); the
 * authenticated user's email must match the invited address or acceptance
 * is refused (no silent domain-based membership).
 *
 * The token verification round-trip against the live database requires
 * Supabase; that path is NEEDS-LIVE. All state rules are enforced by
 * src/lib/orgs/invitations.ts and tested in-process.
 */

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import {
  acceptInvitation,
  createInvitationMemoryStore,
  type InvitationStore,
} from "@/lib/orgs/invitations";
import {
  createMemoryStore,
  type MembershipStore,
} from "@/lib/orgs/membership";

export const dynamic = "force-dynamic";

/**
 * Production wiring loads these stores from Supabase (organization_members
 * + invitation rows keyed by token hash). That round-trip needs live
 * Supabase and is not exercised here; the acceptance rules themselves live
 * in the lib and are covered by scripts/test-accounts-grind-invitations.ts.
 */
function getStores(): { members: MembershipStore; invites: InvitationStore } {
  // NEEDS-LIVE: replace with Supabase-backed stores.
  return { members: createMemoryStore(), invites: createInvitationMemoryStore() };
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const token = String((body as { token?: unknown }).token || "");
  if (!token) {
    return NextResponse.json({ error: "Invitation token is required." }, { status: 400 });
  }

  const { members, invites } = getStores();
  // Note: only the token travels from the client. acceptInvitation resolves
  // the organization and role from the stored invitation row and matches the
  // authenticated user's email — deliberate acceptance, no org-id spoofing,
  // no domain-based auto-join.
  const result = acceptInvitation(members, invites, user.id, user.email, token);
  if (!result.ok) {
    const status =
      result.code === "token_not_found"
        ? 404
        : result.code === "email_mismatch"
          ? 403
          : 409;
    return NextResponse.json({ error: result.message, code: result.code }, { status });
  }
  return NextResponse.json({
    ok: true,
    organizationId: result.value.orgId,
    role: result.value.role,
  });
}
