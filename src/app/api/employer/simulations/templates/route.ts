import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { FYDELL_TEMPLATES } from "@/lib/fde/templates/catalog";

export const dynamic = "force-dynamic";

/** List platform-owned Fydell templates (not org-owned; no fake metrics). */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    templates: FYDELL_TEMPLATES.map((t) => ({
      id: t.id,
      title: t.title,
      summary: t.summary,
      roleTitle: t.roleTitle,
      seniority: t.seniority,
      durationLabel: t.durationLabel,
      aiPolicyLabel: t.aiPolicyLabel,
      competencies: t.competencies,
      badge: t.badge,
      ownerType: "fydell" as const,
      label: "Fydell Template",
    })),
  });
}
