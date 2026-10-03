import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { askQuestion } from "@/lib/employer/review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/employer/review/[roleId]/[shareId]/questions
 * Ask a bounded follow-up question attached to a requirement mapping (H09).
 * Body: { question, mappingId? }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roleId: string; shareId: string }> }
) {
  const { roleId, shareId } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "No organization" }, { status: 403 });

  let body: { question?: string; mappingId?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const question = await askQuestion({
      organizationId: org.organizationId,
      mappingId: body.mappingId ?? null,
      roleId,
      shareId,
      question: String(body.question ?? ""),
      askedBy: user.id,
    });
    return NextResponse.json({ ok: true, question });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not ask question.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
