import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Receipts shared with this employer's organization via `receipt_permissions`.
 * Sharing today is issued by the FDE (org-scoped or token-scoped); this only
 * ever lists permissions explicitly granted to this org — never all receipts.
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: membership } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", data.user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership?.organization_id) {
    return NextResponse.json({ receipts: [] });
  }

  const { data: permissions, error } = await admin
    .from("receipt_permissions")
    .select("id, receipt_id, purpose, granted_at, expires_at, revoked_at, work_receipts(id, receipt_number, status, mission_id, issued_at, fde_missions(title))")
    .eq("recipient_organization_id", membership.organization_id)
    .is("revoked_at", null)
    .order("granted_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const shaped = (permissions || [])
    .map((p) => {
      const receipt = p.work_receipts as {
        id?: string;
        receipt_number?: string;
        status?: string;
        mission_id?: string;
        issued_at?: string;
        fde_missions?: { title?: string } | null;
      } | null;
      if (!receipt?.id) return null;
      return {
        permissionId: p.id,
        receiptId: receipt.id,
        receiptNumber: receipt.receipt_number,
        status: receipt.status,
        missionTitle: receipt.fde_missions?.title || "Mission",
        issuedAt: receipt.issued_at,
        purpose: p.purpose,
        grantedAt: p.granted_at,
        expiresAt: p.expires_at,
      };
    })
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  return NextResponse.json({ receipts: shaped });
}
