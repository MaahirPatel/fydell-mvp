import { NextResponse } from "next/server";
import { getCandidateByToken, startSession } from "@/lib/db";

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
    return NextResponse.json(
      { error: "This simulation has already been submitted." },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name : undefined;
  const email = typeof body.email === "string" ? body.email : undefined;

  await startSession(candidate.id, name, email);
  return NextResponse.json({ ok: true });
}
