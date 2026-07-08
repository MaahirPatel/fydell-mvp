import { NextResponse } from "next/server";
import { createEmployerSession } from "@/lib/auth";
import { getEmployerByToken } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const employer = await getEmployerByToken(token);
  if (!employer) {
    return NextResponse.json({ error: "Unknown employer link." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const passcode = (body.passcode ?? "").toString().trim();

  if (passcode !== employer.passcode) {
    return NextResponse.json({ error: "Incorrect passcode." }, { status: 401 });
  }

  await createEmployerSession(employer.id, employer.token);
  return NextResponse.json({ ok: true });
}
