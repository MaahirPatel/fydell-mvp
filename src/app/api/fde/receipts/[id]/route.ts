import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { getReceiptForOwner, revokePermission, shareReceipt } from "@/lib/fde/receipts";

export const dynamic = "force-dynamic";

async function requireUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const result = await getReceiptForOwner(id, user.id);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not load receipt.";
    const status = /not found/i.test(msg) ? 404 : /forbidden/i.test(msg) ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "share") {
      const result = await shareReceipt(id, user.id, {
        purpose: body.purpose,
        expiresInDays: body.expiresInDays,
      });
      return NextResponse.json({ ok: true, shareUrl: result.shareUrl, permission: result.permission });
    }

    if (action === "revoke") {
      const permissionId = String(body.permissionId || "");
      if (!permissionId) return NextResponse.json({ error: "permissionId is required." }, { status: 400 });
      const updated = await revokePermission(permissionId, user.id);
      return NextResponse.json({ ok: true, permission: updated });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Receipt action failed.";
    const status = /not found/i.test(msg) ? 404 : /forbidden/i.test(msg) ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
