import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { listVerifications, requestVerification } from "@/lib/employer/review";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { csrfGuard } from "@/lib/security/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET: list verification requests for this review.
 * POST: request targeted verification for a requirement.
 * Body: { prompt, mappingId?, candidateUserId }
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roleId: string; shareId: string }> }
) {
  const { roleId, shareId } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "No organization" }, { status: 403 });
  try {
    return NextResponse.json({ verifications: await listVerifications(org.organizationId, roleId, shareId) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load." }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roleId: string; shareId: string }> }
) {
  const blocked = await csrfGuard(req);
  if (blocked) return blocked;
  const { roleId, shareId } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "No organization" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as {
    prompt?: unknown;
    mappingId?: unknown;
  } | null;
  const prompt = typeof body?.prompt === "string" ? body.prompt : "";
  const mappingId = typeof body?.mappingId === "string" ? body.mappingId : null;

  // Resolve the candidate from the share → passport → owner.
  const db = createAdminSupabaseClient();
  const { data: share } = await db
    .from("passport_shares")
    .select("id, passport_id, passports!inner(owner_id)")
    .eq("id", shareId)
    .maybeSingle();
  if (!share) return NextResponse.json({ error: "Unknown share." }, { status: 404 });
  const shareRow = share as unknown as { passports: { owner_id: string } | { owner_id: string }[] };
  const passport = Array.isArray(shareRow.passports) ? shareRow.passports[0] : shareRow.passports;
  if (!passport?.owner_id) return NextResponse.json({ error: "Unknown share." }, { status: 404 });
  const candidateUserId = passport.owner_id;

  try {
    const verification = await requestVerification({
      organizationId: org.organizationId,
      mappingId,
      roleId,
      shareId,
      candidateUserId,
      prompt,
      requestedBy: user.id,
    });
    return NextResponse.json({ ok: true, verification });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not request verification." }, { status: 400 });
  }
}
