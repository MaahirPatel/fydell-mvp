import { NextResponse } from "next/server";
import { requireManager } from "@/lib/mvp/guard";
import { createCandidateInvite } from "@/lib/mvp/db";

function inviteUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}/c/${token}`;
}

export async function POST(req: Request) {
  const ctx = await requireManager();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const { simulationId, candidateName, candidateEmail, expiresInDays } = body;
    if (!simulationId) {
      return NextResponse.json({ error: "simulationId is required." }, { status: 400 });
    }
    const invite = await createCandidateInvite({
      workspaceId: ctx.workspace.id,
      simulationId,
      candidateName,
      candidateEmail,
      createdBy: ctx.userId,
      expiresInDays: expiresInDays ? Number(expiresInDays) : undefined
    });
    return NextResponse.json({ invite, url: inviteUrl(invite.token) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not create invite.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
