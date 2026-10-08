/**
 * Work-sample invitations for one application.
 *
 * GET  - invitations already sent for the application, with status.
 * POST - invite the applicant to one work sample for one named evidence gap.
 *        Body: { roleId, scenarioVersionId, requirementId, uncertainCapability,
 *        whyItMatters, observableWork, deadlineLocal, timeZone }. Repeating
 *        the same application and scenario version returns the existing
 *        invitation instead of sending a second one.
 */
import { NextResponse } from "next/server";
import { csrfGuard } from "@/lib/security/csrf";
import { rateLimit } from "@/lib/security/rate-limit";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { capabilityDeniedMessage, orgCan } from "@/lib/orgs/capabilities";
import { parseWorkSampleInvite } from "@/lib/hiring/evidence-gap";
import { inviteApplicantToWorkSample, listApplicationInvitations, WorkSampleError } from "@/lib/hiring/work-samples";
import { noStore } from "@/lib/hiring/route-auth";
import { recordEvidenceEvent } from "@/lib/profile-evidence/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ appId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function GET(_req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "Your account isn't part of a hiring workspace." }, { status: 403 });
  if (!orgCan(org.role, "view_hiring_work")) return NextResponse.json({ error: capabilityDeniedMessage("view_hiring_work") }, { status: 403 });
  const { appId } = await params;
  if (!UUID.test(appId)) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  return NextResponse.json({ invitations: await listApplicationInvitations(org.organizationId, appId) }, { headers: noStore });
}

export async function POST(req: Request, { params }: Params) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "Your account isn't part of a hiring workspace." }, { status: 403 });
  if (!orgCan(org.role, "manage_candidates")) return NextResponse.json({ error: capabilityDeniedMessage("manage_candidates") }, { status: 403 });
  const { appId } = await params;
  if (!UUID.test(appId)) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  if (!rateLimit(`hiring-work-sample:${user.id}`, 60, 60 * 60 * 1000).ok) {
    return NextResponse.json({ error: "You have sent a lot of invitations this hour. Try again later." }, { status: 429 });
  }
  const body: unknown = await req.json().catch(() => null);
  const roleId = typeof body === "object" && body !== null ? (body as Record<string, unknown>).roleId : null;
  if (typeof roleId !== "string" || !UUID.test(roleId)) return NextResponse.json({ error: "That role is not in your workspace." }, { status: 404 });
  const parsed = parseWorkSampleInvite(body);
  if (parsed.ok === false) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const result = await inviteApplicantToWorkSample(
      { userId: user.id, email: user.email, organizationId: org.organizationId, organizationName: org.organizationName, role: org.role },
      roleId,
      appId,
      parsed.value,
    );
    if (result.created) await recordEvidenceEvent("employer_next_step", { application_id: appId, step: "work_sample_invite" }, org.organizationId);
    return NextResponse.json(result, { status: result.created ? 201 : 200, headers: noStore });
  } catch (err) {
    if (err instanceof WorkSampleError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Could not send the invitation. Nothing was sent; try again." }, { status: 500 });
  }
}
