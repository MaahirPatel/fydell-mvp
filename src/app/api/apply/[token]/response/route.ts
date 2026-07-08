import { NextResponse } from "next/server";
import { getCandidateByToken, upsertResponse } from "@/lib/db";
import type { Stage } from "@/lib/types";

const VALID_STAGES: Stage[] = [
  "associate_update",
  "manager_read",
  "market_update",
  "final_q1",
  "final_q2",
  "final_q3"
];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const candidate = await getCandidateByToken(token);
  if (!candidate) {
    return NextResponse.json({ error: "Invalid invitation." }, { status: 404 });
  }
  if (candidate.status === "completed") {
    return NextResponse.json({ error: "Already submitted." }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const stage = body.stage as Stage;
  const text = typeof body.text === "string" ? body.text : "";

  if (!VALID_STAGES.includes(stage)) {
    return NextResponse.json({ error: "Unknown stage." }, { status: 400 });
  }

  await upsertResponse(candidate.id, stage, text);
  return NextResponse.json({ ok: true });
}
