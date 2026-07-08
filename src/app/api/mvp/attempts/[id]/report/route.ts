import { NextResponse } from "next/server";
import { requireManager } from "@/lib/mvp/guard";
import { getAttemptReport } from "@/lib/mvp/db";

// Manager-facing: full attempt report (attempt + simulation + report + events).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireManager();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await getAttemptReport(id);
  if (!data || data.attempt.workspace_id !== ctx.workspace.id) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }
  return NextResponse.json(data);
}
