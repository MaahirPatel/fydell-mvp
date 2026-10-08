/**
 * Targeted questions on one application, with or without a shared Passport.
 *
 * GET   - questions asked on the application.
 * POST  - ask. Body: { question, evidenceVersionId?, findingId?, dueAt?, clientRequestId? }.
 *         A repeated clientRequestId returns the first question.
 * PATCH - mark an answer read or close a question. Body: { questionId, action: "reviewed" | "close" }.
 */
import { NextResponse } from "next/server";
import { csrfGuard } from "@/lib/security/csrf";
import { rateLimit } from "@/lib/security/rate-limit";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { capabilityDeniedMessage, orgCan } from "@/lib/orgs/capabilities";
import { noStore } from "@/lib/hiring/route-auth";
import { parseQuestionInput } from "@/lib/profile-evidence/contract";
import { askApplicationQuestion, listApplicationQuestionsForOrg, updateApplicationQuestion } from "@/lib/profile-evidence/applications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ appId: string }> };
const UUID = /^[0-9a-f-]{36}$/;

async function member(capability: "view_hiring_work" | "record_decisions") {
  const user = await requireUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in first." }, { status: 401 }) } as const;
  const org = await requireOrgMember(user.id);
  if (!org) return { error: NextResponse.json({ error: "Your account isn't part of a hiring workspace." }, { status: 403 }) } as const;
  if (!orgCan(org.role, capability)) return { error: NextResponse.json({ error: capabilityDeniedMessage(capability) }, { status: 403 }) } as const;
  return { user, org } as const;
}

export async function GET(_req: Request, { params }: Params) {
  const gate = await member("view_hiring_work");
  if ("error" in gate) return gate.error;
  const { appId } = await params;
  if (!UUID.test(appId)) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  return NextResponse.json({ questions: await listApplicationQuestionsForOrg(gate.org.organizationId, appId) }, { headers: noStore });
}

export async function POST(req: Request, { params }: Params) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const gate = await member("record_decisions");
  if ("error" in gate) return gate.error;
  const { appId } = await params;
  if (!UUID.test(appId)) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  if (!rateLimit(`application-question:${gate.user.id}`, 60, 60 * 60 * 1000).ok) {
    return NextResponse.json({ error: "You have asked a lot of questions this hour. Try again later." }, { status: 429 });
  }
  const parsed = parseQuestionInput(await req.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const result = await askApplicationQuestion(gate.org.organizationId, appId, gate.user.id, parsed);
  if (result.ok === false) return NextResponse.json({ error: result.error }, { status: result.status, headers: noStore });
  return NextResponse.json({ question: result.question, created: result.created }, { status: result.created ? 201 : 200, headers: noStore });
}

export async function PATCH(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const gate = await member("record_decisions");
  if ("error" in gate) return gate.error;
  const body: unknown = await req.json().catch(() => null);
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const action = b.action === "reviewed" || b.action === "close" ? b.action : null;
  if (typeof b.questionId !== "string" || !action) return NextResponse.json({ error: "Choose a question and an action." }, { status: 400 });
  const question = await updateApplicationQuestion(gate.org.organizationId, b.questionId, action);
  if (!question) return NextResponse.json({ error: "Question not found." }, { status: 404 });
  return NextResponse.json({ question }, { headers: noStore });
}
