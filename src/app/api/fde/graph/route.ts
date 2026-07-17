import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Minimal, honest evidence graph — built only from real receipts, permissions,
 * and employer decisions tied to this FDE. No synthetic candidates or network.
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabaseClient();

  const { data: receipts } = await admin
    .from("work_receipts")
    .select("id, receipt_number, status, session_id, mission_id, issued_at")
    .eq("fde_user_id", data.user.id)
    .order("created_at", { ascending: false });

  const receiptIds = (receipts || []).map((r) => r.id);
  const missionIds = Array.from(new Set((receipts || []).map((r) => r.mission_id)));

  const [{ data: permissions }, { data: missions }, { data: decisions }] = await Promise.all([
    receiptIds.length
      ? admin
          .from("receipt_permissions")
          .select("id, receipt_id, purpose, granted_at, revoked_at, access_count")
          .in("receipt_id", receiptIds)
      : Promise.resolve({ data: [] }),
    missionIds.length
      ? admin.from("fde_missions").select("id, title, organization_id").in("id", missionIds)
      : Promise.resolve({ data: [] }),
    admin
      .from("fde_employer_decisions")
      .select("id, mission_id, session_id, decision, structured_reason, created_at")
      .eq("fde_user_id", data.user.id)
      .order("created_at", { ascending: false }),
  ]);

  const missionTitleById = Object.fromEntries((missions || []).map((m) => [m.id, m.title]));

  const nodes = (receipts || []).map((r) => ({
    receiptId: r.id,
    receiptNumber: r.receipt_number,
    status: r.status,
    missionTitle: missionTitleById[r.mission_id] || "Mission",
    issuedAt: r.issued_at,
    shares: (permissions || []).filter((p) => p.receipt_id === r.id && !p.revoked_at).length,
    decisions: (decisions || []).filter((d) => d.session_id === r.session_id),
  }));

  return NextResponse.json({ nodes });
}
