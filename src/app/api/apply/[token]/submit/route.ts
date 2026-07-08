import { NextResponse } from "next/server";
import { finalizeSubmission, getCandidateByToken, upsertResponse } from "@/lib/db";
import { NOTIFICATIONS } from "@/lib/scenario";
import type { Stage } from "@/lib/types";

const MANAGER_MIN_CHARS =
  NOTIFICATIONS.find((n) => n.stage === "manager_read")?.minChars ?? 50;

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
  const responses = (body.responses ?? {}) as Record<string, unknown>;
  const timeSpent = Number(body.timeSpentSeconds) || 0;

  const managerRead = responses.manager_read;
  if (typeof managerRead !== "string" || managerRead.trim().length < MANAGER_MIN_CHARS) {
    return NextResponse.json(
      {
        error: `Preliminary read to manager is required (${MANAGER_MIN_CHARS}+ characters).`
      },
      { status: 400 }
    );
  }

  // Persist every provided response (final source of truth at submit time).
  for (const stage of VALID_STAGES) {
    const text = responses[stage];
    if (typeof text === "string" && text.trim().length > 0) {
      await upsertResponse(candidate.id, stage, text);
    }
  }

  await finalizeSubmission(candidate.id, timeSpent);
  return NextResponse.json({ ok: true });
}
