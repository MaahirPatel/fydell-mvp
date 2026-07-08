import { NextResponse } from "next/server";
import { requireManager } from "@/lib/mvp/guard";
import { getDashboardData } from "@/lib/mvp/db";
import { getBillingStatus } from "@/lib/mvp/stripe";

export async function GET() {
  const ctx = await requireManager();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [data, billing] = await Promise.all([
    getDashboardData(ctx.workspace.id),
    getBillingStatus(ctx.workspace.id)
  ]);
  return NextResponse.json({ ...data, billing });
}
