import { NextResponse } from "next/server";
import { recordSimulationEvent } from "@/lib/mvp/db";

// Candidate-facing: record a granular execution event for an attempt.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { eventType, payload } = await req.json().catch(() => ({}));
    if (!eventType) {
      return NextResponse.json({ error: "eventType is required." }, { status: 400 });
    }
    const event = await recordSimulationEvent(id, eventType, payload ?? {});
    if (!event) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
    return NextResponse.json({ event });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not record event.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
