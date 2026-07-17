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
