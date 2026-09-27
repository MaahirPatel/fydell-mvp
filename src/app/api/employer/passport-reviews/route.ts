import { NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { addReview, listReviews } from "@/lib/passport/store";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "No workspace" }, { status: 403 });
  return NextResponse.json({ reviews: await listReviews(org.organizationId) });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "No workspace" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { shareUrl?: unknown; roleTitle?: unknown } | null;
  if (typeof body?.shareUrl !== "string" || !body.shareUrl.trim()) {
    return NextResponse.json({ error: "Paste the passport link the candidate shared with you." }, { status: 400 });
  }
  const added = await addReview(org.organizationId, user.id, body.shareUrl, typeof body.roleTitle === "string" ? body.roleTitle : "");
  if ("error" in added) return NextResponse.json({ error: added.error }, { status: 404 });
  return NextResponse.json({ id: added.id });
}
