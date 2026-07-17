import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/auth";
import { listActiveRolesForEmail } from "@/lib/ops/platform-roles";
import { activateMission } from "@/lib/fde/lifecycle";

export const dynamic = "force-dynamic";

async function resolveOpsActor(): Promise<{ id: string; email: string } | null> {
  const adminSession = await getAdminSession();
  if (adminSession?.email) {
    return { id: adminSession.email, email: adminSession.email };
  }

  if (!isSupabaseConfigured()) return null;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) return null;

  const roles = await listActiveRolesForEmail(data.user.email);
  if (roles.length === 0) return null;

  return { id: data.user.id, email: data.user.email };
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await resolveOpsActor();
    if (!actor) {
      return NextResponse.json({ error: "Ops access required" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const mission = await activateMission(id, actor.id);
    return NextResponse.json({ ok: true, mission });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not activate mission.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
