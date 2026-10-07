import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { askQuestion, authorizeReviewScope, notifyQuestionAsked, updateQuestionState, validateDueDate } from "@/lib/employer/review";
import { capabilityDeniedMessage, orgCan } from "@/lib/orgs/capabilities";
import { csrfGuard } from "@/lib/security/csrf";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorize(req: NextRequest, params: Promise<{ roleId: string; shareId: string }>) {
  const blocked = csrfGuard(req);
  if (blocked) return { response: blocked } as const;
  const { roleId, shareId } = await params;
  const user = await requireUser();
  if (!user) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  const org = await requireOrgMember(user.id);
  if (!org) return { response: NextResponse.json({ error: "No organization" }, { status: 403 }) } as const;
  if (!orgCan(org.role, "record_decisions")) {
    return { response: NextResponse.json({ error: capabilityDeniedMessage("record_decisions") }, { status: 403 }) } as const;
  }
  const scope = await authorizeReviewScope(org.organizationId, roleId, shareId);
  if (!scope) return { response: NextResponse.json({ error: "Review not found." }, { status: 404 }) } as const;
  return { user, org, scope, roleId, shareId } as const;
}

/**
 * POST /api/employer/review/[roleId]/[shareId]/questions
 * Ask a follow-up question, optionally tied to one requirement assessment.
 * Body: { question, mappingId?, dueAt?, clientRequestId? }
 * The same clientRequestId returns the question already created.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ roleId: string; shareId: string }> }) {
  const auth = await authorize(req, params);
  if ("response" in auth) return auth.response;
  const { user, org, scope, roleId, shareId } = auth;

  let body: { question?: unknown; mappingId?: unknown; dueAt?: unknown; clientRequestId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const mappingId = typeof body.mappingId === "string" && body.mappingId ? body.mappingId : null;
  if (mappingId) {
    const { data } = await createAdminSupabaseClient()
      .from("requirement_evidence_mappings")
      .select("id")
      .eq("id", mappingId)
      .eq("organization_id", org.organizationId)
      .eq("role_id", roleId)
      .eq("share_id", shareId)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: "That requirement assessment is not part of this review." }, { status: 400 });
  }
  const due = validateDueDate(body.dueAt);
  if (due.ok === false) return NextResponse.json({ error: due.error }, { status: 400 });

  try {
    const { question, created } = await askQuestion({
      organizationId: org.organizationId,
      mappingId,
      roleId,
      shareId,
      question: typeof body.question === "string" ? body.question : "",
      askedBy: user.id,
      dueAt: due.dueAt,
      clientRequestId: typeof body.clientRequestId === "string" ? body.clientRequestId : null,
    });
    if (created) await notifyQuestionAsked(scope);
    return NextResponse.json({ ok: true, question, created });
  } catch (e) {
    const message = e instanceof Error && e.message.startsWith("Question must") ? e.message : "Could not send the question. Your draft is kept; try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * PATCH /api/employer/review/[roleId]/[shareId]/questions
 * Body: { questionId, action: "reviewed" | "close" | "reopen" }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ roleId: string; shareId: string }> }) {
  const auth = await authorize(req, params);
  if ("response" in auth) return auth.response;
  const body = (await req.json().catch(() => null)) as { questionId?: unknown; action?: unknown } | null;
  const action = body?.action;
  if (typeof body?.questionId !== "string" || (action !== "reviewed" && action !== "close" && action !== "reopen")) {
    return NextResponse.json({ error: "Choose a question and an action." }, { status: 400 });
  }
  try {
    const question = await updateQuestionState(
      { organizationId: auth.org.organizationId, roleId: auth.roleId, shareId: auth.shareId },
      body.questionId,
      action,
    );
    if (!question) return NextResponse.json({ error: "Question not found." }, { status: 404 });
    return NextResponse.json({ ok: true, question });
  } catch {
    return NextResponse.json({ error: "Could not update the question. Try again." }, { status: 500 });
  }
}
