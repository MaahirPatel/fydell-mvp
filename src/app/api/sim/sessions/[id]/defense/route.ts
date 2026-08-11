import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { getSessionForCandidate, getSessionForOrgMember } from "@/lib/simulations/db";
import { getOralDefense, saveDefenseResponse } from "@/lib/pilot/oral-defense";

export const runtime = "nodejs";

async function authorize(sessionId: string, userId: string) {
  try {
    return await getSessionForCandidate(sessionId, userId);
  } catch {
    return getSessionForOrgMember(sessionId, userId);
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await authorize(id, user.id);
    const defense = await getOralDefense(id);
    if (!defense) return NextResponse.json({ defense: null });
    return NextResponse.json({
      defense: {
        set: defense.set,
        questions: defense.questions,
        responses: defense.responses,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    questionId?: string;
    responseText?: string;
    collectionMethod?: "candidate_typed" | "facilitator_notes";
    attestation?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!body.questionId || typeof body.responseText !== "string") {
    return NextResponse.json({ error: "questionId and responseText required" }, { status: 400 });
  }
  const method = body.collectionMethod || "candidate_typed";
  if (method === "facilitator_notes" && !body.attestation?.trim()) {
    return NextResponse.json(
      { error: "Facilitator notes require an attestation of how they were collected." },
      { status: 400 }
    );
  }

  try {
    await authorize(id, user.id);
    const defense = await getOralDefense(id);
    if (!defense) return NextResponse.json({ error: "No oral defense set" }, { status: 404 });
    await saveDefenseResponse({
      defenseSetId: defense.set.id,
      questionId: body.questionId,
      responseText: body.responseText,
      collectionMethod: method,
      collectedBy: user.id,
      attestation: body.attestation,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not save response" },
      { status: 400 }
    );
  }
}
