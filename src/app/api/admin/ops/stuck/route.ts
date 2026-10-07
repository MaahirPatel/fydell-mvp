import { NextResponse } from "next/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { OPS_VIEW_ROLES } from "@/lib/ops/ops-actions";
import { requirePlatformRoleApi } from "@/lib/ops/require-platform-role";
import { loadOpsSnapshot, stuckTotal } from "@/lib/ops/stuck-work";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/ops/stuck - the operator snapshot: ids, states, counts and timestamps only. */
export async function GET() {
  const gate = await requirePlatformRoleApi(OPS_VIEW_ROLES);
  if ("error" in gate) return gate.error;
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const snapshot = await loadOpsSnapshot(createAdminSupabaseClient());
  return NextResponse.json({ total: stuckTotal(snapshot), snapshot }, { headers: { "Cache-Control": "no-store" } });
}
