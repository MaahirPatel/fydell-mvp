import { NextResponse } from "next/server";
import { startSimulationAttempt } from "@/lib/mvp/db";

// Candidate-facing: begin (or resume) the attempt for an invite token.
export async function POST(req: Request) {
  try {
    const { token } = await req.json().catch(() => ({}));
    if (!token) return NextResponse.json({ error: "token is required." }, { status: 400 });
    const attempt = await startSimulationAttempt(token);
    if (!attempt) {
      return NextResponse.json(
        { error: "This invitation is invalid, cancelled, or expired." },
        { status: 404 }
      );
    }
    return NextResponse.json({ attempt });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not start the simulation.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
