import { NextResponse } from "next/server";
import { requireManager } from "@/lib/mvp/guard";
import { getAttempt, updateHiringDecision } from "@/lib/mvp/db";
import type { HiringDecision } from "@/lib/mvp/types";

const VALID: HiringDecision[] = [
  "not_decided",
  "advance",
  "hold",
  "reject",
  "offer",
  "hired"
];

// Manager-facing: update the hiring decision (sets hired_at on "hired").
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireManager();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { decision } = await req.json().catch(() => ({}));
  if (!VALID.includes(decision)) {
    return NextResponse.json({ error: "Invalid hiring decision." }, { status: 400 });
  }

  const attempt = await getAttempt(id);
  if (!attempt || attempt.workspace_id !== ctx.workspace.id) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }

  const updated = await updateHiringDecision(id, decision);
  return NextResponse.json({ attempt: updated });
}
