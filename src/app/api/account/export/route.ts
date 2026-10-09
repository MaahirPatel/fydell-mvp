import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { buildAccountExport, ACCOUNT_EXPORT_VERSION } from "@/lib/account/export";
import { limitByUser, tooManyRequests } from "@/lib/security/route-limits";
import { writeAudit } from "@/lib/ops/platform-roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0, must-revalidate" };
const PER_HOUR = 5;
const RULE = { name: "account-export", limit: PER_HOUR, windowMs: 60 * 60_000 };

/** The signed-in account's own data as one JSON file. Nobody can export another account. */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401, headers: NO_STORE });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Export is not available here." }, { status: 503, headers: NO_STORE });

  const limited = limitByUser(user.id, RULE);
  if (limited) return limited;
  const db = createAdminSupabaseClient();
  // The per-instance limit above does not hold across servers; the audit trail does.
  const since = new Date(Date.now() - RULE.windowMs).toISOString();
  const { count } = await db
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("actor_user_id", user.id)
    .eq("action", "account.data_exported")
    .gte("created_at", since);
  if ((count ?? 0) >= PER_HOUR) return tooManyRequests(60 * 60, "You have exported your data several times in the last hour. Try again later.");

  const { data: full, error } = await db.auth.admin.getUserById(user.id);
  if (error || !full.user) return NextResponse.json({ error: "Account not found." }, { status: 404, headers: NO_STORE });
  try {
    const record = await buildAccountExport(db, full.user);
    await writeAudit({ actorUserId: user.id, actorEmail: user.email, action: "account.data_exported", entityType: "account", entityId: user.id, metadata: { format: ACCOUNT_EXPORT_VERSION } });
    const day = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(record, null, 2), {
      headers: {
        ...NO_STORE,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="fydell-account-${day}.json"`,
      },
    });
  } catch (err) {
    console.error("[account/export]", err);
    return NextResponse.json({ error: "The export failed on our side. Try again in a minute." }, { status: 500, headers: NO_STORE });
  }
}
