import { NextResponse } from "next/server";
import { validateCandidateInvite } from "@/lib/mvp/db";

// Candidate-facing: validate an invite token (no account required).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const validated = await validateCandidateInvite(token);
  if (!validated) {
    return NextResponse.json(
      { error: "This invitation is invalid, cancelled, or expired." },
      { status: 404 }
    );
  }
  return NextResponse.json({
    invite: {
      id: validated.invite.id,
      candidate_name: validated.invite.candidate_name,
      status: validated.invite.status
    },
    simulation: validated.simulation
  });
}
