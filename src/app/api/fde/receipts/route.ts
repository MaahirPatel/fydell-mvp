import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { issueReceiptFromSession } from "@/lib/fde/receipts";

export const dynamic = "force-dynamic";

async function requireUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabaseClient();

  // Self-healing issuance: any of the candidate's sessions whose evidence is
  // ready but which has no receipt yet gets one now (issueReceiptFromSession
  // is idempotent). The credential must exist without manual intervention.
  const { data: readySessions } = await admin
    .from("relay_sessions")
    .select("id")
    .eq("fde_user_id", user.id)
    .eq("status", "receipt_ready");
  for (const s of readySessions || []) {
    try {
      await issueReceiptFromSession(s.id, user.id);
    } catch {
      // Skip sessions that cannot be issued; surfaced separately if needed.
    }
  }

  const { data: receipts, error } = await admin
    .from("work_receipts")
    .select("*, fde_missions(title)")
    .eq("fde_user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const shaped = (receipts || []).map((r) => ({
    id: r.id,
    receiptNumber: r.receipt_number,
    status: r.status,
    sessionId: r.session_id,
    missionTitle: (r.fde_missions as { title?: string } | null)?.title || "Mission",
    issuedAt: r.issued_at,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ receipts: shaped });
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const sessionId = String(body.sessionId || "");
    if (!sessionId) return NextResponse.json({ error: "sessionId is required." }, { status: 400 });

    const receipt = await issueReceiptFromSession(sessionId, user.id);
    return NextResponse.json({ ok: true, receipt });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not issue receipt.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
