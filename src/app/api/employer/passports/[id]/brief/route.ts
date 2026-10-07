import { NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { briefToMarkdown, buildDecisionBrief } from "@/lib/employer/brief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Markdown export of a decision brief. Same assembly as the page; never includes private notes. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const roleParam = new URL(req.url).searchParams.get("role");
  const roleId = roleParam && /^[0-9a-f-]{36}$/.test(roleParam) ? roleParam : null;
  try {
    const result = await buildDecisionBrief(org.organizationId, id, roleId);
    if (result.status === "missing") return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (result.status === "revoked") return NextResponse.json({ error: "The engineer revoked this link, so no brief can be exported." }, { status: 410 });
    if (result.status === "no_role") return NextResponse.json({ error: "Create a role before exporting a brief." }, { status: 409 });
    const slug = result.brief.candidateName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "candidate";
    return new NextResponse(briefToMarkdown(result.brief), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="fydell-brief-${slug}.md"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[brief] export failed", err);
    return NextResponse.json({ error: "Could not build the brief. Nothing was changed; try again." }, { status: 500 });
  }
}
