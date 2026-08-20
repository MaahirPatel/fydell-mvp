import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { proofAdmin, startRunFromToken } from "@/lib/sim-engine/proof/db";

export async function POST(request: Request) {
  const user = await requireUser();
  const body = (await request.json()) as { token?: string };
  if (!body.token) return NextResponse.json({ error: "token required" }, { status: 400 });
  const admin = proofAdmin();
  const { data: invite } = await admin.from("proof_invitations").select("id, email").eq("token", body.token).maybeSingle();
  if (!invite) return NextResponse.json({ error: "Invitation is not valid." }, { status: 404 });
  const started = await startRunFromToken(body.token, user?.id ?? null);
  return NextResponse.json({ runId: started.run.id, invitationId: started.invite.id });
}
