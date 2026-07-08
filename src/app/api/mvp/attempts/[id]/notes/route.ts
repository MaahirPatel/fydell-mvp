import { NextResponse } from "next/server";
import { updateCandidateNotes } from "@/lib/mvp/db";

// Candidate-facing: autosave working notes during the attempt.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { notes } = await req.json().catch(() => ({}));
    await updateCandidateNotes(id, typeof notes === "string" ? notes : "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not save notes.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
