import { NextResponse } from "next/server";
import { requireManager } from "@/lib/mvp/guard";
import { getWorkspaceSimulations } from "@/lib/mvp/db";

export async function GET() {
  const ctx = await requireManager();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const simulations = await getWorkspaceSimulations(ctx.workspace.id);
  return NextResponse.json({ workspace: ctx.workspace, simulations });
}
